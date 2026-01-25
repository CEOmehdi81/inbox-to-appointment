import { prisma } from '@/lib/prisma';
import { AttributionRow } from '@/types/attribution';

type GetAttributionRowsOptions = {
  portal?: string;   // optional filter by portal
  daysBack?: number; // default: last 30 days
  limit?: number;    // default: 200
};

export async function getAttributionRows(
  options: GetAttributionRowsOptions = {}
): Promise<AttributionRow[]> {
  const daysBack = options.daysBack ?? 30;
  const limit = options.limit ?? 200;
  const portal = options.portal;

  const now = new Date();
  const from = new Date(now.getTime() - daysBack * 24 * 60 * 60 * 1000);

  const leads = await prisma.lead.findMany({
    where: {
      created_at: {
        gte: from,
        lte: now,
      },
      ...(portal ? { portal } : {}),
    },
    include: {
      listing: true,
    },
    orderBy: {
      created_at: 'desc',
    },
    take: limit,
  });

  const rows: AttributionRow[] = leads.map((lead) => ({
    id: lead.id,
    created_at: lead.created_at,
    portal: lead.portal,
    lead_source: lead.lead_source,

    listing_id: lead.listing_id,
    listing_title: lead.listing?.title ?? '(no title)',
    listing_portal: lead.listing?.portal ?? lead.portal ?? 'unknown',
    listing_price:
      typeof (lead.listing as any)?.price === 'number'
        ? (lead.listing as any).price
        : null,
  }));

  return rows;
}