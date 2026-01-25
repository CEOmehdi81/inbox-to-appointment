-- CreateTable
CREATE TABLE "EmailIntegration" (
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
    "labelName" TEXT DEFAULT 'HOMI/Leads',
    "verifiedAt" DATETIME,
    "lastError" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateIndex
CREATE UNIQUE INDEX "EmailIntegration_agencyId_key" ON "EmailIntegration"("agencyId");
