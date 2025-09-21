// app/api/market/ingest/route.ts
import { NextRequest } from 'next/server';
import prisma from '@/lib/prisma';

export const runtime = 'nodejs';

// Optional: set a token in your .env like MARKET_INGEST_TOKEN="devtoken123"
const TOKEN = process.env.MARKET_INGEST_TOKEN || 'devtoken123';

type Body = {
  portal: string;          // e.g., "SeLoger"
  url: string;             // canonical listing URL
  title?: string | null;
  city?: string | null;
  price?: number | null;   // in EUR
  surfaceM2?: number | null;
  rooms?: number | null;
  latitude?: number | null;
  longitude?: number | null;
  createdAt?: string | null; // ISO string (optional)
};

// (best-effort) geocode when lat/lng are missing & we at least have a city
async function geocodeCity(city?: string | null) {
  if (!city) return null;
  try {
    const u = new URL('https://nominatim.openstreetmap.org/search');
    u.searchParams.set('format', 'json');
    u.searchParams.set('limit', '1');
    u.searchParams.set('q', city);
    const res = await fetch(u.toString(), {
      headers: {
        'User-Agent': 'HOMI/0.1 (admin@homi.local)',
        Accept: 'application/json',
      },
      cache: 'no-store',
    });
    if (!res.ok) return null;
    const arr = (await res.json()) as any[];
    if (arr?.length) {
      return {
        lat: Number(arr[0].lat),
        lng: Number(arr[0].lon),
      };
    }
  } catch {}
  return null;
}

export async function POST(req: NextRequest) {
  // auth
  const auth = req.headers.get('authorization') || '';
  const token = auth.toLowerCase().startsWith('bearer ') ? auth.slice(7) : '';
  if (token !== TOKEN) {
    return new Response('Unauthorized', { status: 401 });
  }

  let body: Body;
  try {
    body = (await req.json()) as Body;
  } catch {
    return new Response('Invalid JSON', { status: 400 });
  }

  if (!body?.portal || !body?.url) {
    return new Response('portal and url are required', { status: 400 });
  }

  // fill lat/lng if missing
  let latitude = body.latitude ?? null;
  let longitude = body.longitude ?? null;
  if ((latitude == null || longitude == null) && body.city) {
    const g = await geocodeCity(body.city);
    if (g) {
      latitude = g.lat;
      longitude = g.lng;
    }
  }

  // dedupe by URL (recommended to have @@unique([url]) in prisma, but we’ll handle both cases)
  const existing = await prisma.marketListing.findFirst({ where: { url: body.url } });

  const data = {
    portal: body.portal,
    url: body.url,
    title: body.title ?? null,
    city: body.city ?? null,
    price: body.price ?? null,
    surfaceM2: body.surfaceM2 ?? null,
    rooms: body.rooms ?? null,
    latitude,
    longitude,
    createdAt: body.createdAt ? new Date(body.createdAt) : undefined, // else default now()
  };

  const row = existing
    ? await prisma.marketListing.update({ where: { id: existing.id }, data })
    : await prisma.marketListing.create({ data });

  return Response.json({ ok: true, id: row.id });
}