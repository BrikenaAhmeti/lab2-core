-- Normalize existing Prisma-managed tables to the MS-1 core naming convention.
ALTER TABLE "Department" RENAME TO "departments";
ALTER TABLE "ServiceCatalog" RENAME TO "service_catalog";
ALTER TABLE "ServicePermission" RENAME TO "service_permissions";

ALTER TABLE "departments"
    RENAME COLUMN "phoneExtension" TO "phone_extension";
ALTER TABLE "departments"
    RENAME COLUMN "operatingHours" TO "operating_hours";
ALTER TABLE "departments"
    RENAME COLUMN "isActive" TO "is_active";
ALTER TABLE "departments"
    RENAME COLUMN "sortOrder" TO "sort_order";
ALTER TABLE "departments"
    RENAME COLUMN "createdAt" TO "created_at";
ALTER TABLE "departments"
    RENAME COLUMN "updatedAt" TO "updated_at";
ALTER TABLE "departments"
    ADD COLUMN "created_by" UUID,
    ADD COLUMN "updated_by" UUID;

ALTER TABLE "service_catalog"
    RENAME COLUMN "departmentId" TO "department_id";
ALTER TABLE "service_catalog"
    RENAME COLUMN "defaultDurationMinutes" TO "default_duration_minutes";
ALTER TABLE "service_catalog"
    RENAME COLUMN "defaultPrice" TO "default_price";
ALTER TABLE "service_catalog"
    RENAME COLUMN "isActive" TO "is_active";
ALTER TABLE "service_catalog"
    RENAME COLUMN "sortOrder" TO "sort_order";
ALTER TABLE "service_catalog"
    RENAME COLUMN "createdAt" TO "created_at";
ALTER TABLE "service_catalog"
    RENAME COLUMN "updatedAt" TO "updated_at";
ALTER TABLE "service_catalog"
    ADD COLUMN "created_by" UUID,
    ADD COLUMN "updated_by" UUID;
ALTER TABLE "service_catalog"
    ALTER COLUMN "default_price" TYPE DECIMAL(10,2);

ALTER TABLE "service_permissions"
    RENAME COLUMN "createdAt" TO "created_at";
ALTER TABLE "service_permissions"
    RENAME COLUMN "updatedAt" TO "updated_at";

ALTER TABLE "service_catalog" DROP CONSTRAINT "ServiceCatalog_departmentId_fkey";

DROP INDEX IF EXISTS "Department_name_key";
DROP INDEX IF EXISTS "Department_name_idx";
DROP INDEX IF EXISTS "Department_isActive_idx";
DROP INDEX IF EXISTS "Department_sortOrder_idx";
DROP INDEX IF EXISTS "ServiceCatalog_departmentId_idx";
DROP INDEX IF EXISTS "ServiceCatalog_name_idx";
DROP INDEX IF EXISTS "ServiceCatalog_isActive_idx";
DROP INDEX IF EXISTS "ServiceCatalog_sortOrder_idx";
DROP INDEX IF EXISTS "ServicePermission_name_scope_key";

