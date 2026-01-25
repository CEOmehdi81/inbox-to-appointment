-- CreateTable
CREATE TABLE "LeadPerson" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "norm_name" TEXT,
    "norm_email" TEXT,
    "norm_phone" TEXT,
    "display_name" TEXT,
    "display_email" TEXT,
    "display_phone" TEXT,
    "total_contacts" INTEGER NOT NULL DEFAULT 0,
    "listings_count" INTEGER NOT NULL DEFAULT 0,
    "suspicious_duplicate" BOOLEAN NOT NULL DEFAULT false
);

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Lead" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "listing_id" TEXT NOT NULL,
    "portal" TEXT NOT NULL,
    "lead_source" TEXT NOT NULL,
    "created_at" DATETIME NOT NULL,
    "person_id" TEXT,
    CONSTRAINT "Lead_person_id_fkey" FOREIGN KEY ("person_id") REFERENCES "LeadPerson" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Lead_listing_id_fkey" FOREIGN KEY ("listing_id") REFERENCES "Listing" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "new_Lead" ("created_at", "id", "lead_source", "listing_id", "portal") SELECT "created_at", "id", "lead_source", "listing_id", "portal" FROM "Lead";
DROP TABLE "Lead";
ALTER TABLE "new_Lead" RENAME TO "Lead";
CREATE INDEX "Lead_portal_created_at_idx" ON "Lead"("portal", "created_at");
CREATE INDEX "Lead_listing_id_created_at_idx" ON "Lead"("listing_id", "created_at");
CREATE INDEX "Lead_person_id_idx" ON "Lead"("person_id");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- CreateIndex
CREATE INDEX "LeadPerson_norm_email_norm_phone_idx" ON "LeadPerson"("norm_email", "norm_phone");
