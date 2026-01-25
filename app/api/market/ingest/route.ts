import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { IngestBodySchema, LeadInput } from "./schemas";
import { createHash, randomUUID } from "crypto";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS, GET",
  "Access-Control-Allow-Headers":
    "Content-Type, Authorization, x-ingest-token, x-homi-n8n-key",
};

export function OPTIONS() {
  return NextResponse.json({ ok: true }, { headers: corsHeaders });
}

export async function GET() {
  const [listings, leads, spend] = await Promise.all([
    prisma.listing.count(),
    prisma.lead.count(),
    prisma.spend.count(),
  ]);

  return NextResponse.json(
    {
      ok: true,
      dbTotals: { listings, leads, spend },
      ts: new Date().toISOString(),
    },
    { status: 200, headers: corsHeaders },
  );
}

function unauthorized(debug?: unknown) {
  const body =
    process.env.NODE_ENV === "development"
      ? { ok: false, error: "unauthorized", debug }
      : { ok: false, error: "unauthorized" };

  return NextResponse.json(body, { status: 401, headers: corsHeaders });
}

// ---------- LeadPerson helpers ----------

type LeadIdentity = {
  contact_name: string | null;
  contact_email: string | null;
  contact_phone: string | null;
};

function normString(v: string | null | undefined): string | null {
  const trimmed = v?.trim();
  if (!trimmed) return null;
  return trimmed.toLowerCase();
}

function normPhone(v: string | null | undefined): string | null {
  if (!v) return null;
  const digits = v.replace(/\D+/g, "");
  return digits || null;
}

async function attachLeadToPerson(params: {
  agencyId: string;
  leadId: string;
  identity: LeadIdentity;
}) {
  const { agencyId, leadId, identity } = params;

  const norm_name = normString(identity.contact_name);
  const norm_email = normString(identity.contact_email);
  const norm_phone = normPhone(identity.contact_phone);

  // No usable identity? Don’t create random people.
  if (!norm_name && !norm_email && !norm_phone) return;

  const or: any[] = [];
  if (norm_email) or.push({ norm_email });
  if (norm_phone) or.push({ norm_phone });
  if (norm_name && norm_email) or.push({ norm_name, norm_email });
  if (norm_name && norm_phone) or.push({ norm_name, norm_phone });

  // IMPORTANT: scope by agencyId so two agencies never merge the same person
  let person =
    (await prisma.leadPerson.findFirst({
      where: {
        agencyId,
        OR: or,
      },
    })) ?? null;

  if (!person) {
    person = await prisma.leadPerson.create({
      data: {
        agencyId,
        norm_name,
        norm_email,
        norm_phone,
        display_name: identity.contact_name,
        display_email: identity.contact_email,
        display_phone: identity.contact_phone,
      },
    });
  }

  await prisma.lead.update({
    where: { id: leadId },
    data: { person_id: person.id },
  });

  // Stats (scoped by agency)
  const personLeads = await prisma.lead.findMany({
    where: { agencyId, person_id: person.id },
    select: {
      listing_id: true,
      details: { select: { contact_phone: true } },
    },
  });

  const listingIds = new Set<string>();
  const phones = new Set<string>();

  for (const l of personLeads) {
    listingIds.add(l.listing_id);
    const p = l.details?.contact_phone ? normPhone(l.details.contact_phone) : null;
    if (p) phones.add(p);
  }

  await prisma.leadPerson.update({
    where: { id: person.id },
    data: {
      total_contacts: personLeads.length,
      listings_count: listingIds.size,
      suspicious_duplicate: phones.size > 1,
      display_name: identity.contact_name ?? person.display_name,
      display_email: identity.contact_email ?? person.display_email,
      display_phone: identity.contact_phone ?? person.display_phone,
    },
  });
}

// ---------- deterministic lead id ----------

function computeLeadId(r: {
  id?: string | null;
  portal: string;
  listing_id: string;
  created_at: string;
  lead_source: string;
  agencyId: string;
}) {
  if (r.id && r.id.trim().length > 0) return r.id.trim();
  const raw = `${r.agencyId}|${r.portal}|${r.listing_id}|${r.created_at}|${r.lead_source}`;
  return createHash("sha256").update(raw).digest("hex");
}

