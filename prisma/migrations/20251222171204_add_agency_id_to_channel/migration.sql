/*
  Warnings:

  - Added the required column `agencyId` to the `Channel` table without a default value. This is not possible if the table is not empty.

*/
-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Channel" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "agencyId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "config" JSONB,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);
INSERT INTO "new_Channel" ("config", "createdAt", "id", "isActive", "name", "type", "updatedAt") SELECT "config", "createdAt", "id", "isActive", "name", "type", "updatedAt" FROM "Channel";
DROP TABLE "Channel";
ALTER TABLE "new_Channel" RENAME TO "Channel";
CREATE INDEX "Channel_agencyId_idx" ON "Channel"("agencyId");
CREATE UNIQUE INDEX "Channel_agencyId_type_key" ON "Channel"("agencyId", "type");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
