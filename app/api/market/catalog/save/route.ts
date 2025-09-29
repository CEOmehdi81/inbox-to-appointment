import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export const dynamic = 'force-dynamic';

type PortalPayload = {
  country: string;
  name: string;
  url: string;
  type: 'rent' | 'sale' | 'both';
  notes?: string | null;
};

export async function POST(req: Request) {
  try {
    const { portals } = (await req.json()) as { portals: PortalPayload[] };

    if (!Array.isArray(portals) || portals.length === 0) {
      return NextResponse.json({ error: 'No portals to save' }, { status: 400 });
    }

    await prisma.$transaction(
      portals.map((p) =>
        prisma.portalCatalogEntry.upsert({
          where: { url: p.url },
          update: {
            country: p.country,
            name: p.name,
            type: p.type as any,
            notes: p.notes ?? null,
          },
          create: {
            country: p.country,
            name: p.name,
            url: p.url,
            type: p.type as any,
            notes: p.notes ?? null,
          },
        }),
      ),
    );

    return NextResponse.json({ ok: true, count: portals.length });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message ?? 'Save failed' }, { status: 500 });
  }
}