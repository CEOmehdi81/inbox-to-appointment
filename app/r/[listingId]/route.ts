// app/r/[listingId]/route.ts
import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { EventType } from '@prisma/client';

function meta(req: NextRequest) {
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

export async function GET(
  req: NextRequest,
  { params }: { params: { listingId: string } }
) {
  const { listingId } = params;
  const u = new URL(req.url);
  const to = u.searchParams.get('to');   // destination URL
  const channelId = u.searchParams.get('channelId') || undefined;

  if (!to) return NextResponse.json({ error: 'missing to' }, { status: 400 });

  try {
    await prisma.listingEvent.create({
      data: { listingId, channelId, type: EventType.lead_click, ...meta(req) },
    });
  } catch { /* non-fatal */ }

  return NextResponse.redirect(to, 302);
}