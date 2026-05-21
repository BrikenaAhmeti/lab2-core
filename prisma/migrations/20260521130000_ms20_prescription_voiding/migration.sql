ALTER TABLE "prescriptions"
    ADD COLUMN "is_voided" BOOLEAN NOT NULL DEFAULT false,
    ADD COLUMN "voided_at" TIMESTAMP(3),
    ADD COLUMN "void_reason" TEXT,
    ADD COLUMN "voided_by_user_id" UUID;

CREATE INDEX "prescriptions_is_voided_idx" ON "prescriptions"("is_voided");
