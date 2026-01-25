// app/api/market/listings/import/route.ts
import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { normalizeUrl } from '@/helpers/ingest';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

type ListingIn = {
  portal: string;
  url: string;
  title?: string | null;
  city?: string | null;
  price?: number | string | null;
  surfaceM2?: number | string | null;
  rooms?: number | string | null;
  latitude?: number | string | null;
  longitude?: number | string | null;
  externalId?: string | null;
  imageUrl?: string | null;
};

const num = (v: unknown) =>
  v === '' || v == null ? null : Number.isFinite(Number(v)) ? Number(v) : null;

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));
    const items: ListingIn[] = Array.isArray(body?.items) ? body.items : [];

    if (items.length === 0) {
      return NextResponse.json({ error: 'items must be a non-empty array' }, { status: 400 });
    }

    let created = 0, updated = 0, skipped = 0;
    const errors: Array<{ error: string }> = [];

    await prisma.$transaction(async (tx) => {
      for (const raw of items) {
        try {
          const portal = String(raw?.portal ?? '').trim();
          const url = normalizeUrl(String(raw?.url ?? ''));
          if (!portal || !url) { skipped++; continue; }

          const externalId = (raw?.externalId ?? '').toString().trim() || null;
          const imageUrl = (raw?.imageUrl ?? '').toString().trim() || null;

          // Find existing by normalized URL OR (portal, externalId)
          const ors: any[] = [{ url }];
          if (externalId) ors.push({ portal, externalId });

          const existing = await tx.marketListing.findFirst({
            where: { OR: ors },
            select: { id: true },
          });

          const base = {
            portal,
            url,
            title: (raw?.title ?? '').toString().trim(),
            city: raw?.city?.toString().trim() || null,
            price: num(raw?.price),
            surfaceM2: num(raw?.surfaceM2),
            rooms: num(raw?.rooms),
            latitude: num(raw?.latitude),
            longitude: num(raw?.longitude),
            externalId,
            imageUrl,
          };

          if (existing) {
            await tx.marketListing.update({ where: { id: existing.id }, data: base });
            updated++;
          } else {
            await tx.marketListing.create({ data: base });
            created++;
          }
        } catch (e: any) {
          errors.push({ error: e?.message || 'Unknown error' });
          skipped++;
        }
      }
    });

    return NextResponse.json({ ok: true, created, updated, skipped, errors });
  } catch (err: any) {
    return NextResponse.json({ error: err?.message ?? 'import failed' }, { status: 500 });
  }
}