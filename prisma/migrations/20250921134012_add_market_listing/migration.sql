-- CreateTable
CREATE TABLE "public"."MarketListing" (
    "id" TEXT NOT NULL,
    "portal" TEXT NOT NULL,
    "externalId" TEXT,
    "url" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "city" TEXT,
    "price" INTEGER,
    "surfaceM2" DOUBLE PRECISION,
    "rooms" INTEGER,
    "latitude" DOUBLE PRECISION,
    "longitude" DOUBLE PRECISION,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MarketListing_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "idx_market_portal" ON "public"."MarketListing"("portal");

-- CreateIndex
CREATE INDEX "idx_market_city" ON "public"."MarketListing"("city");

-- CreateIndex
CREATE INDEX "idx_market_created" ON "public"."MarketListing"("createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "uniq_market_portal_extid" ON "public"."MarketListing"("portal", "externalId");
