// app/api/track/route.ts
import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { EventType } from '@prisma/client';

function getClientMeta(req: NextRequest) {
  const h = req.headers;
  const ip = (h.get('x-forwarded-for') || '').split(',')[0]?.trim() || '';
  const userAgent = h.get('user-agent') || '';
  const referer = h.get('referer') || '';
  const u = new URL(req.url);
  return {
    ip, userAgent, referer,
    utmSource: u.searchParams.get('utm_source') || undefined,
    utmMedium: u.searchParams.get('utm_medium') || undefined,
    utmCampaign: u.searchParams.get('utm_campaign') || undefined,
  };
}

// tiny 1x1 PNG for <img src="/api/track?..."> beacons
const ONE_BY_ONE_PNG = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mO0WQ8AAbEBa4kqH+QAAAAASUVORK5CYII=',
  'base64'
);

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { listingId, channelId, type } = body as {
      listingId: string; channelId?: string; type: EventType;
    };
    if (!listingId || !type) return NextResponse.json({ error: 'missing fields' }, { status: 400 });

    const meta = getClientMeta(req);
    await prisma.listingEvent.create({
      data: { listingId, channelId, type, ...meta },
    });

    return new NextResponse(null, { status: 204 });
  } catch {
    return NextResponse.json({ error: 'bad request' }, { status: 400 });
  }
}

// GET pixel: /api/track?listingId=...&type=view&channelId=...
export async function GET(req: NextRequest) {
  const u = new URL(req.url);
  const listingId = u.searchParams.get('listingId') || '';
  const channelId = u.searchParams.get('channelId') || undefined;
  const typeStr = u.searchParams.get('type') || 'view';

  // validate type
  const type = (Object.values(EventType) as string[]).includes(typeStr)
    ? (typeStr as EventType)
    : EventType.view;

  if (listingId) {
    const meta = getClientMeta(req);
    await prisma.listingEvent.create({
      data: { listingId, channelId, type, ...meta },
    });
  }

  return new NextResponse(ONE_BY_ONE_PNG, {
    status: 200,
    headers: {
      'Content-Type': 'image/png',
      'Cache-Control': 'no-store',
    },
  });
}