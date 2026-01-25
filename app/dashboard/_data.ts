// app/dashboard/_data.ts
import { headers } from "next/headers";

export type MetricsResponse = {
  month: string;
  prevMonth: string;
  leadsCard: Array<{ portal: string; leads: number; deltaPct: number | null }>;
  cplCard: Array<{ portal: string; cpl: number | "—"; deltaPct: number | null; best?: boolean; worst?: boolean }>;
  listingsTable: Array<{
    title: string;
    portal: string;
    leads_7d: number;
    days_since_listed: number;
    health_score: number;
    flag_underperforming: boolean;
  }>;
  insight: string;
};

// Build an absolute base URL for server fetches.
// Priority: explicit env → request headers (Next 15: headers() is async) → localhost fallback.
async function resolveBaseUrl(): Promise<string> {
  if (process.env.NEXT_PUBLIC_BASE_URL) return process.env.NEXT_PUBLIC_BASE_URL;
  const h = await headers();
  const host = h.get("x-forwarded-host") ?? h.get("host") ?? "localhost:3001";
  const proto = h.get("x-forwarded-proto") ?? "http";
  return `${proto}://${host}`;
}

export async function getMetrics(month: string): Promise<MetricsResponse> {
  const base = await resolveBaseUrl();
  const url = `${base}/api/metrics?month=${encodeURIComponent(month)}`;
  const res = await fetch(url, { cache: "no-store" });
  if (!res.ok) throw new Error(`metrics fetch failed: ${res.status}`);
  return res.json();
}