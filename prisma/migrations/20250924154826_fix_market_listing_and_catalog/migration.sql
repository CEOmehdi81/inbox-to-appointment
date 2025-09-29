/*
  Warnings:

  - Made the column `externalId` on table `MarketListing` required. This step will fail if there are existing NULL values in that column.

*/
-- AlterTable
ALTER TABLE "public"."MarketListing" ALTER COLUMN "externalId" SET NOT NULL,
ALTER COLUMN "title" DROP NOT NULL;
