ALTER TABLE "medical_records"
ADD COLUMN "is_finalized" BOOLEAN NOT NULL DEFAULT false;

CREATE INDEX "medical_records_is_finalized_idx" ON "medical_records"("is_finalized");
