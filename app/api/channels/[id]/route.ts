import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function PATCH(req: Request, ctx: { params: { id: string } }) {
  const id = ctx.params.id;

  const body = await req.json().catch(() => ({}));
  const isActive = typeof body.isActive === "boolean" ? body.isActive : undefined;
  const config = body.config ?? undefined;

  const updated = await prisma.channel.update({
    where: { id },
    data: {
      ...(isActive === undefined ? {} : { isActive }),
      ...(config === undefined ? {} : { config }),
    },
  });

  return NextResponse.json(updated);
}