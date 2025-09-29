// app/api/track/route.ts
import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export const runtime = 'nodejs';

/* ---------------------------- Types & helpers ---------------------------- */

type EventType =
  | 'view'
  | 'lead_click'
  | 'contact_click'
  | 'download'
  | 'favorite'
  | 'share_open'
  | 'share_download';

function pickEventType(v: string | null): EventType | null {
  if (!v) return null;
  const ok = new Set<EventType>([
    'view',
    'lead_click',
    'contact_click',
    'download',
    'favorite',
    'share_open',
    'share_download',
  ]);
  return ok.has(v as EventType) ? (v as EventType) : null;
}

function parseUtm(from?: string | null) {
  try {
    if (!from) return {};
    const u = new URL(from);
    const q = u.searchParams;
    return {
      utmSource: q.get('utm_source') || undefined,
      utmMedium: q.get('utm_medium') || undefined,
      utmCampaign: q.get('utm_campaign') || undefined,
    };
  } catch {
    return {};
  }
}

function getIp(req: NextRequest) {
  return (
    req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
    (req as any).ip ||
    ''
  );
}

const COOKIE_NAME = 'homi_sid';
const ONE_YEAR = 60 * 60 * 24 * 365;

function newSessionId(): string {
  return (
    (globalThis.crypto as any)?.randomUUID?.() ??
    `${Date.now().toString(36)}${Math.random().toString(36).slice(2)}`
  );
}

function ensureSessionId(req: NextRequest, headers?: Headers): string {
  const fromReq = req.cookies.get(COOKIE_NAME)?.value;
  if (fromReq) return fromReq;
  const sid = newSessionId();
  headers?.append(
    'Set-Cookie',
    `${COOKIE_NAME}=${sid}; Path=/; Max-Age=${ONE_YEAR}; SameSite=Lax`
  );
  return sid;
}

// In your schema EventType enum uses lowercase strings already.
// Keep a mapper so this file stays future-proof.
function mapToDbType(t: EventType | null): EventType | null {
  return t ?? null;
}

// 1×1 transparent GIF bytes (GIF89a)
const TINY_GIF_1x1 = new Uint8Array([
  0x47, 0x49, 0x46, 0x38, 0x39, 0x61, 0x01, 0x00, 0x01, 0x00, 0x80, 0x00, 0x00, 0x00, 0x00, 0x00,
  0xff, 0xff, 0xff, 0x21, 0xf9, 0x04, 0x01, 0x00, 0x00, 0x00, 0x00, 0x2c, 0x00, 0x00, 0x00, 0x00,
  0x01, 0x00, 0x01, 0x00, 0x00, 0x02, 0x02, 0x44, 0x01, 0x00, 0x3b,
]);
function u8ToArrayBuffer(u8: Uint8Array): ArrayBuffer {
  const ab = new ArrayBuffer(u8.byteLength);
  new Uint8Array(ab).set(u8);
  return ab;
}

/** Try to resolve a "channel" hint to a real ListingChannel.id for this listing. */
async function resolveChannelId(
  listingId: string,
  raw?: string | null
): Promise<string | undefined> {
  const q = (raw || '').trim();
  if (!q) return undefined;

  // 1) exact id match for this listing
  const byId = await prisma.listingChannel.findFirst({
    where: { id: q, listingId },
    select: { id: true },
  });
  if (byId) return byId.id;

  // 2) platform label (e.g., "website", "SeLoger", etc.)
  const byPlatform = await prisma.listingChannel.findFirst({
    where: { listingId, platform: q },
    select: { id: true },
  });
  if (byPlatform) return byPlatform.id;

  // 3) URL (if caller passes a channel URL)
  if (q.startsWith('http')) {
    const byUrl = await prisma.listingChannel.findFirst({
      where: { listingId, url: q },
      select: { id: true },
    });
    if (byUrl) return byUrl.id;
  }

  // No match → return undefined (don’t send an invalid FK)
  return undefined;
}

/* --------------------------------- CORS ---------------------------------- */

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, GET, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    },
  });
}

/* ------------------------------ POST (JSON) ------------------------------- */

