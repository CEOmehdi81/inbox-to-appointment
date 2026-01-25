import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// Returns the list cards the left column expects
export async function GET() {
  try {
    const rows = await prisma.listing.findMany({
      take: 24,
      orderBy: { createdAt: 'desc' },
      include: {
        _count: { select: { channels: true } },
        channels: { select: { platform: true, url: true } },
      },
    });

    // Try to pick an image from the most recent matching MarketListing (by url)
    const items = await Promise.all(
      rows.map(async (l) => {
        let imageUrl: string | null = null;
        if (l.url) {
          const m = await prisma.marketListing.findFirst({
            where: { url: l.url },
            orderBy: { createdAt: 'desc' },
            select: { imageUrl: true },
          });
          imageUrl = m?.imageUrl ?? null;
        }
        return {
          id: l.id,
          title: l.title,
          city: l.city,
          price: l.priceMonthly,
          imageUrl,
          portalsCount: l._count.channels,
          portals: l.channels.map((c) => ({ portal: c.platform, url: c.url })),
        };
      })
    );

    return NextResponse.json({ items });
  } catch (err: any) {
    console.error('cards endpoint error', err);
    return NextResponse.json(
      { ok: false, error: err?.message ?? String(err), items: [] },
      { status: 500 }
    );
  }
}