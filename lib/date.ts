/** Returns "YYYY-MM" in local/UTC neutral way (uses provided Date). */
export function ymKey(d: Date): string {
  const y = d.getUTCFullYear();
  const m = String(d.getUTCMonth() + 1).padStart(2, "0");
  return `${y}-${m}`;
}

/** True if ISO date is in YYYY-MM month. */
export function isInMonth(iso: string, month: string): boolean {
  return iso.slice(0, 7) === month;
}

/** Days between now (or pivot) and ISO date (floor). */
export function daysSince(iso: string, pivot: Date = new Date()): number {
  const ms = pivot.getTime() - new Date(iso).getTime();
  return Math.max(0, Math.floor(ms / (1000 * 60 * 60 * 24)));
}

/** ISO string for N days ago from pivot. */
export function daysAgoIso(days: number, pivot: Date = new Date()): string {
  const d = new Date(pivot);
  d.setUTCDate(d.getUTCDate() - days);
  return d.toISOString();
}
