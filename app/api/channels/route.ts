import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
export const runtime = "nodejs";

// CHANGE THIS to match your Prisma schema field name on Channel
// Example: "agencyId" | "tenantId" | "workspaceId" | "orgId"
const TENANT_FIELD = "agencyId" as const;

type ChannelType = "WHATSAPP" | "EMAIL" | "PORTAL" | "WEBFORM" | "CALL_TRACKING";

function mustAgencyId(req: Request) {
  const { searchParams } = new URL(req.url);
  const agencyId = searchParams.get("agencyId");
  if (!agencyId) return { error: NextResponse.json({ error: "agencyId is required" }, { status: 400 }) };
  return { agencyId };
}

function isChannelType(v: any): v is ChannelType {
  return ["WHATSAPP", "EMAIL", "PORTAL", "WEBFORM", "CALL_TRACKING"].includes(v);
}

export async function GET(req: Request) {
  const parsed = mustAgencyId(req);
  if ("error" in parsed) return parsed.error;

  const where: any = { [TENANT_FIELD]: parsed.agencyId };

  const channels = await prisma.channel.findMany({
    where,
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json(channels);
}

export async function POST(req: Request) {
  const parsed = mustAgencyId(req);
  if ("error" in parsed) return parsed.error;

  const body = await req.json().catch(() => ({}));

  const name = typeof body.name === "string" ? body.name : "Email";
  const type = body.type;

  if (!isChannelType(type)) {
    return NextResponse.json({ error: "Invalid channel type" }, { status: 400 });
  }

  const data: any = {
    [TENANT_FIELD]: parsed.agencyId,
    name,
    type,
    isActive: true,
    config: body.config ?? null,
  };

  const channel = await prisma.channel.create({ data });
  return NextResponse.json(channel);
}