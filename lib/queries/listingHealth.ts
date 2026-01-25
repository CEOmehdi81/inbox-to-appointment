import { prisma } from '@/lib/prisma';
import { subDays, differenceInCalendarDays } from 'date-fns';
import { computeListingHealth } from '@/lib/metrics/listingHealth';
import { ListingHealthRow } from '@/types/listingHealth';

type GetListingHealthRowsOptions = {
  portal?: string;
  underperformingOnly?: boolean;
  limit?: number;
};

export async function getListingHealthRows(
  options: GetListingHealthRowsOptions = {}
): Promise<ListingHealthRow[]> {
  const now = new Date();
  const sevenDaysAgo = subDays(now, 7);

  const portal = options.portal;
  const underperformingOnly = options.underperformingOnly ?? false;
  const limit = options.limit ?? 100;

  // 1) Fetch listings
  // We DON'T specify select here to avoid type issues;
  // we’ll read fields via "any" and support multiple naming styles.
  const listings = await prisma.listing.findMany({
    where: {
      // v0: include all listings, optionally filtered by portal
      ...(portal ? { portal } : {}),
    },
  });

  if (!listings.length) return [];

  const listingIds = listings.map((l: any) => l.id);

  // 2) Aggregations on leads
  // Cast to "any" so TS stops complaining about field names.
  const prismaLeadAny = prisma.lead as any;

  const [leadAggLast30d, leadAgg7d] = await Promise.all([
    prismaLeadAny.groupBy({
      by: ['listing_id'],
      where: {
        listing_id: { in: listingIds },
        // your schema uses "created_at"
        created_at: { gte: subDays(now, 30) },
      },
      _count: { _all: true },
      _max: { created_at: true },
    }),
    prismaLeadAny.groupBy({
      by: ['listing_id'],
      where: {
        listing_id: { in: listingIds },
        created_at: { gte: sevenDaysAgo },
      },
      _count: { _all: true },
    }),
  ]);

  const leads7dMap = new Map<string, number>();
  (leadAgg7d as any[]).forEach((g: any) => {
    leads7dMap.set(g.listing_id, g._count?._all ?? 0);
  });

  const leadInfoByListing = new Map<
    string,
    { lastLeadAt: Date | null; leads7d: number }
  >();

  (leadAggLast30d as any[]).forEach((g: any) => {
    leadInfoByListing.set(g.listing_id, {
      lastLeadAt: g._max?.created_at ?? null,
      leads7d: leads7dMap.get(g.listing_id) ?? 0,
    });
  });

  // 3) Build rows
  const rows: ListingHealthRow[] = (listings as any[]).map((listing: any) => {
    // Try multiple possible date field names, fall back to now
    const listedAt =
      listing.listed_at ??
      listing.listedAt ??
      listing.created_at ??
      listing.createdAt ??
      now;

    const daysSinceListed = differenceInCalendarDays(now, listedAt);

    const info = leadInfoByListing.get(listing.id);
    const lastLeadAt = info?.lastLeadAt ?? null;
    const daysSinceLastLead =
      lastLeadAt != null ? differenceInCalendarDays(now, lastLeadAt) : null;

    const leads7d = info?.leads7d ?? 0;

    const { healthScore, isUnderperforming } = computeListingHealth({
      leads7d,
      daysSinceListed,
      daysSinceLastLead,
    });

    return {
      id: listing.id,
      title: listing.title,
      portal: listing.portal,
      price: listing.price ?? null,
      leads_7d: leads7d,
      days_since_listed: daysSinceListed,
      days_since_last_lead: daysSinceLastLead,
      health_score: healthScore,
      flag_underperforming: isUnderperforming,
    };
  });

  // 4) Filter & sort by priority
  let filtered = rows;
  if (underperformingOnly) {
    filtered = filtered.filter((r) => r.flag_underperforming);
  }

  filtered.sort((a, b) => {
    if (a.flag_underperforming !== b.flag_underperforming) {
      return a.flag_underperforming ? -1 : 1;
    }
    if (a.health_score !== b.health_score) {
      return a.health_score - b.health_score;
    }
    return b.days_since_listed - a.days_since_listed;
  });

  return filtered.slice(0, limit);
}