ALTER TABLE "patients"
    ADD COLUMN "personal_number_hash" TEXT;

CREATE UNIQUE INDEX "patients_personal_number_hash_key"
    ON "patients"("personal_number_hash");

CREATE INDEX "patients_personal_number_hash_idx"
    ON "patients"("personal_number_hash");

CREATE UNIQUE INDEX "patients_email_lower_key"
    ON "patients"(LOWER("email"))
    WHERE "email" IS NOT NULL;
