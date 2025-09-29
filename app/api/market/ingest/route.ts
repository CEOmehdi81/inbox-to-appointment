// app/api/market/ingest/route.ts
import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { normalizeUrl } from '@/helpers/ingest';
import type { Prisma } from '@prisma/client';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

/* ------------------ types ------------------ */
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
  imageUrl?: string | null; // preferred
  image?: string | null;    // alternate key
};

/* ------------------ helpers ------------------ */
const n = (v: unknown) =>
  v === '' || v == null ? null : Number.isFinite(Number(v)) ? Number(v) : null;

const json = (data: unknown, status = 200) =>
  NextResponse.json(data, {
    status,
    headers: {
      'Access-Control-Allow-Origin': '*',
      Vary: 'Origin',
    },
  });

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
      'Access-Control-Max-Age': '600',
    },
  });
}

/* ------------------ POST /ingest ------------------ */
export async function POST(req: Request) {
  try {
    const rawBody = await req.json().catch(() => ({}));
    const items: ListingIn[] = Array.isArray(rawBody)
      ? rawBody
      : Array.isArray(rawBody.items)
      ? (rawBody.items as ListingIn[])
      : [];

    if (items.length === 0) {
      return json({ error: 'items must be a non-empty array' }, 400);
    }

    let created = 0;
    let updated = 0;
    let skipped = 0;
    const errors: Array<{ error: string; at?: number }> = [];

    await prisma.$transaction(async (tx) => {
      for (let i = 0; i < items.length; i++) {
        const raw = items[i];
        try {
          // 1) sanitize
          const portal = String(raw?.portal ?? '').trim();
          const url = normalizeUrl(String(raw?.url ?? ''));
          if (!portal || !url) {
            skipped++;
            continue;
          }

          const externalId =
            (raw?.externalId ?? '').toString().trim() || null;

          // prefer imageUrl, fallback to image
          const imageUrl =
            (raw?.imageUrl ?? raw?.image ?? '').toString().trim() || null;

          // 2) build data (never pass undefined)
          const baseCreate: Prisma.MarketListingUncheckedCreateInput = {
            portal,
            url,
            title: (raw.title ?? '').toString().trim(),
            city: raw.city?.toString().trim() ?? null,
            price: n(raw.price),
            surfaceM2: n(raw.surfaceM2),
            rooms: n(raw.rooms),
            latitude: n(raw.latitude),
            longitude: n(raw.longitude),
            externalId,
            imageUrl, // nullable string field
          };

          const baseUpdate: Prisma.MarketListingUncheckedUpdateInput = {
            portal: baseCreate.portal,
            url: baseCreate.url,
            title: baseCreate.title,
            city: baseCreate.city,
            price: baseCreate.price,
            surfaceM2: baseCreate.surfaceM2,
            rooms: baseCreate.rooms,
            latitude: baseCreate.latitude,
            longitude: baseCreate.longitude,
            externalId: baseCreate.externalId,
            imageUrl: baseCreate.imageUrl,
          };

          // 3) upsert path
          if (externalId) {
            // Uses the compound unique @@unique([portal, externalId])
            await tx.marketListing.upsert({
              where: {
                portal_externalId: { portal, externalId },
              },
              create: baseCreate,
              update: baseUpdate,
            });
            // We can’t perfectly know if it was create or update without an extra read,
            // so optimistically treat as "updated++ if existed" by probing url first:
            const existed = await tx.marketListing.findFirst({
              where: { portal, externalId },
              select: { id: true },
            });
            if (existed) updated++;
            else created++;
          } else {
            // No externalId → dedupe by normalized URL
            const existing = await tx.marketListing.findFirst({
              where: { url },
              select: { id: true },
            });

            if (existing) {
              await tx.marketListing.update({
                where: { id: existing.id },
                data: baseUpdate,
              });
              updated++;
            } else {
              await tx.marketListing.create({ data: baseCreate });
              created++;
            }
          }
        } catch (e: any) {
          errors.push({ error: e?.message || 'Unknown error', at: i });
          skipped++;
        }
      }
    });

    return json({ ok: true, created, updated, skipped, errors });
  } catch (err: any) {
    return json({ error: err?.message ?? 'ingest failed' }, 500);
  }
}