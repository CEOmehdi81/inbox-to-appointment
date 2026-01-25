import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const leads = await prisma.leadDetails.findMany({
      include: {
        lead: {
          include: { person: true },
        },
      },
      orderBy: {
        lead: { created_at: "desc" },
      },
    });

    return NextResponse.json({ ok: true, leads });
  } catch (err) {
    console.error("GET /api/leads failed", err);
    return NextResponse.json({ ok: false, error: "server_error" }, { status: 500 });
  }
}