// components/CodeWatermarkViewer.tsx
'use client';

import { useEffect, useState } from 'react';

export default function CodeWatermarkViewer({
  shareId,
  pdfUrl,
}: {
  shareId: string;
  pdfUrl: string;
}) {
  const [code, setCode] = useState<string>('••••••');
  const [refreshIn, setRefreshIn] = useState<number>(0);

  useEffect(() => {
    let refreshTimer: ReturnType<typeof setTimeout>;
    let tick: ReturnType<typeof setInterval>;

    async function load() {
      try {
        const res = await fetch(`/api/appointments/doc/${shareId}/code`, {
          cache: 'no-store',
        });
        const json = await res.json(); // { code, expiresInMs }
        setCode(json.code);
        setRefreshIn(Math.floor(json.expiresInMs / 1000));
        clearTimeout(refreshTimer);
        refreshTimer = setTimeout(load, Math.max(1000, json.expiresInMs - 500));
      } catch {
        refreshTimer = setTimeout(load, 5000);
      }
    }

    load();
    tick = setInterval(() => setRefreshIn((s) => (s > 0 ? s - 1 : 0)), 1000);

    return () => {
      clearTimeout(refreshTimer);
      clearInterval(tick);
    };
  }, [shareId]);

  const pos = positionFromCode(code);

  return (
    <div className="relative w-full h-[calc(100vh-140px)] rounded-xl overflow-hidden border border-white/10 bg-black/20">
      <iframe
        src={pdfUrl}
        className="absolute inset-0 w-full h-full bg-black"
        title="Document"
      />
      <div
        className="pointer-events-none absolute px-3 py-1 rounded-md text-xs font-mono tracking-wider"
        style={{
          top: pos.top,
          left: pos.left,
          transform: 'rotate(-12deg)',
          background: 'rgba(0,0,0,0.35)',
          color: 'rgba(255,255,255,0.85)',
          boxShadow: '0 0 0 1px rgba(255,255,255,0.15) inset',
        }}
      >
        code: {code} · refreshes in {refreshIn}s
      </div>
    </div>
  );
}

function positionFromCode(code: string) {
  const hash = [...code].reduce((a, c) => (a * 33 + c.charCodeAt(0)) % 1000, 1);
  const topPct = 10 + (hash % 70);                 // 10–80%
  const leftPct = 10 + (Math.floor(hash / 7) % 70);
  return { top: `${topPct}%`, left: `${leftPct}%` };
}