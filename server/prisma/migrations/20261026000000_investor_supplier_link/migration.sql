-- AlterTable
ALTER TABLE "Investor" ADD COLUMN     "supplierId" INTEGER;

-- CreateIndex
CREATE UNIQUE INDEX "Investor_supplierId_key" ON "Investor"("supplierId");

-- AddForeignKey
ALTER TABLE "Investor" ADD CONSTRAINT "Investor_supplierId_fkey" FOREIGN KEY ("supplierId") REFERENCES "Supplier"("id") ON DELETE SET NULL ON UPDATE CASCADE;

