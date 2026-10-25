-- F32: walk-in payouts are confirmed by the Admin; only confirmed payouts leave the drawer.
-- AlterTable
ALTER TABLE "PurchaseLine" ADD COLUMN     "paidAt" TIMESTAMP(3),
ADD COLUMN     "paidById" INTEGER;

-- AddForeignKey
ALTER TABLE "PurchaseLine" ADD CONSTRAINT "PurchaseLine_paidById_fkey" FOREIGN KEY ("paidById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Existing walk-in lines were already treated as paid on the spot: keep them in their day.
UPDATE "PurchaseLine" SET "paidAt" = "createdAt" WHERE "walkInSellerId" IS NOT NULL;
