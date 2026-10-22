-- AlterTable
ALTER TABLE "LedgerEntry" ADD COLUMN     "countsInProfit" BOOLEAN NOT NULL DEFAULT false;

-- CreateTable
CREATE TABLE "TransferAccessory" (
    "transferId" INTEGER NOT NULL,
    "productModelId" INTEGER NOT NULL,
    "quantity" INTEGER NOT NULL,

    CONSTRAINT "TransferAccessory_pkey" PRIMARY KEY ("transferId","productModelId")
);

-- CreateIndex
CREATE INDEX "AuditLog_userId_idx" ON "AuditLog"("userId");

-- CreateIndex
CREATE INDEX "StockCount_locationId_finishedAt_idx" ON "StockCount"("locationId", "finishedAt");

-- AddForeignKey
ALTER TABLE "TransferAccessory" ADD CONSTRAINT "TransferAccessory_transferId_fkey" FOREIGN KEY ("transferId") REFERENCES "Transfer"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TransferAccessory" ADD CONSTRAINT "TransferAccessory_productModelId_fkey" FOREIGN KEY ("productModelId") REFERENCES "ProductModel"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
