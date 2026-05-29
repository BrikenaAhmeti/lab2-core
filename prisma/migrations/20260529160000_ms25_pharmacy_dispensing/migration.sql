ALTER TYPE "PharmacyStatus" ADD VALUE IF NOT EXISTS 'IN_PROGRESS';
ALTER TYPE "PharmacyStatus" ADD VALUE IF NOT EXISTS 'FULFILLED';
ALTER TYPE "PharmacyStatus" ADD VALUE IF NOT EXISTS 'OUT_OF_STOCK';
ALTER TYPE "PharmacyStatus" ADD VALUE IF NOT EXISTS 'SUBSTITUTED';

ALTER TABLE "pharmacy_dispensing_items"
    ADD COLUMN "inventory_item_id" TEXT;

CREATE INDEX "pharmacy_dispensing_items_inventory_item_id_idx"
    ON "pharmacy_dispensing_items"("inventory_item_id");

ALTER TABLE "pharmacy_dispensing_items"
    ADD CONSTRAINT "pharmacy_dispensing_items_inventory_item_id_fkey"
    FOREIGN KEY ("inventory_item_id") REFERENCES "inventory_items"("id")
    ON DELETE SET NULL ON UPDATE CASCADE;
