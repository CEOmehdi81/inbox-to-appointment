-- CreateEnum
CREATE TYPE "public"."PortalType" AS ENUM ('rent', 'sale', 'both');

-- CreateTable
CREATE TABLE "public"."PortalCatalogEntry" (
    "id" TEXT NOT NULL,
    "country" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "type" "public"."PortalType" NOT NULL,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PortalCatalogEntry_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "PortalCatalogEntry_url_key" ON "public"."PortalCatalogEntry"("url");

-- CreateIndex
CREATE INDEX "PortalCatalogEntry_country_idx" ON "public"."PortalCatalogEntry"("country");
