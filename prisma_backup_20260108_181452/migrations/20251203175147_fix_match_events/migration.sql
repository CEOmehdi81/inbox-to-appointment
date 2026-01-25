/*
  Warnings:

  - You are about to drop the column `corrected` on the `LeadPersonMatchEvent` table. All the data in the column will be lost.
  - Made the column `person_id` on table `LeadPersonMatchEvent` required. This step will fail if there are existing NULL values in that column.

*/
-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_LeadPersonMatchEvent" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lead_id" TEXT NOT NULL,
    "person_id" TEXT NOT NULL,
    "score" REAL NOT NULL,
    "email_exact" BOOLEAN NOT NULL,
    "phone_exact" BOOLEAN NOT NULL,
    "name_similarity" REAL NOT NULL,
    "same_listing" BOOLEAN NOT NULL,
    "same_portal" BOOLEAN NOT NULL,
    "decision" TEXT NOT NULL
);
INSERT INTO "new_LeadPersonMatchEvent" ("created_at", "decision", "email_exact", "id", "lead_id", "name_similarity", "person_id", "phone_exact", "same_listing", "same_portal", "score") SELECT "created_at", "decision", "email_exact", "id", "lead_id", "name_similarity", "person_id", "phone_exact", "same_listing", "same_portal", "score" FROM "LeadPersonMatchEvent";
DROP TABLE "LeadPersonMatchEvent";
ALTER TABLE "new_LeadPersonMatchEvent" RENAME TO "LeadPersonMatchEvent";
CREATE INDEX "LeadPersonMatchEvent_person_id_idx" ON "LeadPersonMatchEvent"("person_id");
CREATE INDEX "LeadPersonMatchEvent_lead_id_idx" ON "LeadPersonMatchEvent"("lead_id");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
