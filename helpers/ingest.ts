// helpers/ingest.ts
export function normalizeUrl(raw: string): string {
  const s = String(raw ?? '').trim();
  if (!s) return '';

  // If there is no scheme, assume https so URL() can parse it
  let candidate = s;
  if (!/^[a-zA-Z][a-zA-Z\d+\-.]*:\/\//.test(candidate)) {
    candidate = 'https://' + candidate;
  }

  try {
    const u = new URL(candidate);

    // Lowercase protocol/host and drop common fluff
    u.protocol = u.protocol.toLowerCase();
    u.hostname = u.hostname.replace(/^www\./i, '').toLowerCase();

    // Remove tracking/query + fragments
    u.search = '';
    u.hash = '';

    // Drop default ports
    if ((u.protocol === 'http:' && u.port === '80') || (u.protocol === 'https:' && u.port === '443')) {
      u.port = '';
    }

    // Normalize path: collapse // and trim trailing slash (except root)
    u.pathname = u.pathname.replace(/\/{2,}/g, '/');
    if (u.pathname.length > 1 && u.pathname.endsWith('/')) {
      u.pathname = u.pathname.slice(0, -1);
    }

    return u.toString();
  } catch {
    // Fallback: strip ? and #, then trim trailing slash
    const base = s.split('#')[0].split('?')[0];
    return base.endsWith('/') ? base.slice(0, -1) : base;
  }
}