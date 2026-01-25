-- CreateTable
CREATE TABLE "Conversation" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "channel" TEXT NOT NULL,
    "external_thread_id" TEXT NOT NULL,
    "person_id" TEXT,
    "status" TEXT NOT NULL DEFAULT 'active',
    "last_stage" TEXT,
    "last_score" REAL,
    "last_snapshot_json" JSONB,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL,
    CONSTRAINT "Conversation_person_id_fkey" FOREIGN KEY ("person_id") REFERENCES "LeadPerson" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "ConversationMessage" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "conversation_id" TEXT NOT NULL,
    "role" TEXT NOT NULL,
    "text" TEXT NOT NULL,
    "ts" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ConversationMessage_conversation_id_fkey" FOREIGN KEY ("conversation_id") REFERENCES "Conversation" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateIndex
CREATE INDEX "Conversation_channel_external_thread_id_idx" ON "Conversation"("channel", "external_thread_id");

-- CreateIndex
CREATE INDEX "Conversation_person_id_idx" ON "Conversation"("person_id");

-- CreateIndex
CREATE INDEX "ConversationMessage_conversation_id_ts_idx" ON "ConversationMessage"("conversation_id", "ts");
