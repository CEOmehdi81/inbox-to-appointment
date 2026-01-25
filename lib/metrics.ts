import type { Listing, Lead, Spend, Dashboard, LeadsByPortal, CplByPortal } from "./types";
import { HEALTH, type HealthConfig } from "../config/health";
import { isInMonth, daysAgoIso, daysSince, ymKey } from "./date";

/** Count leads by portal for a month (YYYY-MM). */
export function leadsByPortal(leads: Lead[], month: string): LeadsByPortal {
  const out: LeadsByPortal = {};
  for (const l of leads) {
    if (!isInMonth(l.created_at, month)) continue;
    out[l.portal] = (out[l.portal] ?? 0) + 1;
  }
  return out;
}

/** CPL by portal for a month (uses matching spend + leads in same month). */
export function cplByPortal(spend: Spend[], leads: Lead[], month: string): CplByPortal {
  const spendByPortal: Record<string, number> = {};
  for (const s of spend) {
    if (s.month === month) spendByPortal[s.portal] = (spendByPortal[s.portal] ?? 0) + Number(s.amount);
  }
  const leadsBy = leadsByPortal(leads, month);
  const portals = new Set([...Object.keys(spendByPortal), ...Object.keys(leadsBy)]);
  const out: CplByPortal = {};
  for (const p of portals) {
    const amt = spendByPortal[p] ?? 0;
    const n = leadsBy[p] ?? 0;
    out[p] = n === 0 ? "—" : +(amt / n).toFixed(2);
  }
  return out;
}

/** Leads for a listing in the last 7 days from pivot. */
export function leadsLast7dForListing(leads: Lead[], listingId: string, pivot = new Date()): number {
  const sinceIso = daysAgoIso(7, pivot);
  let n = 0;
  for (const l of leads) {
    if (l.listing_id !== listingId) continue;
    if (l.created_at >= sinceIso) n++;
  }
  return n;
}

/** Days since listed; if missing, default to 30. */
export function daysSinceListed(listing: Listing, pivot = new Date()): number {
  if (listing.listed_at) return daysSince(listing.listed_at, pivot);
  return 30;
}

/** Days since last lead for a listing; null if never. */
export function daysSinceLastLead(leads: Lead[], listingId: string, pivot = new Date()): number | null {
  let latest: string | null = null;
  for (const l of leads) {
    if (l.listing_id !== listingId) continue;
    if (!latest || l.created_at > latest) latest = l.created_at;
  }
  return latest ? daysSince(latest, pivot) : null;
}

/** Health score (0–100) using simple weights only. */
export function healthScoreSimple(
  leads7d: number,
  daysSinceLastLeadValue: number | null,
  cfg: HealthConfig = HEALTH
): number {
  const v = Math.min(leads7d / cfg.weekStrongLeadTarget, 1) * 100; // LeadVelocityScore
  const r =
    daysSinceLastLeadValue == null
      ? 0
      : Math.max(0, 1 - daysSinceLastLeadValue / cfg.recencyWindowDays) * 100; // RecencyScore
  const score = cfg.simpleWeights.leadVelocity * v + cfg.simpleWeights.recency * r;
  return Math.round(score);
}

/** Underperforming rule. */
export function isUnderperforming(
  health: number,
  daysSinceLastLeadValue: number | null,
  cfg: HealthConfig = HEALTH
): boolean {
  return (
    health < cfg.underperformingThreshold ||
    daysSinceLastLeadValue == null ||
    daysSinceLastLeadValue >= cfg.recencyWindowDays
  );
}

/** Δ% helper: (curr - prev) / prev * 100; null if prev is 0 or missing. */
function deltaPct(curr: number | "—", prev: number | "—"): number | null {
  if (curr === "—" || prev === "—") return null;
  if (prev === 0) return null;
  return ((curr - prev) / prev) * 100;
}

/** Build normalized data for the dashboard cards/table/insight. */
export function buildDashboard(
  listings: Listing[],
  leads: Lead[],
  spend: Spend[],
  month: string,
  prevMonth: string
): Dashboard {
  // Card 1 — Leads by portal (+ delta)
  const leadsCurr = leadsByPortal(leads, month);
  const leadsPrev = leadsByPortal(leads, prevMonth);
  const portalsForLeads = new Set([...Object.keys(leadsCurr), ...Object.keys(leadsPrev)]);
  const leadsCard = [...portalsForLeads].map((p) => ({
    portal: p,
    leads: leadsCurr[p] ?? 0,
    deltaPct: deltaPct(leadsCurr[p] ?? 0, leadsPrev[p] ?? 0),
  })).sort((a,b)=>a.portal.localeCompare(b.portal));

  // Card 2 — CPL by portal (+ delta), best/worst among portals with ≥1 lead this month
  const cplCurr = cplByPortal(spend, leads, month);
  const cplPrev = cplByPortal(spend, leads, prevMonth);
  const portalsForCpl = new Set([...Object.keys(cplCurr), ...Object.keys(cplPrev)]);
  const rows = [...portalsForCpl].map((p) => {
    const curr = cplCurr[p] ?? "—";
    const prev = cplPrev[p] ?? "—";
    return { portal: p, cpl: curr, deltaPct: deltaPct(curr, prev), best: false, worst: false };
  });

  // determine best/worst among numeric CPLs only where leads > 0 this month
  const numeric = rows.filter((r) => typeof r.cpl === "number") as Array<typeof rows[number] & { cpl: number }>;
  numeric.sort((a,b)=>a.cpl-b.cpl);
  if (numeric.length > 0) {
    numeric[0].best = true;
    numeric[numeric.length - 1].worst = true;
  }
  const cplCard = rows.sort((a,b)=>a.portal.localeCompare(b.portal));

  // Table — listing health
  const now = new Date(); // pivot for last7d/recency
  const listingsTable = listings.map((l) => {
    const l7 = leadsLast7dForListing(leads, l.id, now);
    const dsl = daysSinceLastLead(leads, l.id, now);
    const dsListed = daysSinceListed(l, now);
    const hs = healthScoreSimple(l7, dsl, HEALTH);
    const flag = isUnderperforming(hs, dsl, HEALTH);
    return {
      title: l.title,
      portal: l.portal,
      leads_7d: l7,
      days_since_listed: dsListed,
      health_score: hs,
      flag_underperforming: flag,
    };
  }).sort((a,b)=> (b.health_score - a.health_score) || a.title.localeCompare(b.title));

  // Insight sentence
  const best = numeric[0];
  const worst = numeric[numeric.length - 1];
  const underperfCount = listingsTable.filter((r) => r.flag_underperforming).length;
  let insight = `${underperfCount} listing${underperfCount===1?"":"s"} underperforming.`;
  if (best && worst) {
    const bestDelta = leadsCurr[best.portal] ? "" : ""; // not used here
    const worstDelta = leadsCurr[worst.portal] ? "" : "";
    insight = `${best.portal} CPL is €${Math.round(best.cpl)}; ${underperfCount} listing${underperfCount===1?"":"s"} underperforming.`;
  }

  return { leadsCard, cplCard, listingsTable, insight };
}
