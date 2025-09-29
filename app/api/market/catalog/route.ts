// app/api/market/catalog/route.ts
import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// CORS + JSON helper
function json(data: unknown, status = 200) {
  return NextResponse.json(data, {
    status,
    headers: {
      'Access-Control-Allow-Origin': '*',
      Vary: 'Origin',
    },
  });
}

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    },
  });
}

// Common fetcher -> ALWAYS calls n8n with GET
async function fetchFromN8N(country?: string | null) {
  const base = process.env.N8N_URL?.replace(/\/$/, '');
  if (!base) {
    throw new Error('Missing N8N_URL in environment (.env.local)');
  }
  const qs = country && country.trim()
    ? `?country=${encodeURIComponent(country.trim())}`
    : '';
  const url = `${base}/api/market/catalog${qs}`;

  const res = await fetch(url, {
    method: 'GET',
    headers: { Accept: 'application/json' },
    cache: 'no-store',
  });

  const text = await res.text();
  let data: any = null;
  try { data = text ? JSON.parse(text) : {}; } catch { /* fallthrough */ }

  if (!res.ok) {
    const detail = data?.error || data?.detail || text || `HTTP ${res.status}`;
    throw new Error(detail);
  }
  return data;
}

// Normalizer: accept either { portals } or { countries: [...] }
function normalize(resp: any) {
  if (resp?.portals && Array.isArray(resp.portals)) return resp.portals;
  if (resp?.countries && Array.isArray(resp.countries)) {
    return resp.countries.flatMap((c: any) =>
      (c.portals || []).map((p: any) => ({ ...p, country: p.country ?? c.country })),
    );
  }
  return [];
}

// GET /api/market/catalog?country=France  or empty for global
export async function GET(req: NextRequest) {
  try {
    const url = new URL(req.url);
    const country = url.searchParams.get('country');
    const raw = await fetchFromN8N(country);
    const portals = normalize(raw);
    return json({ portals });
  } catch (err: any) {
    return json({ error: err?.message ?? 'catalog failed' }, 500);
  }
}

// POST /api/market/catalog  with body: { country?: string }
export async function POST(req: NextRequest) {
  try {
    const body = (await req.json().catch(() => ({}))) as { country?: string };
    const raw = await fetchFromN8N(body.country ?? null);
    const portals = normalize(raw);
    return json({ portals });
  } catch (err: any) {
    return json({ error: err?.message ?? 'catalog failed' }, 500);
  }
}