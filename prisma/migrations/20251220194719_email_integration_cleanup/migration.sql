-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_EmailIntegration" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "agencyId" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "email" TEXT,
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
INSERT INTO "new_EmailIntegration" ("accessTokenEnc", "agencyId", "createdAt", "email", "expiryDateMs", "id", "labelId", "labelName", "lastError", "provider", "refreshTokenEnc", "scope", "status", "tokenType", "updatedAt", "verifiedAt") SELECT "accessTokenEnc", "agencyId", "createdAt", "email", "expiryDateMs", "id", "labelId", coalesce("labelName", 'HOMI/Leads') AS "labelName", "lastError", "provider", "refreshTokenEnc", "scope", "status", "tokenType", "updatedAt", "verifiedAt" FROM "EmailIntegration";
DROP TABLE "EmailIntegration";
ALTER TABLE "new_EmailIntegration" RENAME TO "EmailIntegration";
CREATE UNIQUE INDEX "EmailIntegration_agencyId_key" ON "EmailIntegration"("agencyId");
CREATE INDEX "EmailIntegration_provider_idx" ON "EmailIntegration"("provider");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
