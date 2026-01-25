'use client';

import { useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';

type InspectResp = {
  ok: boolean;
  ts: string; // ISO timestamp from /api/market/inspect
};

const INTERVAL_MS =
  Number(process.env.NEXT_PUBLIC_REFRESH_INTERVAL_MS ?? 5000); // 5s default

export default function RefreshOnIngest() {
  const router = useRouter();
  const lastTsRef = useRef<string | null>(null);
  const timerRef = useRef<number | null>(null);

  useEffect(() => {
    let stopped = false;

    const tick = async () => {
      try {
        const res = await fetch('/api/market/inspect', { cache: 'no-store' });
        if (!res.ok) return; // be silent if endpoint temporarily errors
        const data = (await res.json()) as InspectResp;

        if (data?.ok && data.ts) {
          // First run: capture baseline TS
          if (!lastTsRef.current) {
            lastTsRef.current = data.ts;
          } else if (data.ts !== lastTsRef.current) {
            // TS changed => new ingest happened => refresh
            lastTsRef.current = data.ts;
            router.refresh();
          }
        }
      } catch {
        // ignore transient network errors
      } finally {
        if (!stopped) {
          timerRef.current = window.setTimeout(tick, INTERVAL_MS);
        }
      }
    };

    // Only poll when tab is visible; pause when hidden
    const onVis = () => {
      if (document.hidden) {
        if (timerRef.current) window.clearTimeout(timerRef.current);
        timerRef.current = null;
      } else {
        if (!timerRef.current) tick();
      }
    };

    document.addEventListener('visibilitychange', onVis);
    tick();

    return () => {
      stopped = true;
      document.removeEventListener('visibilitychange', onVis);
      if (timerRef.current) window.clearTimeout(timerRef.current);
    };
  }, [router]);

  return null;
}