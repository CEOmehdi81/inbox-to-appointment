/*
  Warnings:

  - The primary key for the `MetricsMonthly` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - Made the column `email` on table `EmailIntegration` required. This step will fail if there are existing NULL values in that column.
  - Added the required column `agencyId` to the `LeadPerson` table without a default value. This is not possible if the table is not empty.
  - Added the required column `updatedAt` to the `LeadPerson` table without a default value. This is not possible if the table is not empty.
  - Added the required column `agencyId` to the `Listing` table without a default value. This is not possible if the table is not empty.
  - Added the required column `agencyId` to the `MetricsMonthly` table without a default value. This is not possible if the table is not empty.
  - Added the required column `agencyId` to the `Spend` table without a default value. This is not possible if the table is not empty.

*/
-- DropIndex
DROP INDEX "Lead_person_id_idx";

-- DropIndex
DROP INDEX "Lead_listing_id_created_at_idx";

-- DropIndex
DROP INDEX "Lead_portal_created_at_idx";

-- CreateTable
CREATE TABLE "LeadPersonMatch" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "agencyId" TEXT NOT NULL,
    "lead_id" TEXT NOT NULL,
    "person_id" TEXT NOT NULL,
    "matchScore" INTEGER NOT NULL,
    "matchLevel" TEXT NOT NULL,
    "matchReasons" JSONB NOT NULL,
    "matchedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "matchedFromEmailMessageId" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    CONSTRAINT "LeadPersonMatch_lead_id_fkey" FOREIGN KEY ("lead_id") REFERENCES "Lead" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "LeadPersonMatch_person_id_fkey" FOREIGN KEY ("person_id") REFERENCES "LeadPerson" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "EmailMessage" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "agencyId" TEXT NOT NULL,
    "inboxId" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "messageId" TEXT NOT NULL,
    "threadId" TEXT,
    "from" TEXT,
    "to" TEXT,
    "subject" TEXT,
    "bodyText" TEXT,
    "bodyHtml" TEXT,
    "receivedAt" DATETIME NOT NULL,
    "contentHash" TEXT NOT NULL,
    "processedAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "LeadEmailSource" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "agencyId" TEXT NOT NULL,
    "leadId" TEXT NOT NULL,
    "emailMessageId" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "LeadEmailSource_leadId_fkey" FOREIGN KEY ("leadId") REFERENCES "Lead" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "LeadEmailSource_emailMessageId_fkey" FOREIGN KEY ("emailMessageId") REFERENCES "EmailMessage" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_EmailIntegration" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "agencyId" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "accessTokenEnc" TEXT NOT NULL,
    "refreshTokenEnc" TEXT,
    "scope" TEXT,
    "tokenType" TEXT,
    "expiryDateMs" BIGINT,
    "labelId" TEXT,
    "labelName" TEXT NOT NULL DEFAULT 'HOMI/Leads',
    "verifiedAt" DATETIME,
    "lastError" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);
INSERT INTO "new_EmailIntegration" ("accessTokenEnc", "agencyId", "createdAt", "email", "expiryDateMs", "id", "labelId", "labelName", "lastError", "provider", "refreshTokenEnc", "scope", "status", "tokenType", "updatedAt", "verifiedAt") SELECT "accessTokenEnc", "agencyId", "createdAt", "email", "expiryDateMs", "id", "labelId", "labelName", "lastError", "provider", "refreshTokenEnc", "scope", "status", "tokenType", "updatedAt", "verifiedAt" FROM "EmailIntegration";
DROP TABLE "EmailIntegration";
ALTER TABLE "new_EmailIntegration" RENAME TO "EmailIntegration";
CREATE INDEX "EmailIntegration_provider_idx" ON "EmailIntegration"("provider");
CREATE INDEX "EmailIntegration_agencyId_idx" ON "EmailIntegration"("agencyId");
CREATE UNIQUE INDEX "EmailIntegration_agencyId_provider_email_key" ON "EmailIntegration"("agencyId", "provider", "email");
CREATE TABLE "new_LeadPerson" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "agencyId" TEXT NOT NULL,
    "norm_name" TEXT,
    "norm_email" TEXT,
    "norm_phone" TEXT,
    "display_name" TEXT,
    "display_email" TEXT,
    "display_phone" TEXT,
    "total_contacts" INTEGER NOT NULL DEFAULT 0,
    "listings_count" INTEGER NOT NULL DEFAULT 0,
    "suspicious_duplicate" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);
