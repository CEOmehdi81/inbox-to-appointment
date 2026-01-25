'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import dynamic from 'next/dynamic';

// ⬅️ critical: load the Globe only on the client
const Globe = dynamic(() => import('react-globe.gl'), { ssr: false });

type MapPoint = {
  id: string;
  lat: number;
  lng: number;
  size?: number;
  label?: string;
};

type Card = {
  id: string;
  title: string;
  city?: string | null;
  price?: number | null;
  imageUrl?: string | null;
  portalsCount?: number;
  portals?: Array<{ portal: string; url: string }>;
};

export default function LivePanelClient() {
  const globeRef = useRef<any>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const [globeSize, setGlobeSize] = useState(0);
  const [cards, setCards] = useState<Card[]>([]);
  const [points, setPoints] = useState<MapPoint[]>([]);

  // keep the globe perfectly centered (square)
  useEffect(() => {
    // ResizeObserver is browser-only; guard just in case
    if (typeof window === 'undefined' || !containerRef.current) return;

    const el = containerRef.current;
    const ro = new ResizeObserver((entries) => {
      const r = entries[0].contentRect;
      setGlobeSize(Math.floor(Math.min(r.width, r.height)));
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  // fetch cards + map points from the market endpoints
  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const [cRes, pRes] = await Promise.all([
          fetch('/api/market/listings/cards', { cache: 'no-store' }),
          fetch('/api/market/listings/map-points', { cache: 'no-store' }),
        ]);

        const [cardsJson, pointsJson] = await Promise.all([
          cRes.ok ? cRes.json() : null,
          pRes.ok ? pRes.json() : null,
        ]);

        if (!alive) return;

        if (!cRes.ok || !pRes.ok) {
          console.warn('LivePanel fetch failed', {
            cardsStatus: cRes.status,
            pointsStatus: pRes.status,
            cardsJson,
            pointsJson,
          });
        }

        setCards(Array.isArray(cardsJson?.items) ? cardsJson.items : []);
        setPoints(Array.isArray(pointsJson?.points) ? pointsJson.points : []);
      } catch (err) {
        console.error('LivePanel load error', err);
        if (alive) {
          setCards([]);
          setPoints([]);
        }
      }
    })();
    return () => {
      alive = false;
    };
  }, []);

  // gentle autorotate + initial POV (only after Globe exists)
  useEffect(() => {
    const g = globeRef.current;
    if (!g || !globeSize) return;
    try {
      const controls = g.controls?.();
      if (controls) {
        controls.autoRotate = true;
        controls.autoRotateSpeed = 0.6;
      }
      g.pointOfView?.({ lat: 30, lng: 5, altitude: 2.1 }, 1000);
    } catch {
      /* noop */
    }
  }, [globeSize]);

  const pointColor = useMemo(() => (_d: MapPoint) => 'rgba(129,140,248,0.85)', []);
  const pointRadius = useMemo(() => (d: MapPoint) => 0.8 + (d?.size ?? 1) * 0.6, []);
  const pointAltitude = useMemo(
    () => (d: MapPoint) => 0.01 + Math.min(d?.size ?? 1, 3) * 0.01,
    [],
  );

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
      {/* Left: listing cards */}
      <div className="space-y-3">
        {cards.length === 0 && (
          <div className="rounded-xl border border-white/10 bg-white/5 p-4 text-sm opacity-75">
            No listings yet.
          </div>
        )}

        {cards.map((c) => (
          <div key={c.id} className="rounded-xl border border-white/10 bg-white/5 p-3 flex gap-3">
            {c.imageUrl ? (
              <img
                src={c.imageUrl}
                alt={c.title}
                className="w-20 h-16 rounded object-cover border border-white/10"
                loading="lazy"
                decoding="async"
              />
            ) : (
              <div className="w-20 h-16 rounded bg-white/5 border border-white/10" />
            )}

            <div className="min-w-0">
              <div className="text-sm font-medium truncate">{c.title}</div>
              <div className="text-xs opacity-70 truncate">
                {c.city ?? '—'} {typeof c.price === 'number' ? ` • ${c.price}` : ''}
              </div>
              <div className="text-xs mt-1 opacity-70">portals: {c.portalsCount ?? 0}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Right: globe */}
      <div className="lg:col-span-2">
        <div className="relative h-[520px] rounded-xl border border-white/10 overflow-hidden">
          {/* keep it a square so the sphere is truly centered */}
          <div ref={containerRef} className="absolute inset-0 grid place-items-center">
            <div className="aspect-square" style={{ width: globeSize || undefined }}>
              <Globe
                ref={globeRef}
                width={globeSize || undefined}
                height={globeSize || undefined}
                backgroundColor="rgba(0,0,0,0)"
                globeImageUrl="//unpkg.com/three-globe/example/img/earth-dark.jpg"
                pointsData={points}
                pointLat="lat"
                pointLng="lng"
                pointLabel="label"
                pointColor={pointColor as any}
                pointRadius={pointRadius as any}
                pointAltitude={pointAltitude as any}
                rendererConfig={{ alpha: true, antialias: true }}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}