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

export async function GET(
  req: NextRequest,
  { params }: { params: { channelId: string } }
) {
  const { channelId } = params;

  // 1) Look up channel
  const ch = await prisma.listingChannel.findUnique({
    where: { id: channelId },
    select: { id: true, listingId: true, url: true },
  });

  if (!ch) return new NextResponse('Channel not found', { status: 404 });

  const destAbs = ensureAbsolute(ch.url);
  if (!destAbs) return new NextResponse('Channel has no URL', { status: 400 });

  // 2) Grab attribution from incoming request
  const url = new URL(req.url);
  const utmSource = url.searchParams.get('utm_source') ?? undefined;
  const utmMedium = url.searchParams.get('utm_medium') ?? undefined;
  const utmCampaign = url.searchParams.get('utm_campaign') ?? undefined;

  const ip = getClientIP(req);
  const userAgent = req.headers.get('user-agent') ?? undefined;
  const referer = req.headers.get('referer') ?? undefined;

  // 3) Log an event (non-blocking)
  prisma.listingEvent
    .create({
      data: {
        listingId: ch.listingId,
        channelId: ch.id,
        // use 'share_open' if you prefer to distinguish shortlink clicks
        type: 'view',
        ip,
        userAgent,
        referer,
        utmSource,
        utmMedium,
        utmCampaign,
      },
    })
    .catch(() => { /* ignore logging failures */ });

  // 4) Forward UTM to destination if missing
  const dest = new URL(destAbs);
  if (utmSource && !dest.searchParams.has('utm_source')) dest.searchParams.set('utm_source', utmSource);
  if (utmMedium && !dest.searchParams.has('utm_medium')) dest.searchParams.set('utm_medium', utmMedium);
  if (utmCampaign && !dest.searchParams.has('utm_campaign')) dest.searchParams.set('utm_campaign', utmCampaign);

  const res = NextResponse.redirect(dest.toString(), 302);
  res.headers.set('Cache-Control', 'no-store');
  return res;
}