// app/api/oauth/gmail/reset/route.ts
// Reset Gmail integration - clears dead tokens so fresh OAuth can work
// Matches your existing project structure

import { NextResponse, type NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  return NextResponse.json({
    ok: true,
    message: "Use POST to reset Gmail integration",
    warning: "This will delete stored tokens and require re-authentication",
    usage: "POST /api/oauth/gmail/reset?agencyId=YOUR_AGENCY_ID",
  });
}

export async function POST(req: NextRequest) {
  try {
    const url = new URL(req.url);
    const agencyId = url.searchParams.get("agencyId");

    // Also check body
    let bodyAgencyId: string | null = null;
    try {
      const body = await req.json();
      bodyAgencyId = body?.agencyId || null;
    } catch {
      // ignore
    }

    const finalAgencyId = agencyId || bodyAgencyId;

    if (!finalAgencyId) {
      return NextResponse.json(
        { ok: false, error: "agencyId is required (query param or body)" },
        { status: 400 }
      );
    }

    // Find existing integrations
    const existing = await prisma.emailIntegration.findMany({
      where: {
        agencyId: finalAgencyId,
        provider: "GMAIL",
      },
      select: {
        id: true,
        email: true,
        status: true,
        lastError: true,
      },
    });

    if (!existing.length) {
      return NextResponse.json({
        ok: true,
        message: "No Gmail integrations found for this agency",
        deleted: 0,
        agencyId: finalAgencyId,
      });
    }

    // Delete all Gmail integrations for this agency
    const result = await prisma.emailIntegration.deleteMany({
      where: {
        agencyId: finalAgencyId,
        provider: "GMAIL",
      },
    });

    // Also clean up seen messages to allow re-processing
    const seenDeleted = await prisma.emailMessageSeen.deleteMany({
      where: {
        agencyId: finalAgencyId,
        provider: "GMAIL",
      },
    });

    return NextResponse.json({
      ok: true,
      message: "Gmail integration reset successfully",
      deleted: result.count,
      seenMessagesCleared: seenDeleted.count,
      agencyId: finalAgencyId,
      previousIntegrations: existing,
      nextStep: `Reconnect Gmail: /api/oauth/gmail/start?agencyId=${encodeURIComponent(finalAgencyId)}`,
    });
  } catch (e: any) {
    console.error("Gmail reset failed:", e);
    return NextResponse.json(
      { ok: false, error: e?.message || "reset_failed" },
      { status: 500 }
    );
  }
}