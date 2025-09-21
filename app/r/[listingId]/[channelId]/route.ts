// app/r/[channelId]/route.ts
import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export const runtime = 'nodejs';

function getClientIP(req: NextRequest) {
  const xff = req.headers.get('x-forwarded-for');
  if (xff) return xff.split(',')[0].trim();
  return req.headers.get('x-real-ip') ?? '';
}

function ensureAbsolute(url: string) {
  if (!url) return '';
  if (/^https?:\/\//i.test(url)) return url;
  return `https://${url}`;
}

export async function GET(req: NextRequest, { params }: { params: { channelId: string } }) {
  const { channelId } = params;

  // 1) Look up the channel (and listing for attribution)
  const channel = await prisma.listingChannel.findUnique({
    where: { id: channelId },
    include: { listing: true },
  });

  if (!channel) {
    return new Response('Channel not found', { status: 404 });
  }

  const dest = ensureAbsolute(channel.url);

  // 2) Capture basic attribution
  const url = new URL(req.url);
  const utmSource = url.searchParams.get('utm_source') ?? undefined;
  const utmMedium = url.searchParams.get('utm_medium') ?? undefined;
  const utmCampaign = url.searchParams.get('utm_campaign') ?? undefined;

  const ip = getClientIP(req);
  const userAgent = req.headers.get('user-agent') ?? undefined;
  const referer = req.headers.get('referer') ?? undefined;

  // 3) Log an event (non-fatal if it fails)
  try {
    await prisma.listingEvent.create({
      data: {
        listingId: channel.listingId,
        channelId: channel.id,
        type: 'view', // counts a short-link click as a view for this channel
        ip,
        userAgent,
        referer,
        utmSource,
        utmMedium,
        utmCampaign,
      },
    });
  } catch {
    // ignore logging failures to avoid breaking redirect
  }

  // 4) Redirect to the real listing URL
  if (!dest) {
    return new Response('Channel has no URL', { status: 400 });
  }
  return NextResponse.redirect(dest, 302);
}