/*
  Warnings:

  - You are about to alter the column `amount` on the `Spend` table. The data in that column could be lost. The data in that column will be cast from `Float` to `Decimal`.

*/
-- CreateTable
CREATE TABLE "LeadDetails" (
    "lead_id" TEXT NOT NULL PRIMARY KEY,
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

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Spend" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "portal" TEXT NOT NULL,
    "month" TEXT NOT NULL,
    "amount" DECIMAL NOT NULL
);
INSERT INTO "new_Spend" ("amount", "id", "month", "portal") SELECT "amount", "id", "month", "portal" FROM "Spend";
DROP TABLE "Spend";
ALTER TABLE "new_Spend" RENAME TO "Spend";
CREATE UNIQUE INDEX "Spend_portal_month_key" ON "Spend"("portal", "month");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
