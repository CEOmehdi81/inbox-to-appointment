import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// Returns the geo points the globe expects
export async function GET() {
  try {
    const rows = await prisma.marketListing.findMany({
      where: { latitude: { not: null }, longitude: { not: null } },
      orderBy: { createdAt: 'desc' },
      take: 200,
      select: { id: true, latitude: true, longitude: true, title: true, city: true },
    });

    const points = rows.map((r) => ({
      id: r.id,
      lat: r.latitude as number,
      lng: r.longitude as number,
      size: 1,
      label: [r.title, r.city].filter(Boolean).join(' • '),
    }));

    return NextResponse.json({ points });
  } catch (err: any) {
    console.error('map-points error', err);
    return NextResponse.json(
      { ok: false, error: err?.message ?? String(err), points: [] },
      { status: 500 }
    );
  }
}