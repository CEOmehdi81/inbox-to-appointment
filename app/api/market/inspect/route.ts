import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const [listings, leads, spend] = await Promise.all([
    prisma.listing.count(),
    prisma.lead.count(),
    prisma.spend.count(),
  ]);

  return NextResponse.json({
    ok: true,
    dbTotals: { listings, leads, spend },
    ts: new Date().toISOString(),
  });
}