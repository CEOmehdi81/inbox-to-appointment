import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { buildDashboard } from "@/lib/metrics";         // <-- reuse your code
import type { Listing, Lead, Spend } from "@/lib/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function prevMonthOf(ym: string) {
  const [y, m] = ym.split("-").map(Number);
  const d = new Date(Date.UTC(y, m - 1, 1));
  d.setUTCMonth(d.getUTCMonth() - 1);
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`;
}

export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const month = url.searchParams.get("month") || new Date().toISOString().slice(0, 7);
  const prevMonth = prevMonthOf(month);

  // 1) Read everything we need from DB
  const [listingsDb, leadsDb, spendDb] = await Promise.all([
    prisma.listing.findMany({
      select: { id: true, title: true, portal: true, location: true, price: true, status: true, listed_at: true },
    }),
    prisma.lead.findMany({
      select: { id: true, listing_id: true, portal: true, lead_source: true, created_at: true },
    }),
    prisma.spend.findMany({
      // optional: keep it small by getting only curr & prev months
      where: { month: { in: [month, prevMonth] } },
      select: { id: true, portal: true, month: true, amount: true },
    }),
  ]);

  // 2) Adapt Prisma rows to your lib types (dates as ISO strings)
  const listings: Listing[] = listingsDb.map(l => ({
    id: l.id,
    title: l.title,
    portal: l.portal,
    location: l.location ?? "",
    price: l.price ?? null,
    status: l.status ?? "",
    listed_at: l.listed_at ? l.listed_at.toISOString() : null,
  }));

  const leads: Lead[] = leadsDb.map(x => ({
    id: x.id,
    listing_id: x.listing_id,
    portal: x.portal,
    lead_source: x.lead_source,
    created_at: x.created_at.toISOString(),   // <-- your lib expects ISO string
  }));

  const spend: Spend[] = spendDb.map(s => ({
    id: s.id,
    portal: s.portal,
    month: s.month,
    amount: Number(s.amount),
  }));

  // 3) Reuse your existing builder
  const dash = buildDashboard(listings, leads, spend, month, prevMonth);

  // 4) Return exactly what the dashboard needs
  return NextResponse.json({ month, prevMonth, ...dash });
}