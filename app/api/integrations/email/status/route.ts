import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const agencyId = searchParams.get("agencyId");
  if (!agencyId) return NextResponse.json({ error: "agencyId required" }, { status: 400 });

  const row = await prisma.emailIntegration.findUnique({ where: { agencyId } });

  return NextResponse.json({
    connected: !!row && row.status !== "PENDING",
    status: row?.status ?? "NONE",
    email: row?.email ?? null,
    labelName: row?.labelName ?? null,
    lastError: row?.lastError ?? null,
    verifiedAt: row?.verifiedAt ?? null,
  });
}