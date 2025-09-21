// lib/analytics.ts
import prisma from '@/lib/prisma';
import crypto from 'crypto';
import { cookies } from 'next/headers';
import type { NextRequest } from 'next/server';

// Don’t import EventType from @prisma/client.
// Use a local union so it works before prisma generate.
export type TrackEvent =
  | 'view'
  | 'lead_click'
  | 'contact_click'
  | 'favorite'
  | 'share';

function urlParam(u: URL, k: string) {
  const v = u.searchParams.get(k);
  return v === null ? undefined : v;
}

export function getClientMeta(req: NextRequest) {
  const h = req.headers;
  const ip = h.get('x-forwarded-for')?.split(',')[0]?.trim() || '';
  const userAgent = h.get('user-agent') || '';
  const referer = h.get('referer') || '';
  const u = new URL(req.url);

  return {
    ip,
    userAgent,
    referer,
    utmSource: urlParam(u, 'utm_source'),
    utmMedium: urlParam(u, 'utm_medium'),
    utmCampaign: urlParam(u, 'utm_campaign'),
  };
}

// Next 15 sometimes returns a Promise from cookies(); normalize it.
async function cookieStore() {
  const c = (cookies as any)();
  return typeof c?.then === 'function' ? await c : c;
}

export async function getOrSetSessionId() {
  const c = await cookieStore();
  let sid: string | undefined = c?.get?.('sid')?.value;

  if (!sid) {
    sid = crypto.randomUUID();
    try {
      c?.set?.('sid', sid, {
        httpOnly: true,
        sameSite: 'lax',
        maxAge: 60 * 60 * 24 * 365,
        path: '/',
      });
    } catch {
      // read-only cookie store in some contexts — ignore
    }
  }
  return sid!;
}

export async function logEvent(params: {
  listingId: string;
  channelId?: string | null;
  type: TrackEvent;
  req: NextRequest;
}) {
  const { listingId, channelId, type, req } = params;
  const { ip, userAgent, referer, utmSource, utmMedium, utmCampaign } = getClientMeta(req);
  const sessionId = await getOrSetSessionId();

  // Cast to any so TS doesn’t complain before prisma generate
  const db = prisma as any;

  return db.listingEvent.create({
    data: {
      listingId,
      channelId: channelId ?? null,
      type, // Prisma will validate against your enum at runtime
      ip,
      userAgent,
      referer,
      utmSource,
      utmMedium,
      utmCampaign,
      sessionId,
    },
  });
}