import { NextResponse } from 'next/server'
import { PrismaClient, ListingStatus, ChannelStatus } from '@prisma/client'
import type { MarketListing } from '@prisma/client'  // <-- add this

const prisma = new PrismaClient()
const BATCH = 500

export async function POST() {
  let created = 0, updated = 0, skipped = 0
  let cursor: { id: string } | undefined

  for (;;) {
    const items: MarketListing[] = await prisma.marketListing.findMany({   // <-- typed
      take: BATCH,
      ...(cursor ? { skip: 1, cursor } : {}),
      orderBy: { id: 'asc' },
    })
    if (items.length === 0) break
    cursor = { id: items[items.length - 1].id }

    for (const m of items) {
      if (!m.url || !m.title) { skipped++; continue }

      const res = await prisma.listing.upsert({
        where: { url: m.url },
        update: {
          title: m.title,
          city: m.city ?? null,
          priceMonthly: m.price ?? null,
          status: ListingStatus.published,
        },
        create: {
          title: m.title,
          city: m.city ?? null,
          address: null,
          priceMonthly: m.price ?? null,
          url: m.url,
          status: ListingStatus.published,
        },
      })

      if (m.portal) {
        await prisma.listingChannel.upsert({
          where: {
            platform_externalId: {              // relies on @@unique([platform, externalId])
              platform: m.portal,
              externalId: m.externalId ?? m.url,
            },
          },
          update: { url: m.url },
          create: {
            listingId: res.id,
            platform: m.portal,
            externalId: m.externalId ?? m.url,
            url: m.url,
            status: ChannelStatus.active,
          },
        })
      }

      if (res.createdAt.getTime() === res.updatedAt.getTime()) created++
      else updated++
    }
  }

  return NextResponse.json({ ok: true, created, updated, skipped })
}