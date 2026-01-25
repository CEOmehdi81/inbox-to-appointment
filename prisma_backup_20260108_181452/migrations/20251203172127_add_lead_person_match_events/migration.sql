-- CreateTable
CREATE TABLE "LeadPersonMatchEvent" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lead_id" TEXT NOT NULL,
    "person_id" TEXT,
    "score" REAL NOT NULL,
    "email_exact" BOOLEAN NOT NULL,
    "phone_exact" BOOLEAN NOT NULL,
    "name_similarity" REAL NOT NULL,
    "same_listing" BOOLEAN NOT NULL,
    "same_portal" BOOLEAN NOT NULL,
    "decision" TEXT NOT NULL,
    "corrected" BOOLEAN NOT NULL DEFAULT false,
    CONSTRAINT "LeadPersonMatchEvent_lead_id_fkey" FOREIGN KEY ("lead_id") REFERENCES "Lead" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "LeadPersonMatchEvent_person_id_fkey" FOREIGN KEY ("person_id") REFERENCES "LeadPerson" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateIndex
CREATE INDEX "LeadPersonMatchEvent_lead_id_idx" ON "LeadPersonMatchEvent"("lead_id");

-- CreateIndex
CREATE INDEX "LeadPersonMatchEvent_person_id_idx" ON "LeadPersonMatchEvent"("person_id");
