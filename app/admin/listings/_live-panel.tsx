'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import Globe from 'react-globe.gl';

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
  portals?: number;
};

export default function LivePanel() {
  const globeRef = useRef<any>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const [cards, setCards] = useState<Card[]>([]);
  const [points, setPoints] = useState<MapPoint[]>([]);
  const [globeSize, setGlobeSize] = useState<number>(0);

  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [hoveredId, setHoveredId] = useState<string | null>(null);

  // keep canvas perfectly centered & circular
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const ro = new ResizeObserver((entries) => {
      const r = entries[0].contentRect;
      setGlobeSize(Math.floor(Math.min(r.width, r.height)));
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  // load left cards + globe points
  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const [cardsRes, pointsRes] = await Promise.all([
          fetch('/api/listings/cards', { cache: 'no-store' }).then((r) => r.json()),
          fetch('/api/listings/map-points', { cache: 'no-store' }).then((r) => r.json()),
        ]);
        if (!alive) return;
        setCards(Array.isArray(cardsRes?.items) ? cardsRes.items : []);
        setPoints(Array.isArray(pointsRes?.points) ? pointsRes.points : []);
      } catch {
        // ignore
      }
    })();
    return () => {
      alive = false;
    };
  }, []);

  // gentle autorotate + initial POV
  useEffect(() => {
    const g = globeRef.current;
    if (!g) return;
    try {
      g.controls().autoRotate = true;
      g.controls().autoRotateSpeed = 0.6;
      g.pointOfView({ lat: 30, lng: 5, altitude: 2.05 }, 1000);
    } catch {}
  }, [globeSize]);

  // highlight on hover/selection
  const filteredPoints = useMemo(() => {
    if (!hoveredId) return points;
    return points.map((p) =>
      p.id === hoveredId ? { ...p, size: (p.size ?? 1) + 1 } : p,
    );
  }, [points, hoveredId]);

  const pointColor = useMemo(
    () => (obj: any) =>
      obj?.id === selectedId
        ? 'rgba(251,191,36,0.95)' // amber-400
        : 'rgba(129,140,248,0.85)', // indigo-400
    [selectedId],
  );
  const pointRadius = useMemo(() => (obj: any) => 0.9 + (obj?.size ?? 1) * 0.6, []);
  const pointAltitude = useMemo(
    () => (obj: any) => 0.012 + Math.min(obj?.size ?? 1, 3) * 0.01,
    [],
  );

  const onPointClick = (p: any) => {
    setSelectedId(p?.id ?? null);
    const el = document.getElementById(`card-${p?.id}`);
    el?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
      {/* Left column: listing cards */}
      <div className="space-y-3">
        {cards.length === 0 && (
          <div className="rounded-xl border border-white/10 bg-white/5 p-4 text-sm opacity-75">
            No listings yet.
          </div>
        )}

        {cards.map((c) => (
          <div
            key={c.id}
            id={`card-${c.id}`}
            onMouseEnter={() => setHoveredId(c.id)}
            onMouseLeave={() => setHoveredId((h) => (h === c.id ? null : h))}
            className={[
              'rounded-xl border bg-white/5 p-4 transition-colors',
              hoveredId === c.id || selectedId === c.id
                ? 'border-amber-400/40'
                : 'border-white/10',
            ].join(' ')}
          >
            <div className="text-sm font-medium">{c.title}</div>
            <div className="text-xs opacity-70">{c.city ?? '—'}</div>
            <div className="text-xs mt-1 opacity-70">portals: {c.portals ?? 0}</div>
          </div>
        ))}
      </div>

      {/* Right: centered circular globe (spans 2 columns) */}
      <div className="lg:col-span-2">
        <div className="relative h-[520px] rounded-xl border border-white/10 overflow-hidden">
          {/* Soft halo behind the sphere */}
          <div className="pointer-events-none absolute inset-0 grid place-items-center">
            <div className="rounded-full w-[82%] aspect-square bg-[radial-gradient(circle_at_center,rgba(59,130,246,0.18),transparent_70%)]" />
          </div>

          {/* Hard-centered, circular canvas */}
          <div ref={containerRef} className="absolute inset-0 grid place-items-center">
            <div
              className="relative aspect-square rounded-full overflow-hidden"
              style={{ width: globeSize || undefined }}
            >
              <Globe
                ref={globeRef}
                width={globeSize || undefined}
                height={globeSize || undefined}
                backgroundColor="rgba(0,0,0,0)" // transparent — no edges while zooming
                globeImageUrl="//unpkg.com/three-globe/example/img/earth-dark.jpg"
                pointsData={filteredPoints as any}
                pointLat="lat"
                pointLng="lng"
                pointLabel="label"
                pointColor={pointColor as any}
                pointRadius={pointRadius as any}
                pointAltitude={pointAltitude as any}
                rendererConfig={{ alpha: true, antialias: true }}
                onPointClick={onPointClick as any}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}