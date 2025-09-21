// lib/channels.ts
import prisma from '@/lib/prisma';
import type { ChannelStatus, ListingChannel } from '@prisma/client';

/**
 * Create or update a ListingChannel for a given listing.
 * If externalId is provided we use the compound unique constraint (platform, externalId)
 * otherwise we de-dupe by (listingId, platform, url).
 */
export type UpsertChannelArgs = {
  listingId: string;
  platform: string;          // e.g. "Zillow", "SeLoger", "Facebook"
  url: string;               // landing page on that platform
  externalId?: string | null;
  status?: ChannelStatus;    // defaults to 'active'
};

export async function upsertListingChannel(
  args: UpsertChannelArgs
): Promise<ListingChannel> {
  const {
    listingId,
    platform,
    url,
    externalId = null,
    status = 'active' as ChannelStatus,
  } = args;

  // Path A: externalId present -> lookup by unique (platform, externalId)
  if (externalId) {
    const existing = await prisma.listingChannel.findUnique({
      // Prisma names the unique input by joining fields with an underscore
      where: { platform_externalId: { platform, externalId } },
    });

    if (existing) {
      if (
        existing.url !== url ||
        existing.listingId !== listingId ||
        existing.status !== status
      ) {
        return prisma.listingChannel.update({
          where: { id: existing.id },
          data: { url, listingId, status },
        });
      }
      return existing;
    }
  } else {
    // Path B: no externalId -> de-dupe by (listingId, platform, url)
    const existing = await prisma.listingChannel.findFirst({
      where: { listingId, platform, url },
    });
    if (existing) return existing;
  }

  // Create new channel
  return prisma.listingChannel.create({
    data: {
      listingId,
      platform,
      url,
      externalId: externalId ?? null,
      status,
    },
  });
}

/** Convenience: list channels for one listing (newest first). */
export async function getChannelsForListing(listingId: string) {
  return prisma.listingChannel.findMany({
    where: { listingId },
    orderBy: { createdAt: 'desc' },
  });
}