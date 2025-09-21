/*
  Warnings:

  - A unique constraint covering the columns `[share_id]` on the table `appointments` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateEnum
CREATE TYPE "public"."PropertyStatus" AS ENUM ('active', 'pending', 'draft');

-- CreateEnum
CREATE TYPE "public"."ListingStatus" AS ENUM ('published', 'draft', 'archived');

-- CreateEnum
CREATE TYPE "public"."ChannelStatus" AS ENUM ('active', 'paused', 'archived');

-- CreateEnum
CREATE TYPE "public"."EventType" AS ENUM ('view', 'lead_click', 'contact_click', 'download', 'share_open', 'share_download', 'favorite');

-- AlterTable
ALTER TABLE "public"."appointments" ADD COLUMN     "share_id" TEXT;

-- CreateTable
CREATE TABLE "public"."Property" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "city" TEXT,
    "address" TEXT,
    "priceMonthly" INTEGER,
    "status" "public"."PropertyStatus" NOT NULL DEFAULT 'draft',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Property_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."AppSettings" (
    "id" TEXT NOT NULL,
    "orgName" TEXT,
    "supportEmail" TEXT,
    "brandPrimary" TEXT NOT NULL DEFAULT '#7C5CFF',
    "brandLime" TEXT NOT NULL DEFAULT '#D1FF25',
    "brandCard" TEXT NOT NULL DEFAULT '#0B0B0C',
    "timezone" TEXT NOT NULL DEFAULT 'UTC',
    "dailyDigest" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AppSettings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Document" (
    "id" TEXT NOT NULL,
    "ownerEmail" TEXT NOT NULL,
    "filename" TEXT NOT NULL,
    "storageKey" TEXT NOT NULL,
    "totpSecret" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Document_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."DocumentShare" (
    "id" TEXT NOT NULL,
    "documentId" TEXT NOT NULL,
    "recipientEmail" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "canDownload" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DocumentShare_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."DocumentView" (
    "id" TEXT NOT NULL,
    "documentId" TEXT NOT NULL,
    "shareId" TEXT NOT NULL,
    "viewerEmail" TEXT NOT NULL,
    "viewedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "ip" TEXT,
    "userAgent" TEXT,
    "codeShown" TEXT NOT NULL,

    CONSTRAINT "DocumentView_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Listing" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "city" TEXT,
    "address" TEXT,
    "priceMonthly" INTEGER,
    "url" TEXT,
    "externalId" TEXT,
    "status" "public"."ListingStatus" NOT NULL DEFAULT 'published',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Listing_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."ListingChannel" (
    "id" TEXT NOT NULL,
    "listingId" TEXT NOT NULL,
    "platform" TEXT NOT NULL,
    "externalId" TEXT,
    "url" TEXT NOT NULL,
    "status" "public"."ChannelStatus" NOT NULL DEFAULT 'active',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ListingChannel_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."ListingEvent" (
    "id" TEXT NOT NULL,
    "listingId" TEXT NOT NULL,
    "channelId" TEXT,
    "type" "public"."EventType" NOT NULL,
    "occurredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "ip" TEXT,
    "userAgent" TEXT,
    "referer" TEXT,
    "utmSource" TEXT,
    "utmMedium" TEXT,
    "utmCampaign" TEXT,
    "sessionId" TEXT,

    CONSTRAINT "ListingEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Lead" (
    "id" TEXT NOT NULL,
    "listingId" TEXT NOT NULL,
    "name" TEXT,
    "email" TEXT,
    "phone" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Lead_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Document_storageKey_key" ON "public"."Document"("storageKey");

-- CreateIndex
CREATE INDEX "DocumentShare_documentId_idx" ON "public"."DocumentShare"("documentId");

-- CreateIndex
CREATE INDEX "DocumentShare_recipientEmail_idx" ON "public"."DocumentShare"("recipientEmail");

-- CreateIndex
CREATE INDEX "DocumentView_documentId_idx" ON "public"."DocumentView"("documentId");

-- CreateIndex
CREATE INDEX "DocumentView_shareId_idx" ON "public"."DocumentView"("shareId");

-- CreateIndex
CREATE INDEX "DocumentView_viewerEmail_idx" ON "public"."DocumentView"("viewerEmail");

-- CreateIndex
CREATE UNIQUE INDEX "Listing_url_key" ON "public"."Listing"("url");

-- CreateIndex
CREATE INDEX "idx_listing_status_created" ON "public"."Listing"("status", "createdAt");

-- CreateIndex
CREATE INDEX "idx_channel_listing" ON "public"."ListingChannel"("listingId");

-- CreateIndex
CREATE UNIQUE INDEX "uniq_channel_platform_external" ON "public"."ListingChannel"("platform", "externalId");

-- CreateIndex
CREATE INDEX "idx_event_listing_time" ON "public"."ListingEvent"("listingId", "occurredAt");

-- CreateIndex
CREATE INDEX "idx_event_type_time" ON "public"."ListingEvent"("type", "occurredAt");

-- CreateIndex
CREATE INDEX "idx_event_channel_time" ON "public"."ListingEvent"("channelId", "occurredAt");

-- CreateIndex
CREATE INDEX "idx_lead_listing_time" ON "public"."Lead"("listingId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "appointments_share_id_key" ON "public"."appointments"("share_id");

-- AddForeignKey
ALTER TABLE "public"."DocumentShare" ADD CONSTRAINT "DocumentShare_documentId_fkey" FOREIGN KEY ("documentId") REFERENCES "public"."Document"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."DocumentView" ADD CONSTRAINT "DocumentView_documentId_fkey" FOREIGN KEY ("documentId") REFERENCES "public"."Document"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."DocumentView" ADD CONSTRAINT "DocumentView_shareId_fkey" FOREIGN KEY ("shareId") REFERENCES "public"."DocumentShare"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."ListingChannel" ADD CONSTRAINT "ListingChannel_listingId_fkey" FOREIGN KEY ("listingId") REFERENCES "public"."Listing"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."ListingEvent" ADD CONSTRAINT "ListingEvent_listingId_fkey" FOREIGN KEY ("listingId") REFERENCES "public"."Listing"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."ListingEvent" ADD CONSTRAINT "ListingEvent_channelId_fkey" FOREIGN KEY ("channelId") REFERENCES "public"."ListingChannel"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Lead" ADD CONSTRAINT "Lead_listingId_fkey" FOREIGN KEY ("listingId") REFERENCES "public"."Listing"("id") ON DELETE CASCADE ON UPDATE CASCADE;
