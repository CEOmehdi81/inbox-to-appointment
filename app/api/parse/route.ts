import { NextRequest, NextResponse } from "next/server";
import fs from "fs";
import path from "path";
import os from "os";

function baseDir() {
  return process.env.HOMI_DATA_DIR || path.join(os.homedir(), "homi-data");
}

function readFileSafe(p: string) {
  try { return fs.readFileSync(p, "utf8"); } catch { return null; }
}

function pick<T>(obj: any, keys: (keyof T)[]): Partial<T> {
  const out: any = {};
  for (const k of keys) if (obj && obj[k as string] != null) out[k] = obj[k as string];
  return out;
}

/** very small helper to extract all <script type="application/ld+json"> blocks */
function extractJSONLD(html: string): any[] {
  const out: any[] = [];
  const rx = /<script[^>]+type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi;
  let m;
  while ((m = rx.exec(html))) {
    try {
      const block = m[1].trim();
      const parsed = JSON.parse(block);
      if (Array.isArray(parsed)) out.push(...parsed);
      else out.push(parsed);
    } catch {}
  }
  return out;
}

export async function GET(req: NextRequest) {
  try {
    const url = new URL(req.url);
    const rel = (url.searchParams.get("path") || "").trim(); // raw/2025/11/05/....html
    if (!rel) return NextResponse.json({ error: "Missing ?path" }, { status: 400 });

    const root = baseDir();
    const absHtml = path.resolve(path.join(root, rel));
    if (!absHtml.startsWith(path.resolve(root))) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    if (!fs.existsSync(absHtml)) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    // companion meta file
    const metaRel = rel.replace(/\.html$/i, ".meta.json");
    const absMeta = path.resolve(path.join(root, metaRel));

    const html = readFileSafe(absHtml) || "";
    const meta = readFileSafe(absMeta) ? JSON.parse(readFileSafe(absMeta)!) : null;

    // --------- Pull structured data (JSON-LD) ----------
    const jsonlds = extractJSONLD(html);

    // Try to find an entity that looks like a real-estate listing
    const candidate =
      jsonlds.find((j) => ["Product","Offer","RealEstateListing","Apartment","House","SingleFamilyResidence"].includes(j["@type"])) ||
      jsonlds.find((j) => j.offers || j.address) ||
      jsonlds[0] || {};

    // Normalize fields
    const offers = Array.isArray(candidate.offers) ? candidate.offers[0] : candidate.offers || {};
    const addr = candidate.address || offers?.areaServed || {};

    // Some portals use "price","priceCurrency"; others use "priceSpecification"
    const priceSpec = candidate.priceSpecification || offers.priceSpecification || {};
    const priceAmount =
      offers.price || priceSpec.price || priceSpec.minPrice || priceSpec.maxPrice || candidate.price;
    const priceCurrency =
      offers.priceCurrency || priceSpec.priceCurrency || candidate.priceCurrency;

    // Area/rooms often appear under various keys; grab the first we see
    const area =
      candidate.floorSize?.value || candidate.floorSize?.valueReference || candidate.floorSize || candidate.area ||
      offers.area || undefined;

    const bedrooms =
      candidate.numberOfRooms || candidate.numberOfBedrooms || candidate.bedrooms ||
      offers.numberOfBedrooms || undefined;

    const bathrooms =
      candidate.numberOfBathroomsTotal || candidate.bathrooms ||
      offers.numberOfBathroomsTotal || undefined;

    const images = candidate.image || candidate.images || offers.image || [];
    const imageArr = Array.isArray(images) ? images : [images].filter(Boolean);

    const fields = {
      source: meta?.domain || meta?.source || "",
      url: meta?.url || candidate.url || "",
      page_type: meta?.page_type || candidate["@type"] || "",
      seen_at: meta?.seen_at || undefined,

      title: candidate.name || candidate.title || "",
      description: candidate.description || "",
      price_amount: priceAmount ?? null,
      price_currency: priceCurrency ?? null,

      address_street: addr.streetAddress || "",
      address_city: addr.addressLocality || "",
      address_postal_code: addr.postalCode || "",
      address_country: addr.addressCountry || "",

      area_m2: area ?? null,
      rooms: candidate.numberOfRooms ?? null,
      bedrooms: bedrooms ?? null,
      bathrooms: bathrooms ?? null,

      images: imageArr,
    };

    // Build a simple key/value list for rendering
    const table = Object.entries(fields)
      .map(([key, value]) => ({ key, value }))
      .filter((r) => valueNotEmpty(r.value));

    return NextResponse.json({
      ok: true,
      meta,
      fields,
      table,
      debug: { jsonld_count: jsonlds.length },
    });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: String(e?.message || e) }, { status: 500 });
  }
}

function valueNotEmpty(v: any) {
  if (v == null) return false;
  if (Array.isArray(v) && v.length === 0) return false;
  if (typeof v === "string" && v.trim() === "") return false;
  return true;
}