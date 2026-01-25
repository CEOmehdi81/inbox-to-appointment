-- CreateTable
CREATE TABLE "GmailForwardedMessage" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "agencyId" TEXT NOT NULL,
    "inboxEmail" TEXT NOT NULL,
    "messageId" TEXT NOT NULL,
    "threadId" TEXT,
    "receivedAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateIndex
CREATE INDEX "GmailForwardedMessage_agencyId_inboxEmail_idx" ON "GmailForwardedMessage"("agencyId", "inboxEmail");

-- CreateIndex
CREATE UNIQUE INDEX "GmailForwardedMessage_agencyId_inboxEmail_messageId_key" ON "GmailForwardedMessage"("agencyId", "inboxEmail", "messageId");
