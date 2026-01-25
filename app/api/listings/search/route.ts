import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const url = new URL(req.url);
    const portal = (url.searchParams.get("portal") || "").trim();
    const q = (url.searchParams.get("q") || "").trim();

    if (!portal || !q) {
      return NextResponse.json({ ok: false, error: "portal and q are required" }, { status: 400 });
    }

    const candidates = await prisma.listing.findMany({
      where: {
        portal,
        OR: [
          { title: { contains: q } },     // remove `mode`
          { location: { contains: q } },  // remove `mode`
        ],
      },
      select: { id: true, title: true, location: true, status: true, listed_at: true },
      take: 5,
      orderBy: { listed_at: "desc" },
    });

    return NextResponse.json({ ok: true, count: candidates.length, items: candidates });
  } catch (err: any) {
    return NextResponse.json(
      { ok: false, error: err?.message || "internal_error" },
      { status: 500 }
    );
  }
}