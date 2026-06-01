ALTER TABLE "patients"
ADD COLUMN IF NOT EXISTS "search_vector" tsvector GENERATED ALWAYS AS (
    setweight(to_tsvector('simple', coalesce("first_name", '') || ' ' || coalesce("last_name", '')), 'A') ||
    setweight(to_tsvector('simple', coalesce("email", '')), 'B') ||
    setweight(to_tsvector('simple', coalesce("phone", '')), 'B') ||
    setweight(to_tsvector('simple', coalesce("personal_number", '')), 'C')
) STORED;

ALTER TABLE "appointments"
ADD COLUMN IF NOT EXISTS "search_vector" tsvector GENERATED ALWAYS AS (
    setweight(to_tsvector('simple', coalesce("notes", '')), 'B') ||
    setweight(to_tsvector('simple', CASE "status"
        WHEN 'SCHEDULED' THEN 'SCHEDULED'
        WHEN 'CONFIRMED' THEN 'CONFIRMED'
        WHEN 'CHECKED_IN' THEN 'CHECKED_IN'
        WHEN 'IN_PROGRESS' THEN 'IN_PROGRESS'
        WHEN 'COMPLETED' THEN 'COMPLETED'
        WHEN 'CANCELLED' THEN 'CANCELLED'
        WHEN 'NO_SHOW' THEN 'NO_SHOW'
    END), 'C') ||
    setweight(to_tsvector('simple', CASE "appointment_type"
        WHEN 'IN_PERSON' THEN 'IN_PERSON'
        WHEN 'VIRTUAL' THEN 'VIRTUAL'
        WHEN 'WALK_IN' THEN 'WALK_IN'
        WHEN 'FOLLOW_UP' THEN 'FOLLOW_UP'
    END), 'C')
) STORED;

ALTER TABLE "lab_orders"
ADD COLUMN IF NOT EXISTS "search_vector" tsvector GENERATED ALWAYS AS (
    setweight(to_tsvector('simple', coalesce("notes", '')), 'B') ||
    setweight(to_tsvector('simple', CASE "status"
        WHEN 'PENDING' THEN 'PENDING'
        WHEN 'COLLECTED' THEN 'COLLECTED'
        WHEN 'IN_PROGRESS' THEN 'IN_PROGRESS'
        WHEN 'COMPLETED' THEN 'COMPLETED'
        WHEN 'CANCELLED' THEN 'CANCELLED'
    END), 'C') ||
    setweight(to_tsvector('simple', coalesce("priority", '')), 'C')
) STORED;

ALTER TABLE "inventory_items"
ADD COLUMN IF NOT EXISTS "search_vector" tsvector GENERATED ALWAYS AS (
    setweight(to_tsvector('simple', coalesce("name", '')), 'A') ||
    setweight(to_tsvector('simple', coalesce("sku", '')), 'A') ||
    setweight(to_tsvector('simple', coalesce("description", '')), 'B')
) STORED;

ALTER TABLE "staff_profiles"
ADD COLUMN IF NOT EXISTS "search_vector" tsvector GENERATED ALWAYS AS (
    setweight(to_tsvector('simple', coalesce("employee_code", '')), 'A') ||
    setweight(to_tsvector('simple', coalesce("specialization", '')), 'A') ||
    setweight(to_tsvector('simple', coalesce("license_number", '')), 'B') ||
    setweight(to_tsvector('simple', coalesce("bio", '')), 'C')
) STORED;

ALTER TABLE "audit_logs"
ADD COLUMN IF NOT EXISTS "search_vector" tsvector GENERATED ALWAYS AS (
    setweight(to_tsvector('simple', coalesce("action", '')), 'A') ||
    setweight(to_tsvector('simple', coalesce("entity_type", '')), 'A') ||
    setweight(to_tsvector('simple', coalesce("entity_id", '')), 'B') ||
    setweight(to_tsvector('simple', coalesce("ip_address", '')), 'C') ||
    setweight(to_tsvector('simple', coalesce("request_id", '')), 'C')
) STORED;

CREATE INDEX IF NOT EXISTS "patients_search_vector_idx" ON "patients" USING GIN ("search_vector");
CREATE INDEX IF NOT EXISTS "appointments_search_vector_idx" ON "appointments" USING GIN ("search_vector");
CREATE INDEX IF NOT EXISTS "lab_orders_search_vector_idx" ON "lab_orders" USING GIN ("search_vector");
CREATE INDEX IF NOT EXISTS "inventory_items_search_vector_idx" ON "inventory_items" USING GIN ("search_vector");
CREATE INDEX IF NOT EXISTS "staff_profiles_search_vector_idx" ON "staff_profiles" USING GIN ("search_vector");
CREATE INDEX IF NOT EXISTS "audit_logs_search_vector_idx" ON "audit_logs" USING GIN ("search_vector");

CREATE INDEX IF NOT EXISTS "patients_age_search_idx" ON "patients" ("date_of_birth");
CREATE INDEX IF NOT EXISTS "inventory_items_stock_search_idx" ON "inventory_items" ("current_stock", "reorder_level");
