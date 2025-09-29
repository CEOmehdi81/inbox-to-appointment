'use client';

import { useEffect } from 'react';

type EventType =
  | 'view'
  | 'lead_click'
  | 'contact_click'
  | 'download'
  | 'favorite'
  | 'share_open'
  | 'share_download';

type Props = {
  listingId: string;
  channelId?: string; // e.g. "website", "seloger", etc.
};

export default function HomiTracker({ listingId, channelId = 'website' }: Props) {
  // fire a "view" once on mount
  useEffect(() => {
    const payload = {
      listingId,
      channelId,
      type: 'view' as EventType,
      href: typeof window !== 'undefined' ? window.location.href : '',
    };

    fetch('/api/track', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(payload),
      keepalive: true,
    }).catch(() => {});
  }, [listingId, channelId]);

  // delegate clicks for any element with data-homi="<eventType>"
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      const el = (e.target as HTMLElement)?.closest<HTMLElement>('[data-homi]');
      if (!el) return;

      const t = el.getAttribute('data-homi') as EventType | null;
      if (!t) return;

      const payload = {
        listingId,
        channelId,
        type: t,
        href: window.location.href,
      };

      if (navigator.sendBeacon) {
        const blob = new Blob([JSON.stringify(payload)], {
          type: 'application/json',
        });
        navigator.sendBeacon('/api/track', blob);
      } else {
        fetch('/api/track', {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify(payload),
          keepalive: true,
        }).catch(() => {});
      }
    };

    document.addEventListener('click', handler, true);
    return () => document.removeEventListener('click', handler, true);
  }, [listingId, channelId]);

  return null;
}