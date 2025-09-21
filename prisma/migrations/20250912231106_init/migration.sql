-- CreateTable
CREATE TABLE "public"."appointments" (
    "id" UUID NOT NULL,
    "requested_start" TIMESTAMPTZ(6) NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "source_message_id" TEXT NOT NULL,
    "customer_name" TEXT NOT NULL,
    "customer_email" TEXT NOT NULL,
    "locale" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',

    CONSTRAINT "appointments_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "appointments_source_message_id_key" ON "public"."appointments"("source_message_id");

-- CreateIndex
CREATE INDEX "idx_appointments_requested_start" ON "public"."appointments"("requested_start");

-- CreateIndex
CREATE INDEX "idx_appointments_status_start" ON "public"."appointments"("status", "requested_start");

-- CreateIndex
CREATE INDEX "idx_appointments_created_at" ON "public"."appointments"("created_at");
