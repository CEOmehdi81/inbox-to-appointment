// app/admin/market/page.tsx
import prisma from '@/lib/prisma';

export const dynamic = 'force-dynamic';

type UrlSearchParams = { [key: string]: string | string[] | undefined };
type SearchParams = { q?: string; r?: string };

// simple haversine (meters)
function distM(a: { lat: number; lng: number }, b: { lat: number; lng: number }) {
  const R = 6371000;
  const dLat = ((b.lat - a.lat) * Math.PI) / 180;
  const dLng = ((b.lng - a.lng) * Math.PI) / 180;
  const lat1 = (a.lat * Math.PI) / 180;
  const lat2 = (b.lat * Math.PI) / 180;
  const s =
    Math.sin(dLat / 2) ** 2 +
    Math.sin(dLng / 2) ** 2 * Math.cos(lat1) * Math.cos(lat2);
  return 2 * R * Math.asin(Math.sqrt(s));
}

// tiny median helper
function median(nums: number[]) {
  if (nums.length === 0) return undefined;
  const s = [...nums].sort((a, b) => a - b);
  const mid = Math.floor(s.length / 2);
  return s.length % 2 ? s[mid] : (s[mid - 1] + s[mid]) / 2;
}

// normalize Next 15 searchParams (might be a Promise + string|string[])
function normalizeParams(raw: UrlSearchParams): SearchParams {
  const pick = (v: string | string[] | undefined) =>
    Array.isArray(v) ? v[0] : v;
  return { q: pick(raw.q), r: pick(raw.r) };
}

type Row = {
  id: string;
  portal: string;
  url: string;
  title: string;
  city: string | null;
  price: number | null;
  surfaceM2: number | null;
  rooms: number | null;
  latitude: number | null;
  longitude: number | null;
  createdAt: Date;
};

