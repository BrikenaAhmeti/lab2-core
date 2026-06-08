ALTER TABLE "staff_position_types"
    ADD COLUMN "applies_to_all_departments" BOOLEAN NOT NULL DEFAULT true;

CREATE TABLE "staff_position_type_departments" (
    "staff_position_type_id" TEXT NOT NULL,
    "department_id" TEXT NOT NULL,

    CONSTRAINT "staff_position_type_departments_pkey" PRIMARY KEY ("staff_position_type_id", "department_id")
);

INSERT INTO "staff_position_type_departments" ("staff_position_type_id", "department_id")
SELECT DISTINCT spt."id", department_ids."department_id"
FROM "staff_position_types" spt
CROSS JOIN LATERAL jsonb_array_elements_text(
    CASE
        WHEN jsonb_typeof(spt."applicable_department_ids") = 'array'
            THEN spt."applicable_department_ids"
        ELSE '[]'::jsonb
    END
) AS department_ids("department_id")
INNER JOIN "departments" d ON d."id" = department_ids."department_id"
WHERE jsonb_typeof(spt."applicable_department_ids") = 'array';

UPDATE "staff_position_types"
SET "applies_to_all_departments" = false
WHERE jsonb_typeof("applicable_department_ids") = 'array';

ALTER TABLE "staff_position_types"
    DROP COLUMN "applicable_department_ids";

CREATE INDEX "staff_position_type_departments_department_id_idx"
    ON "staff_position_type_departments"("department_id");

ALTER TABLE "staff_position_type_departments"
    ADD CONSTRAINT "staff_position_type_departments_staff_position_type_id_fkey"
    FOREIGN KEY ("staff_position_type_id") REFERENCES "staff_position_types"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "staff_position_type_departments"
    ADD CONSTRAINT "staff_position_type_departments_department_id_fkey"
    FOREIGN KEY ("department_id") REFERENCES "departments"("id")
    ON DELETE RESTRICT ON UPDATE CASCADE;
