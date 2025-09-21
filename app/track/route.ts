import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

// 1×1 transparent PNG
const PIXEL = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAusB9Yp6+HcAAAAASUVORK5CYII=',
  'base64'
);

function corsHeaders() {
  return {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET,POST,OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Cache-Control': 'no-store',
  };
}

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: corsHeaders() });
}

export async function GET(req: NextRequest) {
  // Pixel for simple view tracking:
  // /track?listing=<id>&channel=<id>&type=view
  const url = new URL(req.url);
  const listingId = url.searchParams.get('listing') || '';
  const channelId = url.searchParams.get('channel') || undefined;
  const type = (url.searchParams.get('type') || 'view') as any;

  if (listingId) {
    try {
      await prisma.listingEvent.create({
        data: {
          listingId,
          channelId: channelId || null,
          type,
          // meta
          ip: req.headers.get('x-forwarded-for') ?? '',
          userAgent: req.headers.get('user-agent') ?? '',
          referer: req.headers.get('referer') ?? '',
          // UTM (best-effort via query)
          utmSource: url.searchParams.get('utm_source') || undefined,
          utmMedium: url.searchParams.get('utm_medium') || undefined,
          utmCampaign: url.searchParams.get('utm_campaign') || undefined,
          sessionId: url.searchParams.get('sid') || undefined,
        },
      });
    } catch (_) {}
  }

  return new NextResponse(PIXEL, {
    status: 200,
    headers: {
      ...corsHeaders(),
      'Content-Type': 'image/png',
      'Content-Length': String(PIXEL.byteLength),
    },
  });
}

export async function POST(req: NextRequest) {
  // JSON event tracking
  // body: { listingId, channelId?, type, utmSource?, utmMedium?, utmCampaign?, sessionId? }
  try {
    const body = await req.json();
    const {
      listingId,
      channelId,
      type = 'view',
      utmSource,
      utmMedium,
      utmCampaign,
      sessionId,
    } = body ?? {};

    if (!listingId) {
      return NextResponse.json({ error: 'listingId required' }, { status: 400, headers: corsHeaders() });
    }

    const evt = await prisma.listingEvent.create({
      data: {
        listingId,
        channelId: channelId ?? null,
        type,
        // meta
        ip: req.headers.get('x-forwarded-for') ?? '',
        userAgent: req.headers.get('user-agent') ?? '',
        referer: req.headers.get('referer') ?? '',
        utmSource: utmSource || undefined,
        utmMedium: utmMedium || undefined,
        utmCampaign: utmCampaign || undefined,
        sessionId: sessionId || undefined,
      },
    });

    return NextResponse.json({ ok: true, id: evt.id }, { headers: corsHeaders() });
  } catch (e) {
    return NextResponse.json({ ok: false }, { status: 500, headers: corsHeaders() });
  }
}