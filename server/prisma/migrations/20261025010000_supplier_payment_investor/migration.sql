-- CreateEnum
CREATE TYPE "FeePayer" AS ENUM ('BUSINESS', 'INVESTOR');

-- AlterTable
ALTER TABLE "SupplierPayment" ADD COLUMN     "feePaidBy" "FeePayer" NOT NULL DEFAULT 'BUSINESS',
ADD COLUMN     "investorId" INTEGER;

-- CreateIndex
CREATE INDEX "SupplierPayment_investorId_idx" ON "SupplierPayment"("investorId");

-- AddForeignKey
ALTER TABLE "SupplierPayment" ADD CONSTRAINT "SupplierPayment_investorId_fkey" FOREIGN KEY ("investorId") REFERENCES "Investor"("id") ON DELETE SET NULL ON UPDATE CASCADE;

