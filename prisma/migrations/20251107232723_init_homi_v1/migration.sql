-- CreateTable
CREATE TABLE "Listing" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "title" TEXT NOT NULL,
    "portal" TEXT NOT NULL,
    "location" TEXT,
    "price" REAL,
    "status" TEXT,
    "listed_at" DATETIME
);

-- CreateTable
CREATE TABLE "Lead" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "listing_id" TEXT NOT NULL,
    "portal" TEXT NOT NULL,
    "lead_source" TEXT NOT NULL,
    "created_at" DATETIME NOT NULL,
    CONSTRAINT "Lead_listing_id_fkey" FOREIGN KEY ("listing_id") REFERENCES "Listing" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Spend" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "portal" TEXT NOT NULL,
    "month" TEXT NOT NULL,
    "amount" REAL NOT NULL
);

-- CreateTable
CREATE TABLE "MetricsMonthly" (
    "month" TEXT NOT NULL,
    "portal" TEXT NOT NULL,
    "leads" INTEGER NOT NULL,
    "cpl" REAL,

    PRIMARY KEY ("month", "portal")
);

-- CreateIndex
CREATE INDEX "Lead_portal_created_at_idx" ON "Lead"("portal", "created_at");

-- CreateIndex
CREATE INDEX "Lead_listing_id_created_at_idx" ON "Lead"("listing_id", "created_at");

-- CreateIndex
CREATE UNIQUE INDEX "Spend_portal_month_key" ON "Spend"("portal", "month");
