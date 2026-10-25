-- F33: every sale is confirmed by the Admin at the close before its money counts in the drawer.
-- AlterTable
ALTER TABLE "Sale" ADD COLUMN     "confirmedAt" TIMESTAMP(3),
ADD COLUMN     "confirmedById" INTEGER;

-- CreateIndex
CREATE INDEX "Sale_confirmedAt_idx" ON "Sale"("confirmedAt");

-- AddForeignKey
ALTER TABLE "Sale" ADD CONSTRAINT "Sale_confirmedById_fkey" FOREIGN KEY ("confirmedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Existing sales were already counted in their day: keep them there.
UPDATE "Sale" SET "confirmedAt" = "createdAt";
