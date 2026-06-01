ALTER TABLE "patients" DROP COLUMN IF EXISTS "search_vector";
ALTER TABLE "appointments" DROP COLUMN IF EXISTS "search_vector";
ALTER TABLE "lab_orders" DROP COLUMN IF EXISTS "search_vector";
ALTER TABLE "inventory_items" DROP COLUMN IF EXISTS "search_vector";
ALTER TABLE "staff_profiles" DROP COLUMN IF EXISTS "search_vector";
ALTER TABLE "audit_logs" DROP COLUMN IF EXISTS "search_vector";

ALTER TABLE "patients" ADD COLUMN "search_vector" tsvector;
ALTER TABLE "appointments" ADD COLUMN "search_vector" tsvector;
ALTER TABLE "lab_orders" ADD COLUMN "search_vector" tsvector;
ALTER TABLE "inventory_items" ADD COLUMN "search_vector" tsvector;
ALTER TABLE "staff_profiles" ADD COLUMN "search_vector" tsvector;
ALTER TABLE "audit_logs" ADD COLUMN "search_vector" tsvector;

CREATE OR REPLACE FUNCTION "patients_search_vector_update"()
RETURNS trigger AS $$
BEGIN
    NEW."search_vector" :=
        setweight(to_tsvector('simple', coalesce(NEW."first_name", '') || ' ' || coalesce(NEW."last_name", '')), 'A') ||
        setweight(to_tsvector('simple', coalesce(NEW."email", '')), 'B') ||
        setweight(to_tsvector('simple', coalesce(NEW."phone", '')), 'B') ||
        setweight(to_tsvector('simple', coalesce(NEW."personal_number", '')), 'C');

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION "appointments_search_vector_update"()
RETURNS trigger AS $$
BEGIN
    NEW."search_vector" :=
        setweight(to_tsvector('simple', coalesce(NEW."notes", '')), 'B') ||
        setweight(to_tsvector('simple', coalesce(NEW."status"::text, '')), 'C') ||
        setweight(to_tsvector('simple', coalesce(NEW."appointment_type"::text, '')), 'C');

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION "lab_orders_search_vector_update"()
RETURNS trigger AS $$
BEGIN
    NEW."search_vector" :=
        setweight(to_tsvector('simple', coalesce(NEW."notes", '')), 'B') ||
        setweight(to_tsvector('simple', coalesce(NEW."status"::text, '')), 'C') ||
        setweight(to_tsvector('simple', coalesce(NEW."priority", '')), 'C');

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION "inventory_items_search_vector_update"()
RETURNS trigger AS $$
BEGIN
    NEW."search_vector" :=
        setweight(to_tsvector('simple', coalesce(NEW."name", '')), 'A') ||
        setweight(to_tsvector('simple', coalesce(NEW."sku", '')), 'A') ||
        setweight(to_tsvector('simple', coalesce(NEW."description", '')), 'B');

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION "staff_profiles_search_vector_update"()
RETURNS trigger AS $$
BEGIN
    NEW."search_vector" :=
        setweight(to_tsvector('simple', coalesce(NEW."employee_code", '')), 'A') ||
        setweight(to_tsvector('simple', coalesce(NEW."specialization", '')), 'A') ||
        setweight(to_tsvector('simple', coalesce(NEW."license_number", '')), 'B') ||
        setweight(to_tsvector('simple', coalesce(NEW."bio", '')), 'C');

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION "audit_logs_search_vector_update"()
RETURNS trigger AS $$
BEGIN
    NEW."search_vector" :=
        setweight(to_tsvector('simple', coalesce(NEW."action", '')), 'A') ||
        setweight(to_tsvector('simple', coalesce(NEW."entity_type", '')), 'A') ||
        setweight(to_tsvector('simple', coalesce(NEW."entity_id", '')), 'B') ||
        setweight(to_tsvector('simple', coalesce(NEW."ip_address", '')), 'C') ||
        setweight(to_tsvector('simple', coalesce(NEW."request_id", '')), 'C');

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

UPDATE "patients"
SET "search_vector" =
    setweight(to_tsvector('simple', coalesce("first_name", '') || ' ' || coalesce("last_name", '')), 'A') ||
    setweight(to_tsvector('simple', coalesce("email", '')), 'B') ||
    setweight(to_tsvector('simple', coalesce("phone", '')), 'B') ||
    setweight(to_tsvector('simple', coalesce("personal_number", '')), 'C');

UPDATE "appointments"
SET "search_vector" =
    setweight(to_tsvector('simple', coalesce("notes", '')), 'B') ||
    setweight(to_tsvector('simple', coalesce("status"::text, '')), 'C') ||
    setweight(to_tsvector('simple', coalesce("appointment_type"::text, '')), 'C');

