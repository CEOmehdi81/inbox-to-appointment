import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

function authOr401(req: Request) {
  const got = req.headers.get("x-homi-n8n-key");
  const expected = process.env.N8N_SHARED_SECRET;
  if (!expected || !got || got !== expected) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  return null;
}

function mustString(v: any, name: string) {
  if (typeof v !== "string" || !v.trim()) throw new Error(`missing ${name}`);
  return v.trim();
}

function safeString(v: any) {
  return typeof v === "string" && v.trim() ? v.trim() : null;
}

// LeadDetails.motivation_level is INT in your schema.
// Accept either number or strings like HIGH/MEDIUM/LOW and map to 3/2/1.
function motivationToInt(v: any): number | null {
  if (typeof v === "number" && Number.isFinite(v)) return Math.trunc(v);
  if (typeof v !== "string") return null;

  const s = v.trim().toUpperCase();
  if (!s) return null;

  const map: Record<string, number> = {
    HIGH: 3,
    MEDIUM: 2,
    MID: 2,
    NORMAL: 2,
    LOW: 1,
  };

  if (map[s] != null) return map[s];

  // allow "3"/"2"/"1"
  const n = Number(s);
  return Number.isFinite(n) ? Math.trunc(n) : null;
}

export async function POST(req: Request) {
  const authErr = authOr401(req);
  if (authErr) return authErr;

  try {
    const body = await req.json();

    const agencyId = mustString(body.agencyId, "agencyId");
    const leadId = mustString(body.leadId, "leadId");
    const portal = mustString(body.portal, "portal");
    const listingId = mustString(body.listingId, "listingId");
    const createdAt = mustString(body.createdAt, "createdAt");

    const contact = body.contact ?? {};
    const analysis = body.analysis ?? {};
    const raw = safeString(body.raw);

    const createdAtDate = new Date(createdAt);
    if (Number.isNaN(createdAtDate.getTime())) {
      return NextResponse.json({ error: "invalid createdAt" }, { status: 400 });
    }

    await prisma.$transaction(async (tx) => {
      // 1) Upsert Lead (agencyId required)
      await tx.lead.upsert({
        where: { id: leadId },
        update: {
          agencyId,
          portal,
          listing_id: listingId,
          lead_source: "EMAIL",
          created_at: createdAtDate,
        },
        create: {
          id: leadId,
          agencyId,
          portal,
          listing_id: listingId,
          lead_source: "EMAIL",
          created_at: createdAtDate,
        },
      });

      // 2) LeadDetails: updateMany + create fallback (avoids guessing unique constraint names)
      const leadDetailsUpdate = {
        contact_email: safeString(contact.email),
        contact_phone: safeString(contact.phone),
        contact_name: safeString(contact.name),
        summary: safeString(analysis.summary),
        motivation_level: motivationToInt(analysis.motivation_level),
        raw_text: raw,
      };

      const updated = await tx.leadDetails.updateMany({
        where: { agencyId, lead_id: leadId },
        data: leadDetailsUpdate,
      });

      if (updated.count === 0) {
        try {
          await tx.leadDetails.create({
            data: {
              agencyId,
              lead_id: leadId,
              ...leadDetailsUpdate,
            },
          });
        } catch {
          // if a concurrent insert happened, just update again
          await tx.leadDetails.updateMany({
            where: { agencyId, lead_id: leadId },
            data: leadDetailsUpdate,
          });
        }
      }
    });

    return NextResponse.json({ ok: true, leadId });
  } catch (e: any) {
    console.error("lead ingest failed", e);
    const msg = e?.message || "server_error";
    const status = msg.startsWith("missing ") ? 400 : 500;
    return NextResponse.json({ error: msg }, { status });
  }
}