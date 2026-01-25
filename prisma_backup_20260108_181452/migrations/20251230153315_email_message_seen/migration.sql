-- CreateTable
CREATE TABLE "EmailMessageSeen" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "provider" TEXT NOT NULL,
    "agencyId" TEXT NOT NULL,
    "inboxEmail" TEXT NOT NULL,
    "messageId" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateIndex
CREATE INDEX "EmailMessageSeen_agencyId_inboxEmail_idx" ON "EmailMessageSeen"("agencyId", "inboxEmail");

-- CreateIndex
CREATE UNIQUE INDEX "EmailMessageSeen_provider_agencyId_inboxEmail_messageId_key" ON "EmailMessageSeen"("provider", "agencyId", "inboxEmail", "messageId");
