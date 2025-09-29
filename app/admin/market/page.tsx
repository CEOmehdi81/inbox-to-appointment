'use client';

export const dynamic = 'force-dynamic';

import { useEffect, useMemo, useState } from 'react';

type Portal = {
  country: string;
  name: string;
  url: string;
  type: 'rent' | 'sale' | 'both';
  notes?: string | null;
};

// Accepts { items }, { portals }, or { countries: [{ country, portals: [...] }] }
function normalize(resp: any): Portal[] {
  if (Array.isArray(resp?.items)) return resp.items as Portal[];
  if (Array.isArray(resp?.portals)) return resp.portals as Portal[];
  if (Array.isArray(resp?.countries)) {
    return resp.countries.flatMap((c: any) =>
      (c?.portals ?? []).map((p: any) => ({
        ...p,
        country: p.country ?? c.country,
      })),
    );
  }
  return [];
}

export default function MarketPage() {
  const [country, setCountry] = useState<string>('France');
  const [portals, setPortals] = useState<Portal[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const count = useMemo(() => portals.length, [portals]);

  // --- helpers ---------------------------------------------------------------

  async function getJSON(url: string, init?: RequestInit) {
    const res = await fetch(url, { cache: 'no-store', ...init, headers: { Accept: 'application/json', ...(init?.headers || {}) } });
    if (!res.ok) {
      // try to surface API error body if any
      let msg = `HTTP ${res.status} ${res.statusText}`;
      try {
        const t = await res.text();
        if (t) msg += ` – ${t.slice(0, 200)}`;
      } catch {}
      throw new Error(msg);
    }
    // robust JSON parse
    try {
      return await res.json();
    } catch {
      const t = await res.text();
      throw new Error(`Non-JSON/empty response: ${t.slice(0, 200)}`);
    }
  }

  async function fetchCatalog(selectedCountry: string) {
    setLoading(true);
    setError(null);
    setNotice(null);
    try {
      const q = selectedCountry.trim()
        ? `?country=${encodeURIComponent(selectedCountry.trim())}`
        : '';
      // GET same-origin to avoid CORS/preflight
      const data = await getJSON(`/api/market/catalog${q}`);
      setPortals(normalize(data));
      setNotice('Fetched portals.');
    } catch (e: any) {
      setError(e?.message ?? String(e));
      setPortals([]);
    } finally {
      setLoading(false);
    }
  }

  function toCSV(rows: Portal[]) {
    const esc = (v: unknown) => `"${String(v ?? '').replace(/"/g, '""')}"`;
    const header = ['country', 'name', 'url', 'type', 'notes'].map(esc).join(',');
    const lines = rows.map((r) => [r.country, r.name, r.url, r.type, r.notes ?? ''].map(esc).join(','));
    return [header, ...lines].join('\n');
  }

  async function exportCSV(rows: Portal[], label: string) {
    const csv = toCSV(rows);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `portals_${label || 'global'}.csv`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  }

  // DB helpers (these match your existing endpoints)
  async function loadFromDB(selectedCountry: string) {
    setLoading(true);
    setError(null);
    setNotice(null);
    try {
      const q = selectedCountry.trim()
        ? `?country=${encodeURIComponent(selectedCountry.trim())}`
        : '';
      const data = await getJSON(`/api/market/catalog/from-db${q}`);
      setPortals(normalize(data));
      setNotice('Loaded from database.');
    } catch (e: any) {
      setError(e?.message ?? String(e));
      setPortals([]);
    } finally {
      setLoading(false);
    }
  }

  async function saveToDB() {
    setLoading(true);
    setError(null);
    setNotice(null);
    try {
      const data = await getJSON('/api/market/catalog/save', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ portals }),
      });
      // if API returns something informative, you could surface it here
      setNotice('Saved to database.');
    } catch (e: any) {
      setError(e?.message ?? String(e));
    } finally {
      setLoading(false);
    }
  }

  // initial fetch
  useEffect(() => {
    fetchCatalog(country);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // --- UI --------------------------------------------------------------------

  return (
    <div className="p-6 space-y-6">
      <div className="bg-[color:var(--brand-card)] border border-white/10 rounded-2xl p-4">
        <h2 className="text-lg font-semibold mb-3">Portal Catalog</h2>

        <div className="flex flex-wrap items-end gap-3">
          <div className="flex flex-col">
            <label className="text-sm opacity-80 mb-1">Country (optional)</label>
            <input
              className="px-3 py-2 rounded bg-white/5 border border-white/10 outline-none w-80"
              placeholder="e.g. France — leave empty for global"
              value={country}
              onChange={(e) => setCountry(e.target.value)}
            />
          </div>

          <button
            onClick={() => fetchCatalog(country)}
            className="px-4 py-2 rounded bg-white text-black hover:opacity-90 disabled:opacity-50"
            disabled={loading}
          >
            {loading ? 'Working…' : 'Fetch portals'}
          </button>

          <button
            onClick={() => {
              setCountry('');
              fetchCatalog('');
            }}
            className="px-3 py-2 rounded border border-white/20 hover:bg-white/10 disabled:opacity-50"
            disabled={loading}
          >
            Global
          </button>

          <button
            onClick={() => loadFromDB(country)}
            className="px-3 py-2 rounded border border-white/20 hover:bg-white/10 disabled:opacity-50"
            disabled={loading}
            title="Load existing catalog entries from your database"
          >
            Load from DB
          </button>

          <button
            onClick={saveToDB}
            className="px-3 py-2 rounded border border-white/20 hover:bg-white/10 disabled:opacity-50"
            disabled={loading || portals.length === 0}
            title="Persist current results into your database"
          >
            Save to DB
          </button>

          <button
            onClick={() => exportCSV(portals, country.trim())}
            className="px-3 py-2 rounded border border-white/20 hover:bg-white/10 disabled:opacity-50"
            disabled={loading || portals.length === 0}
            title="Download current results as CSV"
          >
            Export CSV
          </button>

          <button
            onClick={async () => {
              try {
                await navigator.clipboard.writeText(JSON.stringify(portals, null, 2));
                setNotice('JSON copied to clipboard.');
              } catch {
                const blob = new Blob([JSON.stringify(portals, null, 2)], { type: 'application/json' });
                const url = URL.createObjectURL(blob);
                window.open(url, '_blank');
              }
            }}
            className="px-3 py-2 rounded border border-white/20 hover:bg-white/10 disabled:opacity-50"
            disabled={loading || portals.length === 0}
            title="Copy current results as JSON"
          >
            Copy JSON
          </button>

          <div className="opacity-70 text-sm ml-auto">{count} portals</div>
        </div>

        {error && (
          <div className="mt-3 text-red-400 border border-red-400/40 rounded p-3">
            Error: {error}
          </div>
        )}
        {notice && !error && (
          <div className="mt-3 text-emerald-300 border border-emerald-400/30 rounded p-3">
            {notice}
          </div>
        )}
      </div>

      <div className="bg-[color:var(--brand-card)] border border-white/10 rounded-2xl overflow-hidden">
        <div className="px-4 py-3 border-b border-white/10">
          <div className="text-sm font-medium">Results</div>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead className="text-left opacity-70">
              <tr>
                <th className="py-2 px-4">Country</th>
                <th className="py-2 px-4">Name</th>
                <th className="py-2 px-4">Type</th>
                <th className="py-2 px-4">Notes</th>
              </tr>
            </thead>
            <tbody>
              {!loading && portals.length === 0 && (
                <tr>
                  <td colSpan={4} className="px-4 py-10 text-center opacity-70">
                    No results yet.
                  </td>
                </tr>
              )}
              {portals.map((p, i) => (
                <tr key={`${p.url}-${i}`} className={i % 2 ? 'bg-white/[0.02]' : ''}>
                  <td className="py-2 px-4">{p.country}</td>
                  <td className="py-2 px-4">
                    <a href={p.url} className="underline hover:no-underline" target="_blank" rel="noreferrer">
                      {p.name}
                    </a>
                  </td>
                  <td className="py-2 px-4">{p.type}</td>
                  <td className="py-2 px-4 opacity-80">{p.notes ?? ''}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}