CREATE TYPE "AppointmentStatus" AS ENUM ('SCHEDULED', 'CONFIRMED', 'CHECKED_IN', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED', 'NO_SHOW');
CREATE TYPE "AppointmentType" AS ENUM ('IN_PERSON', 'VIRTUAL', 'WALK_IN', 'FOLLOW_UP');
CREATE TYPE "EmploymentStatus" AS ENUM ('ACTIVE', 'INACTIVE', 'ON_LEAVE', 'TERMINATED');
CREATE TYPE "BloodType" AS ENUM ('A_POSITIVE', 'A_NEGATIVE', 'B_POSITIVE', 'B_NEGATIVE', 'AB_POSITIVE', 'AB_NEGATIVE', 'O_POSITIVE', 'O_NEGATIVE', 'UNKNOWN');
CREATE TYPE "LabResultStatus" AS ENUM ('PENDING', 'ENTERED', 'REVIEWED', 'ABNORMAL', 'CRITICAL');
CREATE TYPE "LabOrderStatus" AS ENUM ('PENDING', 'COLLECTED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED');
CREATE TYPE "PharmacyStatus" AS ENUM ('PENDING', 'ON_HOLD', 'PARTIALLY_DISPENSED', 'DISPENSED', 'CANCELLED');
CREATE TYPE "InventoryTransactionType" AS ENUM ('RECEIVED', 'DISPENSED', 'ADJUSTED', 'TRANSFERRED', 'WRITTEN_OFF');
CREATE TYPE "BillingStatus" AS ENUM ('DRAFT', 'PENDING', 'PARTIALLY_PAID', 'PAID', 'CANCELLED', 'OVERDUE');
CREATE TYPE "PaymentMethod" AS ENUM ('CASH', 'CARD', 'BANK_TRANSFER', 'ONLINE', 'OTHER');

CREATE TABLE "staff_position_types" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "default_role_key" TEXT NOT NULL,
    "applicable_department_ids" JSONB,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "created_by" UUID,
    "updated_by" UUID,

    CONSTRAINT "staff_position_types_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "staff_profiles" (
    "id" TEXT NOT NULL,
    "user_id" UUID NOT NULL,
    "staff_position_type_id" TEXT NOT NULL,
    "employee_code" TEXT NOT NULL,
    "specialization" TEXT,
    "license_number" TEXT,
    "employment_status" "EmploymentStatus" NOT NULL DEFAULT 'ACTIVE',
    "hire_date" DATE,
    "termination_date" DATE,
    "bio" TEXT,
    "is_public_profile" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "created_by" UUID,
    "updated_by" UUID,

    CONSTRAINT "staff_profiles_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "staff_department_assignments" (
    "id" TEXT NOT NULL,
    "staff_profile_id" TEXT NOT NULL,
    "department_id" TEXT NOT NULL,
    "is_primary" BOOLEAN NOT NULL DEFAULT false,
    "assigned_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "unassigned_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "created_by" UUID,
    "updated_by" UUID,

    CONSTRAINT "staff_department_assignments_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "staff_schedules" (
    "id" TEXT NOT NULL,
    "staff_profile_id" TEXT NOT NULL,
    "department_id" TEXT NOT NULL,
    "day_of_week" INTEGER NOT NULL,
    "start_time" TEXT NOT NULL,
    "end_time" TEXT NOT NULL,
    "slot_duration_minutes" INTEGER NOT NULL,
    "valid_from" DATE,
    "valid_to" DATE,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "created_by" UUID,
    "updated_by" UUID,

    CONSTRAINT "staff_schedules_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "schedule_exceptions" (
    "id" TEXT NOT NULL,
    "staff_profile_id" TEXT NOT NULL,
    "department_id" TEXT,
    "exception_date" DATE NOT NULL,
    "start_time" TEXT,
    "end_time" TEXT,
    "is_unavailable" BOOLEAN NOT NULL DEFAULT true,
    "reason" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "created_by" UUID,
    "updated_by" UUID,

    CONSTRAINT "schedule_exceptions_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "patients" (
    "id" TEXT NOT NULL,
    "user_id" UUID,
    "first_name" TEXT NOT NULL,
    "last_name" TEXT NOT NULL,
    "email" TEXT,
    "phone" TEXT,
    "date_of_birth" DATE,
    "gender" TEXT,
    "blood_type" "BloodType",
    "personal_number" TEXT,
    "address" TEXT,
    "emergency_contact" TEXT,
    "emergency_phone" TEXT,
    "allergies" JSONB,
    "medical_notes" JSONB,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "created_by" UUID,
    "updated_by" UUID,

    CONSTRAINT "patients_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "appointments" (
    "id" TEXT NOT NULL,
    "patient_id" TEXT NOT NULL,
    "department_id" TEXT NOT NULL,
    "service_catalog_id" TEXT NOT NULL,
    "staff_profile_id" TEXT,
    "status" "AppointmentStatus" NOT NULL DEFAULT 'SCHEDULED',
    "appointment_type" "AppointmentType" NOT NULL DEFAULT 'IN_PERSON',
    "scheduled_at" TIMESTAMP(3) NOT NULL,
    "end_at" TIMESTAMP(3) NOT NULL,
    "duration_minutes" INTEGER NOT NULL,
    "base_price" DECIMAL(10,2) NOT NULL,
    "notes" TEXT,
    "checked_in_at" TIMESTAMP(3),
    "completed_at" TIMESTAMP(3),
    "cancelled_at" TIMESTAMP(3),
    "cancellation_note" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "created_by" UUID,
    "updated_by" UUID,

    CONSTRAINT "appointments_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "medical_records" (
    "id" TEXT NOT NULL,
    "patient_id" TEXT NOT NULL,
    "appointment_id" TEXT,
    "staff_profile_id" TEXT NOT NULL,
    "department_id" TEXT NOT NULL,
    "chief_complaint" TEXT,
    "vitals" JSONB,
    "diagnosis" TEXT,
    "treatment_plan" TEXT,
    "notes" TEXT,
    "follow_up_instructions" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "created_by" UUID,
    "updated_by" UUID,

    CONSTRAINT "medical_records_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "medical_record_amendments" (
    "id" TEXT NOT NULL,
    "medical_record_id" TEXT NOT NULL,
    "amended_by_user_id" UUID NOT NULL,
    "reason" TEXT NOT NULL,
    "previous_snapshot" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "created_by" UUID,
    "updated_by" UUID,

    CONSTRAINT "medical_record_amendments_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "prescriptions" (
    "id" TEXT NOT NULL,
    "patient_id" TEXT NOT NULL,
    "medical_record_id" TEXT,
    "appointment_id" TEXT,
    "staff_profile_id" TEXT NOT NULL,
    "issued_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expires_at" TIMESTAMP(3),
    "notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "created_by" UUID,
    "updated_by" UUID,

    CONSTRAINT "prescriptions_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "prescription_items" (
    "id" TEXT NOT NULL,
    "prescription_id" TEXT NOT NULL,
    "medication_name" TEXT NOT NULL,
    "dosage" TEXT NOT NULL,
    "frequency" TEXT NOT NULL,
    "duration_instructions" TEXT,
    "quantity_prescribed" INTEGER NOT NULL,
    "quantity_dispensed" INTEGER,
    "notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "created_by" UUID,
    "updated_by" UUID,

    CONSTRAINT "prescription_items_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "lab_tests" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "category" TEXT,
    "sample_type" TEXT,
    "default_price" DECIMAL(10,2),
    "reference_range" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "created_by" UUID,
    "updated_by" UUID,

    CONSTRAINT "lab_tests_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "lab_orders" (
    "id" TEXT NOT NULL,
    "patient_id" TEXT NOT NULL,
    "appointment_id" TEXT,
    "medical_record_id" TEXT,
    "ordered_by_staff_id" TEXT NOT NULL,
    "department_id" TEXT NOT NULL,
    "status" "LabOrderStatus" NOT NULL DEFAULT 'PENDING',
    "priority" TEXT,
    "notes" TEXT,
    "ordered_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "collected_at" TIMESTAMP(3),
    "completed_at" TIMESTAMP(3),
    "reviewed_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "created_by" UUID,
    "updated_by" UUID,

    CONSTRAINT "lab_orders_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "lab_order_items" (
    "id" TEXT NOT NULL,
    "lab_order_id" TEXT NOT NULL,
    "lab_test_id" TEXT NOT NULL,
    "result_value" TEXT,
    "result_unit" TEXT,
    "result_notes" TEXT,
    "result_status" "LabResultStatus" NOT NULL DEFAULT 'PENDING',
    "is_critical" BOOLEAN NOT NULL DEFAULT false,
    "completed_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "created_by" UUID,
    "updated_by" UUID,

    CONSTRAINT "lab_order_items_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "pharmacy_queue" (
    "id" TEXT NOT NULL,
    "prescription_id" TEXT NOT NULL,
    "patient_id" TEXT NOT NULL,
    "status" "PharmacyStatus" NOT NULL DEFAULT 'PENDING',
    "requested_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "processed_at" TIMESTAMP(3),
    "notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "created_by" UUID,
    "updated_by" UUID,

    CONSTRAINT "pharmacy_queue_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "pharmacy_dispensing_items" (
    "id" TEXT NOT NULL,
    "pharmacy_queue_id" TEXT NOT NULL,
    "prescription_item_id" TEXT NOT NULL,
    "quantity_to_dispense" INTEGER NOT NULL,
    "quantity_dispensed" INTEGER,
    "status" "PharmacyStatus" NOT NULL DEFAULT 'PENDING',
    "notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "created_by" UUID,
    "updated_by" UUID,

    CONSTRAINT "pharmacy_dispensing_items_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "inventory_categories" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "parent_id" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "created_by" UUID,
    "updated_by" UUID,

    CONSTRAINT "inventory_categories_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "inventory_items" (
    "id" TEXT NOT NULL,
    "inventory_category_id" TEXT NOT NULL,
    "department_id" TEXT,
    "sku" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "unit_of_measure" TEXT NOT NULL,
    "current_stock" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "reorder_level" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "unit_cost" DECIMAL(10,2),
    "expiry_date" DATE,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "created_by" UUID,
    "updated_by" UUID,

    CONSTRAINT "inventory_items_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "inventory_transactions" (
    "id" TEXT NOT NULL,
    "inventory_item_id" TEXT NOT NULL,
    "transaction_type" "InventoryTransactionType" NOT NULL,
    "quantity" DECIMAL(12,2) NOT NULL,
    "unit_cost" DECIMAL(10,2),
    "batch_number" TEXT,
    "expiry_date" DATE,
    "reference_entity_type" TEXT,
    "reference_entity_id" TEXT,
    "notes" TEXT,
    "performed_by_user_id" UUID,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "created_by" UUID,
    "updated_by" UUID,

    CONSTRAINT "inventory_transactions_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "billings" (
    "id" TEXT NOT NULL,
    "patient_id" TEXT NOT NULL,
    "appointment_id" TEXT,
    "billing_number" TEXT NOT NULL,
    "status" "BillingStatus" NOT NULL DEFAULT 'PENDING',
    "subtotal" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "tax_amount" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "discount_amount" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "total_amount" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "amount_paid" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "due_date" DATE,
    "issued_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "paid_at" TIMESTAMP(3),
    "notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "created_by" UUID,
    "updated_by" UUID,

    CONSTRAINT "billings_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "billing_items" (
    "id" TEXT NOT NULL,
    "billing_id" TEXT NOT NULL,
    "service_catalog_id" TEXT,
    "inventory_item_id" TEXT,
    "description" TEXT NOT NULL,
    "quantity" DECIMAL(10,2) NOT NULL DEFAULT 1,
    "unit_price" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "total_price" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "source_entity_type" TEXT,
    "source_entity_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "created_by" UUID,
    "updated_by" UUID,

    CONSTRAINT "billing_items_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "payments" (
    "id" TEXT NOT NULL,
    "billing_id" TEXT NOT NULL,
    "amount" DECIMAL(10,2) NOT NULL,
    "payment_method" "PaymentMethod" NOT NULL,
    "reference_number" TEXT,
    "paid_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "received_by_user_id" UUID,
    "notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "created_by" UUID,
    "updated_by" UUID,

    CONSTRAINT "payments_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "feedback" (
    "id" TEXT NOT NULL,
    "patient_id" TEXT NOT NULL,
    "appointment_id" TEXT,
    "rating" INTEGER NOT NULL,
    "comment" TEXT,
    "submitted_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "created_by" UUID,
    "updated_by" UUID,

    CONSTRAINT "feedback_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "contact_messages" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "phone" TEXT,
    "subject" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'new',
    "replied_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "created_by" UUID,
    "updated_by" UUID,

    CONSTRAINT "contact_messages_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "settings" (
    "id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "value" JSONB NOT NULL,
    "description" TEXT,
    "is_public" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "created_by" UUID,
    "updated_by" UUID,

    CONSTRAINT "settings_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "files" (
    "id" TEXT NOT NULL,
    "entity_type" TEXT NOT NULL,
    "entity_id" TEXT NOT NULL,
    "storage_provider" TEXT NOT NULL,
    "original_name" TEXT NOT NULL,
    "stored_name" TEXT NOT NULL,
    "mime_type" TEXT NOT NULL,
    "size_bytes" INTEGER NOT NULL,
    "storage_path" TEXT NOT NULL,
    "public_url" TEXT,
    "checksum" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "created_by" UUID,
    "updated_by" UUID,

    CONSTRAINT "files_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "audit_logs" (
    "id" TEXT NOT NULL,
    "entity_type" TEXT NOT NULL,
    "entity_id" TEXT,
    "action" TEXT NOT NULL,
    "performed_by_user_id" UUID,
    "ip_address" TEXT,
    "user_agent" TEXT,
    "metadata" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "audit_logs_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "departments_name_key" ON "departments"("name");
CREATE INDEX "departments_name_idx" ON "departments"("name");
CREATE INDEX "departments_is_active_idx" ON "departments"("is_active");
CREATE INDEX "departments_sort_order_idx" ON "departments"("sort_order");

CREATE INDEX "service_catalog_department_id_idx" ON "service_catalog"("department_id");
CREATE INDEX "service_catalog_name_idx" ON "service_catalog"("name");
CREATE INDEX "service_catalog_is_active_idx" ON "service_catalog"("is_active");
CREATE INDEX "service_catalog_sort_order_idx" ON "service_catalog"("sort_order");
CREATE UNIQUE INDEX "service_catalog_department_id_name_key" ON "service_catalog"("department_id", "name");

CREATE UNIQUE INDEX "staff_position_types_name_key" ON "staff_position_types"("name");
CREATE INDEX "staff_position_types_is_active_idx" ON "staff_position_types"("is_active");

CREATE UNIQUE INDEX "staff_profiles_user_id_key" ON "staff_profiles"("user_id");
CREATE UNIQUE INDEX "staff_profiles_employee_code_key" ON "staff_profiles"("employee_code");
CREATE INDEX "staff_profiles_staff_position_type_id_idx" ON "staff_profiles"("staff_position_type_id");
CREATE INDEX "staff_profiles_employment_status_idx" ON "staff_profiles"("employment_status");
CREATE INDEX "staff_profiles_is_public_profile_idx" ON "staff_profiles"("is_public_profile");

CREATE INDEX "staff_department_assignments_department_id_idx" ON "staff_department_assignments"("department_id");
CREATE INDEX "staff_department_assignments_is_primary_idx" ON "staff_department_assignments"("is_primary");
CREATE UNIQUE INDEX "staff_department_assignments_staff_profile_id_department_id_key" ON "staff_department_assignments"("staff_profile_id", "department_id");

CREATE INDEX "staff_schedules_staff_profile_id_day_of_week_idx" ON "staff_schedules"("staff_profile_id", "day_of_week");
CREATE INDEX "staff_schedules_department_id_idx" ON "staff_schedules"("department_id");
CREATE INDEX "staff_schedules_is_active_idx" ON "staff_schedules"("is_active");

CREATE INDEX "schedule_exceptions_staff_profile_id_exception_date_idx" ON "schedule_exceptions"("staff_profile_id", "exception_date");
CREATE INDEX "schedule_exceptions_department_id_idx" ON "schedule_exceptions"("department_id");

CREATE UNIQUE INDEX "patients_user_id_key" ON "patients"("user_id");
CREATE INDEX "patients_last_name_first_name_idx" ON "patients"("last_name", "first_name");
CREATE INDEX "patients_email_idx" ON "patients"("email");
CREATE INDEX "patients_phone_idx" ON "patients"("phone");
CREATE INDEX "patients_blood_type_idx" ON "patients"("blood_type");
CREATE INDEX "patients_is_active_idx" ON "patients"("is_active");

CREATE INDEX "appointments_patient_id_idx" ON "appointments"("patient_id");
CREATE INDEX "appointments_department_id_idx" ON "appointments"("department_id");
CREATE INDEX "appointments_service_catalog_id_idx" ON "appointments"("service_catalog_id");
CREATE INDEX "appointments_staff_profile_id_idx" ON "appointments"("staff_profile_id");
CREATE INDEX "appointments_status_idx" ON "appointments"("status");
CREATE INDEX "appointments_scheduled_at_idx" ON "appointments"("scheduled_at");

CREATE INDEX "medical_records_patient_id_idx" ON "medical_records"("patient_id");
CREATE INDEX "medical_records_appointment_id_idx" ON "medical_records"("appointment_id");
CREATE INDEX "medical_records_staff_profile_id_idx" ON "medical_records"("staff_profile_id");
CREATE INDEX "medical_records_department_id_idx" ON "medical_records"("department_id");

CREATE INDEX "medical_record_amendments_medical_record_id_idx" ON "medical_record_amendments"("medical_record_id");
CREATE INDEX "medical_record_amendments_amended_by_user_id_idx" ON "medical_record_amendments"("amended_by_user_id");

CREATE INDEX "prescriptions_patient_id_idx" ON "prescriptions"("patient_id");
CREATE INDEX "prescriptions_medical_record_id_idx" ON "prescriptions"("medical_record_id");
CREATE INDEX "prescriptions_appointment_id_idx" ON "prescriptions"("appointment_id");
CREATE INDEX "prescriptions_staff_profile_id_idx" ON "prescriptions"("staff_profile_id");
CREATE INDEX "prescriptions_issued_at_idx" ON "prescriptions"("issued_at");

CREATE INDEX "prescription_items_prescription_id_idx" ON "prescription_items"("prescription_id");
CREATE INDEX "prescription_items_medication_name_idx" ON "prescription_items"("medication_name");

CREATE UNIQUE INDEX "lab_tests_code_key" ON "lab_tests"("code");
CREATE INDEX "lab_tests_name_idx" ON "lab_tests"("name");
CREATE INDEX "lab_tests_category_idx" ON "lab_tests"("category");
CREATE INDEX "lab_tests_is_active_idx" ON "lab_tests"("is_active");

CREATE INDEX "lab_orders_patient_id_idx" ON "lab_orders"("patient_id");
CREATE INDEX "lab_orders_appointment_id_idx" ON "lab_orders"("appointment_id");
CREATE INDEX "lab_orders_medical_record_id_idx" ON "lab_orders"("medical_record_id");
CREATE INDEX "lab_orders_ordered_by_staff_id_idx" ON "lab_orders"("ordered_by_staff_id");
CREATE INDEX "lab_orders_department_id_idx" ON "lab_orders"("department_id");
CREATE INDEX "lab_orders_status_idx" ON "lab_orders"("status");
CREATE INDEX "lab_orders_ordered_at_idx" ON "lab_orders"("ordered_at");

CREATE INDEX "lab_order_items_lab_order_id_idx" ON "lab_order_items"("lab_order_id");
CREATE INDEX "lab_order_items_lab_test_id_idx" ON "lab_order_items"("lab_test_id");
CREATE INDEX "lab_order_items_result_status_idx" ON "lab_order_items"("result_status");
CREATE INDEX "lab_order_items_is_critical_idx" ON "lab_order_items"("is_critical");

CREATE INDEX "pharmacy_queue_prescription_id_idx" ON "pharmacy_queue"("prescription_id");
CREATE INDEX "pharmacy_queue_patient_id_idx" ON "pharmacy_queue"("patient_id");
CREATE INDEX "pharmacy_queue_status_idx" ON "pharmacy_queue"("status");

CREATE INDEX "pharmacy_dispensing_items_status_idx" ON "pharmacy_dispensing_items"("status");
CREATE UNIQUE INDEX "pharmacy_dispensing_items_pharmacy_queue_id_prescription_item_id_key" ON "pharmacy_dispensing_items"("pharmacy_queue_id", "prescription_item_id");

CREATE UNIQUE INDEX "inventory_categories_name_key" ON "inventory_categories"("name");
CREATE INDEX "inventory_categories_parent_id_idx" ON "inventory_categories"("parent_id");
CREATE INDEX "inventory_categories_is_active_idx" ON "inventory_categories"("is_active");

CREATE UNIQUE INDEX "inventory_items_sku_key" ON "inventory_items"("sku");
CREATE INDEX "inventory_items_inventory_category_id_idx" ON "inventory_items"("inventory_category_id");
CREATE INDEX "inventory_items_department_id_idx" ON "inventory_items"("department_id");
CREATE INDEX "inventory_items_name_idx" ON "inventory_items"("name");
CREATE INDEX "inventory_items_expiry_date_idx" ON "inventory_items"("expiry_date");
CREATE INDEX "inventory_items_is_active_idx" ON "inventory_items"("is_active");

CREATE INDEX "inventory_transactions_inventory_item_id_idx" ON "inventory_transactions"("inventory_item_id");
CREATE INDEX "inventory_transactions_transaction_type_idx" ON "inventory_transactions"("transaction_type");
CREATE INDEX "inventory_transactions_expiry_date_idx" ON "inventory_transactions"("expiry_date");

CREATE UNIQUE INDEX "billings_billing_number_key" ON "billings"("billing_number");
CREATE INDEX "billings_patient_id_idx" ON "billings"("patient_id");
CREATE INDEX "billings_appointment_id_idx" ON "billings"("appointment_id");
CREATE INDEX "billings_status_idx" ON "billings"("status");
CREATE INDEX "billings_issued_at_idx" ON "billings"("issued_at");

CREATE INDEX "billing_items_billing_id_idx" ON "billing_items"("billing_id");
CREATE INDEX "billing_items_service_catalog_id_idx" ON "billing_items"("service_catalog_id");
CREATE INDEX "billing_items_inventory_item_id_idx" ON "billing_items"("inventory_item_id");

CREATE INDEX "payments_billing_id_idx" ON "payments"("billing_id");
CREATE INDEX "payments_payment_method_idx" ON "payments"("payment_method");
CREATE INDEX "payments_paid_at_idx" ON "payments"("paid_at");

CREATE INDEX "feedback_patient_id_idx" ON "feedback"("patient_id");
CREATE INDEX "feedback_appointment_id_idx" ON "feedback"("appointment_id");
CREATE INDEX "feedback_submitted_at_idx" ON "feedback"("submitted_at");

CREATE INDEX "contact_messages_status_idx" ON "contact_messages"("status");
CREATE INDEX "contact_messages_created_at_idx" ON "contact_messages"("created_at");

CREATE UNIQUE INDEX "settings_key_key" ON "settings"("key");
CREATE INDEX "settings_is_public_idx" ON "settings"("is_public");

CREATE INDEX "files_entity_type_entity_id_idx" ON "files"("entity_type", "entity_id");
CREATE INDEX "files_mime_type_idx" ON "files"("mime_type");

CREATE INDEX "audit_logs_entity_type_entity_id_idx" ON "audit_logs"("entity_type", "entity_id");
CREATE INDEX "audit_logs_action_idx" ON "audit_logs"("action");
CREATE INDEX "audit_logs_performed_by_user_id_idx" ON "audit_logs"("performed_by_user_id");
CREATE INDEX "audit_logs_created_at_idx" ON "audit_logs"("created_at");

CREATE UNIQUE INDEX "service_permissions_name_scope_key" ON "service_permissions"("name", "scope");

ALTER TABLE "service_catalog" ADD CONSTRAINT "service_catalog_department_id_fkey" FOREIGN KEY ("department_id") REFERENCES "departments"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "staff_profiles" ADD CONSTRAINT "staff_profiles_staff_position_type_id_fkey" FOREIGN KEY ("staff_position_type_id") REFERENCES "staff_position_types"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "staff_department_assignments" ADD CONSTRAINT "staff_department_assignments_staff_profile_id_fkey" FOREIGN KEY ("staff_profile_id") REFERENCES "staff_profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "staff_department_assignments" ADD CONSTRAINT "staff_department_assignments_department_id_fkey" FOREIGN KEY ("department_id") REFERENCES "departments"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "staff_schedules" ADD CONSTRAINT "staff_schedules_staff_profile_id_fkey" FOREIGN KEY ("staff_profile_id") REFERENCES "staff_profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "staff_schedules" ADD CONSTRAINT "staff_schedules_department_id_fkey" FOREIGN KEY ("department_id") REFERENCES "departments"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "schedule_exceptions" ADD CONSTRAINT "schedule_exceptions_staff_profile_id_fkey" FOREIGN KEY ("staff_profile_id") REFERENCES "staff_profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "schedule_exceptions" ADD CONSTRAINT "schedule_exceptions_department_id_fkey" FOREIGN KEY ("department_id") REFERENCES "departments"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "appointments" ADD CONSTRAINT "appointments_patient_id_fkey" FOREIGN KEY ("patient_id") REFERENCES "patients"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "appointments" ADD CONSTRAINT "appointments_department_id_fkey" FOREIGN KEY ("department_id") REFERENCES "departments"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "appointments" ADD CONSTRAINT "appointments_service_catalog_id_fkey" FOREIGN KEY ("service_catalog_id") REFERENCES "service_catalog"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "appointments" ADD CONSTRAINT "appointments_staff_profile_id_fkey" FOREIGN KEY ("staff_profile_id") REFERENCES "staff_profiles"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "medical_records" ADD CONSTRAINT "medical_records_patient_id_fkey" FOREIGN KEY ("patient_id") REFERENCES "patients"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "medical_records" ADD CONSTRAINT "medical_records_appointment_id_fkey" FOREIGN KEY ("appointment_id") REFERENCES "appointments"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "medical_records" ADD CONSTRAINT "medical_records_staff_profile_id_fkey" FOREIGN KEY ("staff_profile_id") REFERENCES "staff_profiles"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "medical_records" ADD CONSTRAINT "medical_records_department_id_fkey" FOREIGN KEY ("department_id") REFERENCES "departments"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "medical_record_amendments" ADD CONSTRAINT "medical_record_amendments_medical_record_id_fkey" FOREIGN KEY ("medical_record_id") REFERENCES "medical_records"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "prescriptions" ADD CONSTRAINT "prescriptions_patient_id_fkey" FOREIGN KEY ("patient_id") REFERENCES "patients"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "prescriptions" ADD CONSTRAINT "prescriptions_medical_record_id_fkey" FOREIGN KEY ("medical_record_id") REFERENCES "medical_records"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "prescriptions" ADD CONSTRAINT "prescriptions_appointment_id_fkey" FOREIGN KEY ("appointment_id") REFERENCES "appointments"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "prescriptions" ADD CONSTRAINT "prescriptions_staff_profile_id_fkey" FOREIGN KEY ("staff_profile_id") REFERENCES "staff_profiles"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "prescription_items" ADD CONSTRAINT "prescription_items_prescription_id_fkey" FOREIGN KEY ("prescription_id") REFERENCES "prescriptions"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "lab_orders" ADD CONSTRAINT "lab_orders_patient_id_fkey" FOREIGN KEY ("patient_id") REFERENCES "patients"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "lab_orders" ADD CONSTRAINT "lab_orders_appointment_id_fkey" FOREIGN KEY ("appointment_id") REFERENCES "appointments"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "lab_orders" ADD CONSTRAINT "lab_orders_medical_record_id_fkey" FOREIGN KEY ("medical_record_id") REFERENCES "medical_records"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "lab_orders" ADD CONSTRAINT "lab_orders_ordered_by_staff_id_fkey" FOREIGN KEY ("ordered_by_staff_id") REFERENCES "staff_profiles"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "lab_orders" ADD CONSTRAINT "lab_orders_department_id_fkey" FOREIGN KEY ("department_id") REFERENCES "departments"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "lab_order_items" ADD CONSTRAINT "lab_order_items_lab_order_id_fkey" FOREIGN KEY ("lab_order_id") REFERENCES "lab_orders"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "lab_order_items" ADD CONSTRAINT "lab_order_items_lab_test_id_fkey" FOREIGN KEY ("lab_test_id") REFERENCES "lab_tests"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "pharmacy_queue" ADD CONSTRAINT "pharmacy_queue_prescription_id_fkey" FOREIGN KEY ("prescription_id") REFERENCES "prescriptions"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "pharmacy_queue" ADD CONSTRAINT "pharmacy_queue_patient_id_fkey" FOREIGN KEY ("patient_id") REFERENCES "patients"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "pharmacy_dispensing_items" ADD CONSTRAINT "pharmacy_dispensing_items_pharmacy_queue_id_fkey" FOREIGN KEY ("pharmacy_queue_id") REFERENCES "pharmacy_queue"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "pharmacy_dispensing_items" ADD CONSTRAINT "pharmacy_dispensing_items_prescription_item_id_fkey" FOREIGN KEY ("prescription_item_id") REFERENCES "prescription_items"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "inventory_categories" ADD CONSTRAINT "inventory_categories_parent_id_fkey" FOREIGN KEY ("parent_id") REFERENCES "inventory_categories"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "inventory_items" ADD CONSTRAINT "inventory_items_inventory_category_id_fkey" FOREIGN KEY ("inventory_category_id") REFERENCES "inventory_categories"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "inventory_items" ADD CONSTRAINT "inventory_items_department_id_fkey" FOREIGN KEY ("department_id") REFERENCES "departments"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "inventory_transactions" ADD CONSTRAINT "inventory_transactions_inventory_item_id_fkey" FOREIGN KEY ("inventory_item_id") REFERENCES "inventory_items"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "billings" ADD CONSTRAINT "billings_patient_id_fkey" FOREIGN KEY ("patient_id") REFERENCES "patients"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "billings" ADD CONSTRAINT "billings_appointment_id_fkey" FOREIGN KEY ("appointment_id") REFERENCES "appointments"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "billing_items" ADD CONSTRAINT "billing_items_billing_id_fkey" FOREIGN KEY ("billing_id") REFERENCES "billings"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "billing_items" ADD CONSTRAINT "billing_items_service_catalog_id_fkey" FOREIGN KEY ("service_catalog_id") REFERENCES "service_catalog"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "billing_items" ADD CONSTRAINT "billing_items_inventory_item_id_fkey" FOREIGN KEY ("inventory_item_id") REFERENCES "inventory_items"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "payments" ADD CONSTRAINT "payments_billing_id_fkey" FOREIGN KEY ("billing_id") REFERENCES "billings"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "feedback" ADD CONSTRAINT "feedback_patient_id_fkey" FOREIGN KEY ("patient_id") REFERENCES "patients"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "feedback" ADD CONSTRAINT "feedback_appointment_id_fkey" FOREIGN KEY ("appointment_id") REFERENCES "appointments"("id") ON DELETE SET NULL ON UPDATE CASCADE;
