/*
  Warnings:

  - Made the column `title` on table `MarketListing` required. This step will fail if there are existing NULL values in that column.

*/
-- AlterTable
ALTER TABLE "public"."MarketListing" ALTER COLUMN "externalId" DROP NOT NULL,
ALTER COLUMN "title" SET NOT NULL;
