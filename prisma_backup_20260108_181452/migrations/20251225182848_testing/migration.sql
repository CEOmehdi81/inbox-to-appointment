/*
  Warnings:

  - Added the required column `agencyId` to the `Lead` table without a default value. This is not possible if the table is not empty.
  - Added the required column `agencyId` to the `LeadDetails` table without a default value. This is not possible if the table is not empty.

*/
-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Lead" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "agencyId" TEXT NOT NULL,
    "listing_id" TEXT NOT NULL,
    "portal" TEXT NOT NULL,
    "lead_source" TEXT NOT NULL,
    "created_at" DATETIME NOT NULL,
    "person_id" TEXT,
    CONSTRAINT "Lead_person_id_fkey" FOREIGN KEY ("person_id") REFERENCES "LeadPerson" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Lead_listing_id_fkey" FOREIGN KEY ("listing_id") REFERENCES "Listing" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "new_Lead" ("created_at", "id", "lead_source", "listing_id", "person_id", "portal") SELECT "created_at", "id", "lead_source", "listing_id", "person_id", "portal" FROM "Lead";
DROP TABLE "Lead";
ALTER TABLE "new_Lead" RENAME TO "Lead";
CREATE INDEX "Lead_agencyId_created_at_idx" ON "Lead"("agencyId", "created_at");
CREATE INDEX "Lead_portal_created_at_idx" ON "Lead"("portal", "created_at");
CREATE INDEX "Lead_listing_id_created_at_idx" ON "Lead"("listing_id", "created_at");
CREATE INDEX "Lead_person_id_idx" ON "Lead"("person_id");
CREATE TABLE "new_LeadDetails" (
    "lead_id" TEXT NOT NULL PRIMARY KEY,
    "agencyId" TEXT NOT NULL,
    "language" TEXT,
    "contact_name" TEXT,
    "profile" TEXT,
    "age" INTEGER,
    "has_guarantor" BOOLEAN,
    "budget_monthly" INTEGER,
    "budget_currency" TEXT,
    "move_in_timing" TEXT,
    "city_or_area" TEXT,
    "visit_preferences" TEXT,
    "motivation_level" INTEGER,
    "motivation_bucket" TEXT,
    "contact_email" TEXT,
    "contact_phone" TEXT,
    "listing_reference" TEXT,
    "listing_url" TEXT,
    "summary" TEXT,
    "raw_text" TEXT,
    "email_subject" TEXT,
    "ingest_workflow" TEXT,
    CONSTRAINT "LeadDetails_lead_id_fkey" FOREIGN KEY ("lead_id") REFERENCES "Lead" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "new_LeadDetails" ("age", "budget_currency", "budget_monthly", "city_or_area", "contact_email", "contact_name", "contact_phone", "email_subject", "has_guarantor", "ingest_workflow", "language", "lead_id", "listing_reference", "listing_url", "motivation_bucket", "motivation_level", "move_in_timing", "profile", "raw_text", "summary", "visit_preferences") SELECT "age", "budget_currency", "budget_monthly", "city_or_area", "contact_email", "contact_name", "contact_phone", "email_subject", "has_guarantor", "ingest_workflow", "language", "lead_id", "listing_reference", "listing_url", "motivation_bucket", "motivation_level", "move_in_timing", "profile", "raw_text", "summary", "visit_preferences" FROM "LeadDetails";
DROP TABLE "LeadDetails";
ALTER TABLE "new_LeadDetails" RENAME TO "LeadDetails";
CREATE INDEX "LeadDetails_agencyId_idx" ON "LeadDetails"("agencyId");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
