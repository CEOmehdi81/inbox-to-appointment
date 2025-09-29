'use client';

import { useEffect, useRef, useState } from 'react';
import GlobeImpl from 'react-globe.gl';

type Pt = { lat: number; lng: number; size?: number; portal?: string };

export default function Globe({ points }: { points: Pt[] }) {
  const ref = useRef<any>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    // auto-rotate nice & slow
    el.controls().autoRotate = true;
    el.controls().autoRotateSpeed = 0.6;
    el.pointAltitude((d: Pt) => (d.size ?? 0.6) / 200);
    el.pointColor(() => '#7C5CFF'); // brand primary glow
    setReady(true);
  }, []);

  return (
    <div className="w-full h-[540px] md:h-[700px]">
      <GlobeImpl
        ref={ref}
        width={undefined}
        height={undefined}
        backgroundColor="rgba(0,0,0,0)"
        globeImageUrl="//unpkg.com/three-globe/example/img/earth-night.jpg"
        pointsData={points}
        atmosphereColor="#7C5CFF"
        atmosphereAltitude={0.25}
      />
      {!ready && <div className="text-center text-sm opacity-60 mt-2">Loading globe…</div>}
    </div>
  );
}