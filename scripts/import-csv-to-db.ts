import { PrismaClient } from "@prisma/client";
import { readCsv } from "../lib/csv";
import type { Listing, Lead, Spend } from "../lib/types";

const prisma = new PrismaClient();

function toNumber(v: any): number | null {
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}
function toDate(v: any): Date | null {
  if (!v) return null;
  const d = new Date(String(v));
  return isNaN(d.getTime()) ? null : d;
}

async function importListings(path = "data/listings.csv") {
  const rows = await readCsv(path);
  let upserts = 0;
  for (const r of rows) {
    const rec: Listing = {
      id: r.id,
      title: r.title,
      portal: r.portal,
      location: r.location,
      price: toNumber(r.price) ?? undefined as any,
      status: r.status,
      listed_at: r.listed_at,
    };
    await prisma.listing.upsert({
      where: { id: rec.id },
      update: {
        title: rec.title,
        portal: rec.portal,
        location: rec.location,
        price: rec.price as any,
        status: rec.status,
        listed_at: rec.listed_at ? new Date(rec.listed_at) : undefined,
      },
      create: {
        id: rec.id,
        title: rec.title,
        portal: rec.portal,
        location: rec.location,
        price: rec.price as any,
        status: rec.status,
        listed_at: rec.listed_at ? new Date(rec.listed_at) : undefined,
      },
    });
    upserts++;
  }
  return upserts;
}

async function importLeads(path = "data/leads.csv") {
  const rows = await readCsv(path);
  let upserts = 0;
  for (const r of rows) {
    const rec: Lead = {
      id: r.id,
      listing_id: r.listing_id,
      portal: r.portal,
      lead_source: r.lead_source,
      created_at: r.created_at,
    };
    // ensure listing exists (skip if not)
    const listing = await prisma.listing.findUnique({ where: { id: rec.listing_id } });
    if (!listing) {
      console.warn(`skip lead ${rec.id}: missing listing ${rec.listing_id}`);
      continue;
    }
    await prisma.lead.upsert({
      where: { id: rec.id },
      update: {},
      create: {
        id: rec.id,
        listing_id: rec.listing_id,
        portal: rec.portal,
        lead_source: rec.lead_source,
        created_at: new Date(rec.created_at),
      },
    });
    upserts++;
  }
  return upserts;
}

async function importSpend(path = "data/spend.csv") {
  const rows = await readCsv(path);
  let upserts = 0;
  for (const r of rows) {
    const rec: Spend = {
      id: r.id,
      portal: r.portal,
      month: r.month,
      amount: toNumber(r.amount) ?? 0,
    };
    await prisma.spend.upsert({
      where: { id: rec.id },
      update: {
        portal: rec.portal,
        month: rec.month,
        amount: rec.amount,
      },
      create: {
        id: rec.id,
        portal: rec.portal,
        month: rec.month,
        amount: rec.amount,
      },
    });
    upserts++;
  }
  return upserts;
}

async function main() {
  const listings = await importListings();
  const spend = await importSpend();
  const leads = await importLeads();
  console.log(`Imported → listings:${listings} spend:${spend} leads:${leads}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