UPDATE "lab_orders"
SET "search_vector" =
    setweight(to_tsvector('simple', coalesce("notes", '')), 'B') ||
    setweight(to_tsvector('simple', coalesce("status"::text, '')), 'C') ||
    setweight(to_tsvector('simple', coalesce("priority", '')), 'C');

UPDATE "inventory_items"
SET "search_vector" =
    setweight(to_tsvector('simple', coalesce("name", '')), 'A') ||
    setweight(to_tsvector('simple', coalesce("sku", '')), 'A') ||
    setweight(to_tsvector('simple', coalesce("description", '')), 'B');

UPDATE "staff_profiles"
SET "search_vector" =
    setweight(to_tsvector('simple', coalesce("employee_code", '')), 'A') ||
    setweight(to_tsvector('simple', coalesce("specialization", '')), 'A') ||
    setweight(to_tsvector('simple', coalesce("license_number", '')), 'B') ||
    setweight(to_tsvector('simple', coalesce("bio", '')), 'C');

UPDATE "audit_logs"
SET "search_vector" =
    setweight(to_tsvector('simple', coalesce("action", '')), 'A') ||
    setweight(to_tsvector('simple', coalesce("entity_type", '')), 'A') ||
    setweight(to_tsvector('simple', coalesce("entity_id", '')), 'B') ||
    setweight(to_tsvector('simple', coalesce("ip_address", '')), 'C') ||
    setweight(to_tsvector('simple', coalesce("request_id", '')), 'C');

DROP TRIGGER IF EXISTS "patients_search_vector_trigger" ON "patients";
CREATE TRIGGER "patients_search_vector_trigger"
BEFORE INSERT OR UPDATE OF "first_name", "last_name", "email", "phone", "personal_number"
ON "patients"
FOR EACH ROW EXECUTE FUNCTION "patients_search_vector_update"();

DROP TRIGGER IF EXISTS "appointments_search_vector_trigger" ON "appointments";
CREATE TRIGGER "appointments_search_vector_trigger"
BEFORE INSERT OR UPDATE OF "notes", "status", "appointment_type"
ON "appointments"
FOR EACH ROW EXECUTE FUNCTION "appointments_search_vector_update"();

DROP TRIGGER IF EXISTS "lab_orders_search_vector_trigger" ON "lab_orders";
CREATE TRIGGER "lab_orders_search_vector_trigger"
BEFORE INSERT OR UPDATE OF "notes", "status", "priority"
ON "lab_orders"
FOR EACH ROW EXECUTE FUNCTION "lab_orders_search_vector_update"();

DROP TRIGGER IF EXISTS "inventory_items_search_vector_trigger" ON "inventory_items";
CREATE TRIGGER "inventory_items_search_vector_trigger"
BEFORE INSERT OR UPDATE OF "name", "sku", "description"
ON "inventory_items"
FOR EACH ROW EXECUTE FUNCTION "inventory_items_search_vector_update"();

DROP TRIGGER IF EXISTS "staff_profiles_search_vector_trigger" ON "staff_profiles";
CREATE TRIGGER "staff_profiles_search_vector_trigger"
BEFORE INSERT OR UPDATE OF "employee_code", "specialization", "license_number", "bio"
ON "staff_profiles"
FOR EACH ROW EXECUTE FUNCTION "staff_profiles_search_vector_update"();

DROP TRIGGER IF EXISTS "audit_logs_search_vector_trigger" ON "audit_logs";
CREATE TRIGGER "audit_logs_search_vector_trigger"
BEFORE INSERT OR UPDATE OF "action", "entity_type", "entity_id", "ip_address", "request_id"
ON "audit_logs"
FOR EACH ROW EXECUTE FUNCTION "audit_logs_search_vector_update"();

CREATE INDEX IF NOT EXISTS "patients_search_vector_idx" ON "patients" USING GIN ("search_vector");
CREATE INDEX IF NOT EXISTS "appointments_search_vector_idx" ON "appointments" USING GIN ("search_vector");
CREATE INDEX IF NOT EXISTS "lab_orders_search_vector_idx" ON "lab_orders" USING GIN ("search_vector");
CREATE INDEX IF NOT EXISTS "inventory_items_search_vector_idx" ON "inventory_items" USING GIN ("search_vector");
CREATE INDEX IF NOT EXISTS "staff_profiles_search_vector_idx" ON "staff_profiles" USING GIN ("search_vector");
CREATE INDEX IF NOT EXISTS "audit_logs_search_vector_idx" ON "audit_logs" USING GIN ("search_vector");

CREATE INDEX IF NOT EXISTS "patients_age_search_idx" ON "patients" ("date_of_birth");
CREATE INDEX IF NOT EXISTS "inventory_items_stock_search_idx" ON "inventory_items" ("current_stock", "reorder_level");