export default async function MarketPage(props: { searchParams: Promise<UrlSearchParams> }) {
  // ✅ Next.js 15 requires awaiting searchParams
  const sp = normalizeParams(await props.searchParams);
  const q = (sp.q || '').trim();
  const radius = Number(sp.r || '1500') || 1500; // meters

  // Geocode the area name (e.g., "Noisy-le-Grand")
  let center: { lat: number; lng: number; label: string } | null = null;
  if (q) {
    try {
      const url = new URL('https://nominatim.openstreetmap.org/search');
      url.searchParams.set('format', 'json');
      url.searchParams.set('limit', '1');
      url.searchParams.set('q', q);

      const res = await fetch(url.toString(), {
        headers: {
          'User-Agent': 'HOMI/0.1 (admin@homi.local)',
          Accept: 'application/json',
        },
        cache: 'no-store',
      });

      if (res.ok) {
        const arr = (await res.json()) as Array<any>;
        if (arr?.length) {
          center = {
            lat: Number(arr[0].lat),
            lng: Number(arr[0].lon),
            label: arr[0].display_name || q,
          };
        }
      }
    } catch {
      // ignore; we’ll show a friendly message below
    }
  }

  // Pull market listings from DB and filter by radius around the center
  let items: Row[] = [];
  if (center) {
    const all: Row[] = await prisma.marketListing.findMany({
      select: {
        id: true,
        portal: true,
        url: true,
        title: true,
        city: true,
        price: true,
        surfaceM2: true,
        rooms: true,
        latitude: true,
        longitude: true,
        createdAt: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    items = all.filter((m) => {
      if (m.latitude == null || m.longitude == null) return false;
      const d = distM(center!, { lat: m.latitude, lng: m.longitude });
      return d <= radius;
    });
  }

  // Compute quick stats
  const prices = items.map((x) => x.price!).filter((x): x is number => Number.isFinite(x));
  const ppms = items
    .map((x) => (x.price && x.surfaceM2 ? x.price / x.surfaceM2 : undefined))
    .filter((x): x is number => Number.isFinite(x as number));

  const stats = {
    total: items.length,
    medianPrice: median(prices),
    medianPpm2: median(ppms), // price per m2
    byRooms: (() => {
      const map = new Map<number, number>();
      for (const it of items) {
        if (it.rooms == null) continue;
        map.set(it.rooms, (map.get(it.rooms) || 0) + 1);
      }
      return Array.from(map.entries())
        .sort((a, b) => a[0] - b[0])
        .map(([rooms, count]) => ({ rooms, count }));
    })(),
  };

  return (
    <div className="space-y-4">
      {/* Search panel */}
      <div className="bg-[color:var(--brand-card)] border border-white/10 rounded-2xl p-4">
        <h2 className="text-lg font-semibold mb-2">Market Explorer</h2>
        <form className="flex flex-wrap items-center gap-3">
          <input
            name="q"
            defaultValue={q}
            placeholder="City / commune (e.g., Noisy-le-Grand)"
            className="rounded-lg bg-white/5 border border-white/10 px-3 py-2 text-sm w-[320px]"
          />
          <select
            name="r"
            defaultValue={String(radius)}
            className="rounded-lg bg-white/5 border border-white/10 px-3 py-2 text-sm"
          >
            <option value="1000">1 km</option>
            <option value="1500">1.5 km</option>
            <option value="2000">2 km</option>
            <option value="3000">3 km</option>
            <option value="5000">5 km</option>
          </select>
          <button className="rounded-lg bg-white/5 border border-white/10 px-3 py-2 text-sm hover:bg-white/10">
            Explore
          </button>
        </form>

        {!q && (
          <p className="text-sm text-gray-400 mt-3">
            Type a city/area name and press <em>Explore</em> to see market-wide listings in that radius.
          </p>
        )}
        {q && !center && (
          <p className="text-sm text-rose-300 mt-3">
            Couldn’t geocode <strong>{q}</strong>. Try a more specific name (e.g., “Noisy-le-Grand, France”).
          </p>
        )}
      </div>

      {/* Summary */}
      {center && (
        <div className="bg-[color:var(--brand-card)] border border-white/10 rounded-2xl p-4">
          <div className="flex items-center justify-between">
            <div className="text-sm text-gray-300">
              <div className="font-medium">{center.label}</div>
              <div className="text-gray-400">
                Radius: {(radius / 1000).toFixed(1)} km • Found <strong>{stats.total}</strong> listings
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
            <div className="rounded-xl border border-white/10 bg-white/5 p-4">
              <div className="text-xs text-gray-400">Median price</div>
              <div className="text-2xl font-semibold">
                {stats.medianPrice != null ? `${Math.round(stats.medianPrice).toLocaleString()} €` : '—'}
              </div>
            </div>
            <div className="rounded-xl border border-white/10 bg-white/5 p-4">
              <div className="text-xs text-gray-400">Median €/m²</div>
              <div className="text-2xl font-semibold">
                {stats.medianPpm2 != null ? `${Math.round(stats.medianPpm2).toLocaleString()} €/m²` : '—'}
              </div>
            </div>
            <div className="rounded-xl border border-white/10 bg-white/5 p-4">
              <div className="text-xs text-gray-400">Listings in area</div>
              <div className="text-2xl font-semibold">{stats.total}</div>
            </div>
          </div>

          <div className="mt-4 grid md:grid-cols-2 gap-4">
            <div className="rounded-xl border border-white/10 bg-white/5 p-4">
              <div className="text-sm font-medium mb-2">Mix by rooms</div>
              {stats.byRooms.length === 0 ? (
                <div className="text-sm text-gray-400">No room data yet.</div>
              ) : (
                <ul className="text-sm space-y-1">
                  {stats.byRooms.map((r) => (
                    <li key={r.rooms} className="flex items-center justify-between">
                      <span className="text-gray-300">
                        {r.rooms} room{r.rooms > 1 ? 's' : ''}
                      </span>
                      <span className="text-gray-100">{r.count}</span>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            <div className="rounded-xl border border-white/10 bg-white/5 p-4">
              <div className="text-sm font-medium mb-2">What powers this?</div>
              <p className="text-sm text-gray-400">
                This view aggregates <strong>MarketListing</strong> rows you or partners import (CSV/API).
                Add more listings data to improve coverage. Next, we’ll add charts & nearby amenities.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Results table */}
      {center && (
        <div className="bg-[color:var(--brand-card)] border border-white/10 rounded-2xl p-0 overflow-hidden">
          <div className="px-4 py-3 border-b border-white/10">
            <div className="text-sm font-medium">Listings in radius</div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="text-xs text-gray-400 bg-white/5">
                <tr>
                  <th className="text-left px-4 py-3">Title</th>
                  <th className="text-left px-4 py-3">Portal</th>
                  <th className="text-left px-4 py-3">City</th>
                  <th className="text-left px-4 py-3">Price</th>
                  <th className="text-left px-4 py-3">m²</th>
                  <th className="text-left px-4 py-3">Rooms</th>
                  <th className="text-left px-4 py-3">Link</th>
                </tr>
              </thead>
              <tbody>
                {items.length === 0 && (
                  <tr>
                    <td colSpan={7} className="px-4 py-10 text-center text-gray-400">
                      No data yet. Import market listings (CSV/API) to populate this area.
                    </td>
                  </tr>
                )}
                {items.map((it, i) => (
                  <tr key={it.id} className={i % 2 ? 'bg-white/[0.02]' : ''}>
                    <td className="px-4 py-3">{it.title}</td>
                    <td className="px-4 py-3 text-gray-300">{it.portal}</td>
                    <td className="px-4 py-3 text-gray-300">{it.city || '—'}</td>
                    <td className="px-4 py-3">{it.price != null ? `${it.price.toLocaleString()} €` : '—'}</td>
                    <td className="px-4 py-3">{it.surfaceM2 ?? '—'}</td>
                    <td className="px-4 py-3">{it.rooms ?? '—'}</td>
                    <td className="px-4 py-3">
                      <a href={it.url} target="_blank" className="text-blue-400 hover:underline">
                        Open
                      </a>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}