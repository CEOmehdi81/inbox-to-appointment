import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const ch = await prisma.channel.findFirst({
    where: { type: "EMAIL" },
    select: { id: true, isActive: true, config: true, updatedAt: true },
  });

  const workflowEmail =
    (ch?.config as any)?.workflowEmail && typeof (ch?.config as any)?.workflowEmail === "string"
      ? (ch?.config as any)?.workflowEmail
      : null;

  return NextResponse.json({
    active: !!ch?.isActive,
    workflowEmail,
    updatedAt: ch?.updatedAt ?? null,
  });
}