// app/api/capture/route.ts
import { NextResponse, NextRequest } from "next/server";
import fs from "fs";
import path from "path";
import os from "os";
import crypto from "crypto";

// ---------- helpers ----------
function ensureDir(p: string) {
  fs.mkdirSync(p, { recursive: true });
}
function shortHash(s: string) {
  return crypto.createHash("sha1").update(s).digest("hex").slice(0, 8);
}
function parts(iso?: string) {
  const d = iso ? new Date(iso) : new Date();
  return {
    y: String(d.getUTCFullYear()),
    m: String(d.getUTCMonth() + 1).padStart(2, "0"),
    dd: String(d.getUTCDate()).padStart(2, "0"),
    epoch: d.getTime(),
    iso: d.toISOString(),
  };
}
function withCORS(init?: ResponseInit): ResponseInit {
  return {
    ...init,
    headers: {
      "Access-Control-Allow-Origin": "*", // tighten for prod if needed
      "Access-Control-Allow-Methods": "POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
      ...(init?.headers || {}),
    },
  };
}

const MAX_BYTES = Number(process.env.HOMI_MAX_HTML_BYTES ?? 50 * 1024 * 1024);

// ---------- CORS preflight ----------
export async function OPTIONS() {
  return new Response(null, withCORS({ status: 204 }));
}

// ---------- main ----------
export async function POST(req: NextRequest) {
  try {
    const form = await req.formData();

    // --- meta ---
    const metaRaw = form.get("meta");
    if (!metaRaw || typeof metaRaw !== "string") {
      return NextResponse.json(
        { ok: false, error: "meta missing" },
        withCORS({ status: 400 })
      );
    }

    let meta: any;
    try {
      meta = JSON.parse(metaRaw);
    } catch {
      return NextResponse.json(
        { ok: false, error: "meta is not valid JSON" },
        withCORS({ status: 400 })
      );
    }

    const url: string = meta.url || "about:blank";
    let domain = "unknown";
    try {
      domain = new URL(url).hostname.replace(/^www\./, "");
    } catch {}

    const page_type: string = meta.page_type || "detail";
    const seen_at: string = meta.seen_at || parts().iso;
    const { y, m, dd, epoch } = parts(seen_at);

    // --- HTML: either base64 string or uploaded file ---
    let htmlBuf: Buffer | null = null;

    const htmlB64 = form.get("html_b64");
    if (typeof htmlB64 === "string" && htmlB64.length > 0) {
      try {
        htmlBuf = Buffer.from(htmlB64, "base64");
      } catch {
        return NextResponse.json(
          { ok: false, error: "invalid base64 in html_b64" },
          withCORS({ status: 400 })
        );
      }
    }

    // Duck-type the uploaded file (avoid `File` type reference)
    const htmlAny = form.get("html_file");
    if (!htmlBuf && htmlAny && typeof (htmlAny as any).arrayBuffer === "function") {
      const ab = await (htmlAny as any).arrayBuffer();
      htmlBuf = Buffer.from(ab);
    }

    if (!htmlBuf) {
      return NextResponse.json(
        { ok: false, error: "no html provided (need html_b64 or html_file)" },
        withCORS({ status: 400 })
      );
    }

    if (htmlBuf.byteLength > MAX_BYTES) {
      return NextResponse.json(
        { ok: false, error: `html too large (${htmlBuf.byteLength} > ${MAX_BYTES})` },
        withCORS({ status: 413 })
      );
    }

    // --- paths ---
    const BASE = process.env.HOMI_DATA_DIR || path.join(os.homedir(), "homi-data");
    const relDir = path.join("raw", y, m, dd);
    const outDir = path.join(BASE, relDir);
    ensureDir(outDir);

    const sh = shortHash(`${url}|${seen_at}|${page_type}`);
    const baseName = `${epoch}_${domain}_${sh}`;
    const htmlRel = path.join(relDir, `${baseName}.html`);
    const metaRel = path.join(relDir, `${baseName}.meta.json`);
    const htmlAbs = path.join(BASE, htmlRel);
    const metaAbs = path.join(BASE, metaRel);

    // --- write files ---
    fs.writeFileSync(htmlAbs, htmlBuf);

    const metaOut = {
      url,
      domain,
      page_type,
      source: meta.source || domain,
      seen_at,
      bytes: htmlBuf.length,
      is_base64: Boolean(htmlB64),
      path_html: htmlRel,
      path_meta: metaRel,
      extracted: meta.extracted ?? undefined,
      // Some Next versions don’t type ip; keep it optional and type-safe
      remote_addr: (req as any)?.ip || undefined,
      user_agent: req.headers.get("user-agent") || undefined,
    };
    fs.writeFileSync(metaAbs, JSON.stringify(metaOut, null, 2), "utf8");

    // --- rolling index ---
    const indexPath = path.join(BASE, "raw", "index.jsonl");
    ensureDir(path.dirname(indexPath));

    const idxLine = {
      url,
      domain,
      page_type,
      path_html: htmlRel,
      path_meta: metaRel,
      seen_at,
      title: meta?.extracted?.title ?? undefined,
      price_amount: meta?.extracted?.price_amount ?? undefined,
      area_m2: meta?.extracted?.area_m2 ?? undefined,
    };
    fs.appendFileSync(indexPath, JSON.stringify(idxLine) + "\n", "utf8");

    return NextResponse.json(
      { ok: true, html: htmlRel, meta: metaRel },
      withCORS()
    );
  } catch (e: any) {
    return NextResponse.json(
      { ok: false, error: String(e?.message || e) },
      withCORS({ status: 500 })
    );
  }
}