export async function POST(req: NextRequest) {
  let body: any = {};
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, where: 'POST', error: 'Bad JSON' }, { status: 400 });
  }

  const listingId = String(body.listingId || '').trim();
  const uiType = pickEventType(String(body.type || ''));
  const dbType = mapToDbType(uiType);

  if (!listingId || !dbType) {
    return NextResponse.json({ ok: false, where: 'POST', error: 'Invalid payload' }, { status: 400 });
  }

  // Ensure listing exists
  const exists = await prisma.listing.findUnique({
    where: { id: listingId },
    select: { id: true },
  });
  if (!exists) {
    return NextResponse.json({ ok: false, where: 'POST', error: 'Unknown listing' }, { status: 404 });
  }

  // Resolve channelId only if it maps to an existing ListingChannel for this listing
  const channelHint = body.channelId ?? body.channel ?? body.platform ?? body.url ?? null;
  const channelId = await resolveChannelId(listingId, channelHint);

  const res = new NextResponse(null, { status: 204 });

  const ip = getIp(req);
  const userAgent = req.headers.get('user-agent') || '';
  const referer = req.headers.get('referer') || body.href || '';
  const parsed = parseUtm(referer) as any;

  const utmSource = body.utmSource ?? parsed.utmSource;
  const utmMedium = body.utmMedium ?? parsed.utmMedium;
  const utmCampaign = body.utmCampaign ?? parsed.utmCampaign;

  const sid =
    req.cookies.get(COOKIE_NAME)?.value ||
    (() => {
      const v = newSessionId();
      res.cookies.set(COOKIE_NAME, v, {
        path: '/',
        httpOnly: false,
        sameSite: 'lax',
        maxAge: ONE_YEAR,
      });
      return v;
    })();

  try {
    await prisma.listingEvent.create({
      data: {
        listingId,
        channelId, // <- only a valid FK or undefined
        type: dbType as any,
        ip,
        userAgent,
        referer,
        utmSource,
        utmMedium,
        utmCampaign,
        sessionId: sid,
      },
    });
  } catch (e: any) {
    // Fallback to uiType just in case your enum changes
    try {
      await prisma.listingEvent.create({
        data: {
          listingId,
          channelId,
          type: uiType as any,
          ip,
          userAgent,
          referer,
          utmSource,
          utmMedium,
          utmCampaign,
          sessionId: sid,
        },
      });
    } catch (err: any) {
      return NextResponse.json(
        { ok: false, where: 'POST', error: String(err?.message || err) },
        { status: 500 }
      );
    }
  }

  res.headers.set('Access-Control-Allow-Origin', '*');
  res.headers.set('Vary', 'Origin');
  return res;
}

/* ------------------------------ GET (pixel) ------------------------------- */
/** Usage: /api/track?pixel=1&listing=ABC&type=view&channel=website */
export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const listingId =
    (url.searchParams.get('listing') ||
      url.searchParams.get('listingId') ||
      '').trim();
  const uiType = pickEventType(url.searchParams.get('type'));
  const dbType = mapToDbType(uiType);
  const channelHint =
    url.searchParams.get('channel') ||
    url.searchParams.get('channelId') ||
    url.searchParams.get('platform') ||
    url.searchParams.get('url');

  if (!listingId || !dbType) {
    return NextResponse.json({ ok: false, where: 'GET', error: 'Missing params' }, { status: 400 });
  }

  const headers = new Headers();

  const ip = getIp(req);
  const userAgent = req.headers.get('user-agent') || '';
  const referer = req.headers.get('referer') || '';
  const { utmSource, utmMedium, utmCampaign } = parseUtm(referer) as any;

  const sid = ensureSessionId(req, headers);
  const channelId = await resolveChannelId(listingId, channelHint);

  try {
    await prisma.listingEvent.create({
      data: {
        listingId,
        channelId,
        type: dbType as any,
        ip,
        userAgent,
        referer,
        utmSource,
        utmMedium,
        utmCampaign,
        sessionId: sid,
      },
    });
  } catch (e: any) {
    try {
      await prisma.listingEvent.create({
        data: {
          listingId,
          channelId,
          type: uiType as any,
          ip,
          userAgent,
          referer,
          utmSource,
          utmMedium,
          utmCampaign,
          sessionId: sid,
        },
      });
    } catch (err: any) {
      return NextResponse.json(
        { ok: false, where: 'GET', error: String(err?.message || err) },
        { status: 500, headers }
      );
    }
  }

  // Pixel?
  if (url.searchParams.get('pixel')) {
    headers.set('Content-Type', 'image/gif');
    headers.set('Cache-Control', 'no-store, max-age=0');
    headers.set('Access-Control-Allow-Origin', '*');
    return new Response(u8ToArrayBuffer(TINY_GIF_1x1), { status: 200, headers });
    }

  const res = NextResponse.json({ ok: true });
  res.headers.set('Access-Control-Allow-Origin', '*');
  res.headers.set('Vary', 'Origin');
  for (const [k, v] of headers) res.headers.append(k, v);
  return res;
}