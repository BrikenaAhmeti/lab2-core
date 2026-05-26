ALTER TABLE "feedback"
ADD COLUMN "status" TEXT NOT NULL DEFAULT 'pending',
ADD COLUMN "is_anonymous" BOOLEAN NOT NULL DEFAULT false;

ALTER TABLE "contact_messages"
ADD COLUMN "reply_notes" TEXT;

CREATE INDEX "feedback_status_idx" ON "feedback"("status");
CREATE UNIQUE INDEX "feedback_appointment_id_key" ON "feedback"("appointment_id");
