// app/api/track/route.ts
import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export const runtime = 'nodejs';

type EventType =
  | 'view'
  | 'lead_click'
  | 'contact_click'
  | 'download'
  | 'favorite'
  | 'share_open'
  | 'share_download';

function pickEventType(v: string | null): EventType | null {
  const ok = new Set([
    'view',
    'lead_click',
    'contact_click',
    'download',
    'favorite',
    'share_open',
    'share_download',
  ]);
  if (!v) return null;
  v = v as EventType;
  return ok.has(v) ? (v as EventType) : null;
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
  // works on Vercel/Node with proxy
  return (
    req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
    (req as any).ip ||
    ''
  );
}

function getSessionId(req: NextRequest, res: NextResponse) {
  const cookieName = 'homi_sid';
  const fromReq = req.cookies.get(cookieName)?.value;
  if (fromReq) return fromReq;

  const sid =
    (globalThis.crypto as any)?.randomUUID?.() ||
    `${Date.now().toString(36)}${Math.random().toString(36).slice(2)}`;
  res.cookies.set(cookieName, sid, {
    httpOnly: false,
    sameSite: 'lax',
    path: '/',
    maxAge: 60 * 60 * 24 * 365, // 1y
  });
  return sid;
}

export async function OPTIONS() {
  // CORS preflight (allow cross-origin embeds if you host the tracker elsewhere)
  return new NextResponse(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, GET, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    },
  });
}

export async function POST(req: NextRequest) {
  const res = new NextResponse(null, { status: 204 });

  let body: any = {};
  try {
    body = await req.json();
  } catch {
    return new NextResponse('Bad JSON', { status: 400 });
  }

  const listingId = String(body.listingId || '').trim();
  const channelId = body.channelId ? String(body.channelId).trim() : null;
  const t = pickEventType(String(body.type || ''));
  if (!listingId || !t) return new NextResponse('Invalid payload', { status: 400 });

  // (Optional) ensure listing exists; cheap lookup avoids foreign-key error noise
  const exists = await prisma.listing.findUnique({ where: { id: listingId }, select: { id: true } });
  if (!exists) return new NextResponse('Unknown listing', { status: 404 });

  const ip = getIp(req);
  const userAgent = req.headers.get('user-agent') || '';
  const referer = req.headers.get('referer') || body.href || '';
  const { utmSource, utmMedium, utmCampaign } = {
    ...parseUtm(referer),
    // body-provided UTM override (from the JS)
    utmSource: body.utmSource || parseUtm(referer).utmSource,
    utmMedium: body.utmMedium || parseUtm(referer).utmMedium,
    utmCampaign: body.utmCampaign || parseUtm(referer).utmCampaign,
  };

  const sessionId = getSessionId(req, res);

  await prisma.listingEvent.create({
    data: {
      listingId,
      channelId: channelId || undefined,
      type: t as any,
      ip,
      userAgent,
      referer,
      utmSource,
      utmMedium,
      utmCampaign,
      sessionId,
    },
  });

  // CORS headers, in case script is used on another origin you control
  res.headers.set('Access-Control-Allow-Origin', '*');
  res.headers.set('Vary', 'Origin');

  return res;
}

// Optional 1x1 pixel GET fallback: /api/track?listing=...&type=view
export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const listingId = (url.searchParams.get('listing') || '').trim();
  const type = pickEventType(url.searchParams.get('type'));
  const channelId = (url.searchParams.get('channel') || '').trim() || null;

  if (!listingId || !type) return new NextResponse('Missing params', { status: 400 });

  const res = new NextResponse(null, { status: 204 });
  const ip = getIp(req);
  const userAgent = req.headers.get('user-agent') || '';
  const referer = req.headers.get('referer') || '';
  const { utmSource, utmMedium, utmCampaign } = parseUtm(referer) as any;
  const sessionId = getSessionId(req, res);

  await prisma.listingEvent.create({
    data: {
      listingId,
      channelId: channelId || undefined,
      type: type as any,
      ip,
      userAgent,
      referer,
      utmSource,
      utmMedium,
      utmCampaign,
      sessionId,
    },
  });

  return res;
}