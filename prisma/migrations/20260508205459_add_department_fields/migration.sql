-- AlterTable
ALTER TABLE "Department" ADD COLUMN     "floor" TEXT,
ADD COLUMN     "operatingHours" JSONB,
ADD COLUMN     "phoneExtension" TEXT,
ADD COLUMN     "sortOrder" INTEGER NOT NULL DEFAULT 0;

-- CreateIndex
CREATE INDEX "Department_sortOrder_idx" ON "Department"("sortOrder");
