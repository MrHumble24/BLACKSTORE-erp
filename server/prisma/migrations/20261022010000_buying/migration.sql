-- AlterTable: Supplier gains an active flag and a unique name
ALTER TABLE "Supplier" ADD COLUMN "isActive" BOOLEAN NOT NULL DEFAULT true;

-- AlterTable: every Batch lands at a location (FR-8). Add nullable, backfill existing
-- rows to the first warehouse, then enforce NOT NULL so this applies on a populated DB.
ALTER TABLE "Batch" ADD COLUMN "locationId" INTEGER;
UPDATE "Batch" SET "locationId" = (SELECT id FROM "Location" WHERE type = 'WAREHOUSE' ORDER BY id LIMIT 1) WHERE "locationId" IS NULL;
ALTER TABLE "Batch" ALTER COLUMN "locationId" SET NOT NULL;

-- CreateIndex / constraint
CREATE UNIQUE INDEX "Supplier_name_key" ON "Supplier"("name");

-- AddForeignKey
ALTER TABLE "Batch" ADD CONSTRAINT "Batch_locationId_fkey" FOREIGN KEY ("locationId") REFERENCES "Location"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