INSERT INTO "new_LeadPerson" ("display_email", "display_name", "display_phone", "id", "listings_count", "norm_email", "norm_name", "norm_phone", "suspicious_duplicate", "total_contacts") SELECT "display_email", "display_name", "display_phone", "id", "listings_count", "norm_email", "norm_name", "norm_phone", "suspicious_duplicate", "total_contacts" FROM "LeadPerson";
DROP TABLE "LeadPerson";
ALTER TABLE "new_LeadPerson" RENAME TO "LeadPerson";
CREATE INDEX "LeadPerson_agencyId_norm_email_idx" ON "LeadPerson"("agencyId", "norm_email");
CREATE INDEX "LeadPerson_agencyId_norm_phone_idx" ON "LeadPerson"("agencyId", "norm_phone");
CREATE TABLE "new_Listing" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "agencyId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "portal" TEXT NOT NULL,
    "location" TEXT,
    "price" REAL,
    "status" TEXT,
    "listed_at" DATETIME
);
INSERT INTO "new_Listing" ("id", "listed_at", "location", "portal", "price", "status", "title") SELECT "id", "listed_at", "location", "portal", "price", "status", "title" FROM "Listing";
DROP TABLE "Listing";
ALTER TABLE "new_Listing" RENAME TO "Listing";
CREATE INDEX "Listing_agencyId_portal_idx" ON "Listing"("agencyId", "portal");
CREATE INDEX "Listing_agencyId_listed_at_idx" ON "Listing"("agencyId", "listed_at");
CREATE UNIQUE INDEX "Listing_agencyId_id_key" ON "Listing"("agencyId", "id");
CREATE TABLE "new_MetricsMonthly" (
    "agencyId" TEXT NOT NULL,
    "month" TEXT NOT NULL,
    "portal" TEXT NOT NULL,
    "leads" INTEGER NOT NULL,
    "cpl" REAL,

    PRIMARY KEY ("agencyId", "month", "portal")
);
INSERT INTO "new_MetricsMonthly" ("cpl", "leads", "month", "portal") SELECT "cpl", "leads", "month", "portal" FROM "MetricsMonthly";
DROP TABLE "MetricsMonthly";
ALTER TABLE "new_MetricsMonthly" RENAME TO "MetricsMonthly";
CREATE TABLE "new_Spend" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "agencyId" TEXT NOT NULL,
    "portal" TEXT NOT NULL,
    "month" TEXT NOT NULL,
    "amount" DECIMAL NOT NULL
);
INSERT INTO "new_Spend" ("amount", "id", "month", "portal") SELECT "amount", "id", "month", "portal" FROM "Spend";
DROP TABLE "Spend";
ALTER TABLE "new_Spend" RENAME TO "Spend";
CREATE INDEX "Spend_agencyId_month_idx" ON "Spend"("agencyId", "month");
CREATE UNIQUE INDEX "Spend_agencyId_portal_month_key" ON "Spend"("agencyId", "portal", "month");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- CreateIndex
CREATE INDEX "LeadPersonMatch_agencyId_lead_id_idx" ON "LeadPersonMatch"("agencyId", "lead_id");

-- CreateIndex
CREATE INDEX "LeadPersonMatch_agencyId_person_id_idx" ON "LeadPersonMatch"("agencyId", "person_id");

-- CreateIndex
CREATE INDEX "LeadPersonMatch_agencyId_isActive_idx" ON "LeadPersonMatch"("agencyId", "isActive");

-- CreateIndex
CREATE INDEX "EmailMessage_agencyId_inboxId_receivedAt_idx" ON "EmailMessage"("agencyId", "inboxId", "receivedAt");

-- CreateIndex
CREATE INDEX "EmailMessage_agencyId_contentHash_idx" ON "EmailMessage"("agencyId", "contentHash");

-- CreateIndex
CREATE UNIQUE INDEX "EmailMessage_provider_agencyId_inboxId_messageId_key" ON "EmailMessage"("provider", "agencyId", "inboxId", "messageId");

-- CreateIndex
CREATE INDEX "LeadEmailSource_agencyId_leadId_idx" ON "LeadEmailSource"("agencyId", "leadId");

-- CreateIndex
CREATE INDEX "LeadEmailSource_agencyId_emailMessageId_idx" ON "LeadEmailSource"("agencyId", "emailMessageId");

-- CreateIndex
CREATE UNIQUE INDEX "LeadEmailSource_agencyId_leadId_emailMessageId_key" ON "LeadEmailSource"("agencyId", "leadId", "emailMessageId");

-- CreateIndex
CREATE INDEX "Lead_agencyId_portal_created_at_idx" ON "Lead"("agencyId", "portal", "created_at");

-- CreateIndex
CREATE INDEX "Lead_agencyId_listing_id_created_at_idx" ON "Lead"("agencyId", "listing_id", "created_at");

-- CreateIndex
CREATE INDEX "Lead_agencyId_person_id_idx" ON "Lead"("agencyId", "person_id");
