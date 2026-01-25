import { readCsv } from "../lib/csv";
import { leadsByPortal, cplByPortal, leadsLast7dForListing, daysSinceListed, daysSinceLastLead, healthScoreSimple, isUnderperforming } from "../lib/metrics";
import type { Listing, Lead, Spend } from "../lib/types";

const MONTH = process.env.CURRENT_MONTH || "2025-11";

async function main() {
  const listings = (await readCsv("data/listings.csv")) as unknown as Listing[];
  const leads = (await readCsv("data/leads.csv")) as unknown as Lead[];
  const spend = (await readCsv("data/spend.csv")) as unknown as Spend[];

  // cast some fields
  listings.forEach(l => (l.price = Number(l.price)));
  spend.forEach(s => (s.amount = Number(s.amount)));

  console.log("=== MONTH:", MONTH, "===\n");

  const lbp = leadsByPortal(leads, MONTH);
  console.log("Leads by portal:", lbp);

  const cpl = cplByPortal(spend, leads, MONTH);
  console.log("CPL by portal:", cpl, "\n");

  console.log("Listings:");
  for (const l of listings) {
    const l7 = leadsLast7dForListing(leads, l.id);
    const dsl = daysSinceLastLead(leads, l.id);
    const dslisted = daysSinceListed(l);
    const hs = healthScoreSimple(l7, dsl);
    const flag = isUnderperforming(hs, dsl);
    console.log(`- ${l.title.padEnd(16)} | ${l.portal.padEnd(10)} | leads_7d=${String(l7).padStart(2)} | days_since_listed=${String(dslisted).padStart(3)} | health=${String(hs).padStart(3)} | underperf=${flag}`);
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
