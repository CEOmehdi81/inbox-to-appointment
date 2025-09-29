import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const rows = await prisma.listing.findMany({
      where: {
        latitude: { not: null },
        longitude: { not: null },
      },
      select: {
        id: true,
        latitude: true,
        longitude: true,
        title: true,
        _count: { select: { channels: true } },
      },
      take: 1000,
    });

    const points = rows.map((r) => ({
      id: r.id,
      lat: r.latitude!,
      lng: r.longitude!,
      size: Math.max(1, Math.min(5, r._count.channels || 1)),
      label: `${r.title} (${r._count.channels} portal${r._count.channels === 1 ? '' : 's'})`,
    }));

    return NextResponse.json({ points });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message ?? 'map-points failed' }, { status: 500 });
  }
}