ALTER TABLE "audit_logs"
ADD COLUMN "old_value" JSONB,
ADD COLUMN "new_value" JSONB,
ADD COLUMN "request_id" TEXT;

CREATE INDEX "audit_logs_ip_address_idx" ON "audit_logs"("ip_address");
CREATE INDEX "audit_logs_request_id_idx" ON "audit_logs"("request_id");
