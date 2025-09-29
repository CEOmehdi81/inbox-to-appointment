import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import type { PortalCatalogEntry } from '@prisma/client';

export const dynamic = 'force-dynamic';

type Portal = {
  country: string;
  name: string;
  url: string;
  type: 'rent' | 'sale' | 'both';
  notes?: string | null;
};

export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const country = url.searchParams.get('country')?.trim() || undefined;

    const rows: PortalCatalogEntry[] = await prisma.portalCatalogEntry.findMany({
      where: { country },
      orderBy: [{ country: 'asc' }, { name: 'asc' }],
    });

    const portals: Portal[] = rows.map((r: PortalCatalogEntry) => ({
      country: r.country,
      name: r.name,
      url: r.url,
      // your Prisma enum already matches 'rent'|'sale'|'both'
      type: r.type as unknown as Portal['type'],
      notes: r.notes ?? null,
    }));

    return NextResponse.json({ portals });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message ?? 'Load failed' }, { status: 500 });
  }
}