// ---------- POST /api/market/ingest ----------

export async function POST(req: NextRequest) {
  const debug: any = { step: "start" };

  try {
    // --- Auth ---
    const expected = (process.env.N8N_SHARED_SECRET || "").trim();

    const authRaw = (req.headers.get("authorization") || "").trim();
    const xIngest = (req.headers.get("x-ingest-token") || "").trim();
    const xHomi = (req.headers.get("x-homi-n8n-key") || "").trim();
    const q = new URL(req.url).searchParams.get("token")?.trim() || "";

    const bearer = authRaw.startsWith("Bearer ") ? authRaw.slice(7).trim() : "";
    const token = bearer || xIngest || xHomi || q;

    if (!expected || token !== expected) {
      return unauthorized({
        expected_len: expected.length,
        received_len: token.length,
        has_auth_header: !!bearer,
        has_x_ingest: !!xIngest,
        has_x_homi: !!xHomi,
        has_q: !!q,
      });
    }

    // --- Parse JSON ---
    debug.step = "parse_json";
    let bodyUnknown: unknown;
    try {
      bodyUnknown = await req.json();
    } catch {
      return NextResponse.json(
        { ok: false, error: "invalid_json" },
        { status: 400, headers: corsHeaders },
      );
    }

    // --- Validate ---
    debug.step = "zod_parse";
    const parsed = IngestBodySchema.safeParse(bodyUnknown);
    if (!parsed.success) {
      return NextResponse.json(
        { ok: false, error: "validation_error", details: parsed.error.format() },
        { status: 422, headers: corsHeaders },
      );
    }

    const input = parsed.data;

    // Require agencyId
    const agencyId = (input as any).agencyId?.toString().trim();
    if (!agencyId) {
      return NextResponse.json(
        { ok: false, error: "missing_agencyId" },
        { status: 422, headers: corsHeaders },
      );
    }

    const result = {
      upserted: { listings: 0, leads: 0, spend: 0 },
      skipped: { leads_missing_listing: 0 },
    };

    // --- Upsert listings ---
    if (input.listings?.length) {
      debug.step = "upsert_listings";
      for (const r of input.listings) {
        await prisma.listing.upsert({
          where: { id: r.id },
          update: {
            agencyId,
            title: r.title,
            portal: r.portal,
            location: r.location ?? null,
            price: r.price ?? null,
            status: r.status ?? null,
            listed_at: r.listed_at ? new Date(r.listed_at) : null,
          },
          create: {
            id: r.id,
            agencyId,
            title: r.title,
            portal: r.portal,
            location: r.location ?? null,
            price: r.price ?? null,
            status: r.status ?? null,
            listed_at: r.listed_at ? new Date(r.listed_at) : null,
          },
        });
        result.upserted.listings++;
      }
    }

    // --- Upsert spend ---
    // NOTE: for multi-tenant, Spend should be unique by (agencyId, portal, month).
    const ACCUMULATE = false;
    if (input.spend?.length) {
      debug.step = "upsert_spend";
      for (const r of input.spend) {
        const existing = await prisma.spend.findFirst({
          where: { agencyId, portal: r.portal, month: r.month },
          select: { id: true },
        });

        if (existing) {
          await prisma.spend.update({
            where: { id: existing.id },
            data: ACCUMULATE
              ? { amount: { increment: r.amount } }
              : { amount: r.amount },
          });
        } else {
          await prisma.spend.create({
            data: {
              id: r.id ?? randomUUID(),
              agencyId,
              portal: r.portal,
              month: r.month,
              amount: r.amount,
            },
          });
        }
        result.upserted.spend++;
      }
    }

    // --- Upsert leads + details + attach person ---
    if (input.leads?.length) {
      debug.step = "upsert_leads";
      for (const r of input.leads as LeadInput[]) {
        // Listing must exist AND belong to same agency (privacy)
        const listing = await prisma.listing.findFirst({
          where: { id: r.listing_id, agencyId },
          select: { id: true },
        });

        if (!listing) {
          result.skipped.leads_missing_listing++;
          continue;
        }

        const id = computeLeadId({
          id: (r as any).id ?? null,
          portal: r.portal,
          listing_id: r.listing_id,
          created_at: r.created_at,
          lead_source: r.lead_source,
          agencyId,
        });

        const createdAt = new Date(r.created_at);

        await prisma.lead.upsert({
          where: { id },
          update: {
            agencyId,
            listing_id: r.listing_id,
            portal: r.portal,
            lead_source: r.lead_source,
            created_at: createdAt,
          },
          create: {
            id,
            agencyId,
            listing_id: r.listing_id,
            portal: r.portal,
            lead_source: r.lead_source,
            created_at: createdAt,
          },
        });

        await prisma.leadDetails.upsert({
          where: { lead_id: id },
          create: {
            lead_id: id,
            agencyId,

            language: r.lead_language ?? null,
            contact_name: r.contact_name ?? null,
            profile: r.profile ?? null,
            age: typeof r.age === "number" ? r.age : null,
            has_guarantor:
              typeof r.has_guarantor === "boolean" ? r.has_guarantor : null,
            budget_monthly:
              typeof r.budget_monthly === "number" ? r.budget_monthly : null,
            budget_currency: r.budget_currency ?? null,
            move_in_timing: r.move_in_timing ?? null,
            city_or_area: r.city_or_area ?? null,
            visit_preferences: r.visit_preferences ?? null,
            motivation_level:
              typeof r.motivation_level === "number" ? r.motivation_level : null,
            motivation_bucket: r.motivation_bucket ?? null,
            contact_email: r.contact_email ?? null,
            contact_phone: r.contact_phone ?? null,
            listing_reference: r.listing_reference ?? null,
            listing_url: r.listing_url ?? null,
            summary: r.lead_summary ?? null,
            raw_text: r.raw_text ?? null,
            email_subject: r.email_subject ?? null,

            ingest_workflow: (input as any).ingest_workflow ?? null,
          },
          update: {
            agencyId,

            language: r.lead_language ?? null,
            contact_name: r.contact_name ?? null,
            profile: r.profile ?? null,
            age: typeof r.age === "number" ? r.age : null,
            has_guarantor:
              typeof r.has_guarantor === "boolean" ? r.has_guarantor : null,
            budget_monthly:
              typeof r.budget_monthly === "number" ? r.budget_monthly : null,
            budget_currency: r.budget_currency ?? null,
            move_in_timing: r.move_in_timing ?? null,
            city_or_area: r.city_or_area ?? null,
            visit_preferences: r.visit_preferences ?? null,
            motivation_level:
              typeof r.motivation_level === "number" ? r.motivation_level : null,
            motivation_bucket: r.motivation_bucket ?? null,
            contact_email: r.contact_email ?? null,
            contact_phone: r.contact_phone ?? null,
            listing_reference: r.listing_reference ?? null,
            listing_url: r.listing_url ?? null,
            summary: r.lead_summary ?? null,
            raw_text: r.raw_text ?? null,
            email_subject: r.email_subject ?? null,

            ingest_workflow: (input as any).ingest_workflow ?? null,
          },
        });

        await attachLeadToPerson({
          agencyId,
          leadId: id,
          identity: {
            contact_name: r.contact_name ?? null,
            contact_email: r.contact_email ?? null,
            contact_phone: r.contact_phone ?? null,
          },
        });

        result.upserted.leads++;
      }
    }

    debug.step = "totals";
    const [tListings, tLeads, tSpend] = await Promise.all([
      prisma.listing.count(),
      prisma.lead.count(),
      prisma.spend.count(),
    ]);

    return NextResponse.json(
      {
        ok: true,
        ts: new Date().toISOString(),
        ...result,
        dbTotals: { listings: tListings, leads: tLeads, spend: tSpend },
      },
      { status: 200, headers: corsHeaders },
    );
  } catch (err) {
    console.error("[INGEST] fatal error", err, debug);
    return NextResponse.json(
      { ok: false, error: "server_error", debug },
      { status: 500, headers: corsHeaders },
    );
  }
}