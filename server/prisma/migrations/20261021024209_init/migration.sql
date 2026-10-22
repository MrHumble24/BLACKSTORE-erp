-- CreateEnum
CREATE TYPE "LocationType" AS ENUM ('WAREHOUSE', 'SHOP');

-- CreateEnum
CREATE TYPE "ItemStatus" AS ENUM ('IN_STOCK', 'RESERVED', 'IN_TRANSIT', 'AT_PARTNER', 'DEBT', 'SOLD', 'RETURNED', 'DEFECTIVE');

-- CreateEnum
CREATE TYPE "ItemCondition" AS ENUM ('NEW', 'USED', 'REFURBISHED');

-- CreateEnum
CREATE TYPE "IdentifierType" AS ENUM ('IMEI', 'SERIAL', 'SYSTEM_CODE');

-- CreateEnum
CREATE TYPE "ShareType" AS ENUM ('NONE', 'PERCENT', 'FIXED_PER_ITEM');

-- CreateEnum
CREATE TYPE "CostSplitMethod" AS ENUM ('NONE', 'EQUAL', 'BY_PRICE');

-- CreateEnum
CREATE TYPE "PaymentMethod" AS ENUM ('CASH', 'CARD');

-- CreateEnum
CREATE TYPE "SaleStatus" AS ENUM ('DEBT', 'PAID', 'RETURNED');

-- CreateEnum
CREATE TYPE "ConsignmentItemStatus" AS ENUM ('AT_PARTNER', 'SOLD', 'RETURNED');

-- CreateEnum
CREATE TYPE "InvestorTxType" AS ENUM ('DEPOSIT', 'PAYOUT');

-- CreateEnum
CREATE TYPE "LedgerType" AS ENUM ('INCOME', 'EXPENSE');

-- CreateEnum
CREATE TYPE "AttributeType" AS ENUM ('TEXT', 'NUMBER', 'SELECT');

-- CreateEnum
CREATE TYPE "ReturnResult" AS ENUM ('BACK_TO_STOCK', 'DEFECTIVE');

-- CreateTable
CREATE TABLE "Role" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "permissions" TEXT[],

    CONSTRAINT "Role_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "User" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "language" TEXT NOT NULL DEFAULT 'uz',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "roleId" INTEGER NOT NULL,
    "investorId" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AuditLog" (
    "id" SERIAL NOT NULL,
    "userId" INTEGER NOT NULL,
    "action" TEXT NOT NULL,
    "entity" TEXT NOT NULL,
    "entityId" INTEGER NOT NULL,
    "before" JSONB,
    "after" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AuditLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Location" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "type" "LocationType" NOT NULL,

    CONSTRAINT "Location_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Investor" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "isOwn" BOOLEAN,
    "shareType" "ShareType" NOT NULL DEFAULT 'NONE',
    "shareValue" DECIMAL(12,2) NOT NULL DEFAULT 0,

    CONSTRAINT "Investor_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "InvestorTransaction" (
    "id" SERIAL NOT NULL,
    "investorId" INTEGER NOT NULL,
    "type" "InvestorTxType" NOT NULL,
    "amount" DECIMAL(12,2) NOT NULL,
    "date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "note" TEXT,

    CONSTRAINT "InvestorTransaction_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Category" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "isSerialized" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "Category_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CategoryAttribute" (
    "id" SERIAL NOT NULL,
    "categoryId" INTEGER NOT NULL,
    "key" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "type" "AttributeType" NOT NULL DEFAULT 'TEXT',
    "options" TEXT[],
    "required" BOOLEAN NOT NULL DEFAULT false,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "CategoryAttribute_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProductModel" (
    "id" SERIAL NOT NULL,
    "categoryId" INTEGER NOT NULL,
    "name" TEXT NOT NULL,
    "lowStockThreshold" INTEGER,

    CONSTRAINT "ProductModel_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AccessoryStock" (
    "id" SERIAL NOT NULL,
    "productModelId" INTEGER NOT NULL,
    "locationId" INTEGER NOT NULL,
    "quantity" INTEGER NOT NULL DEFAULT 0,
    "avgCost" DECIMAL(12,2) NOT NULL DEFAULT 0,

    CONSTRAINT "AccessoryStock_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Item" (
    "id" SERIAL NOT NULL,
    "productModelId" INTEGER NOT NULL,
    "investorId" INTEGER NOT NULL,
    "locationId" INTEGER NOT NULL,
    "status" "ItemStatus" NOT NULL DEFAULT 'IN_STOCK',
    "condition" "ItemCondition" NOT NULL DEFAULT 'NEW',
    "attributes" JSONB NOT NULL,
    "purchasePrice" DECIMAL(12,2) NOT NULL,
    "extraCost" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "salePrice" DECIMAL(12,2),
    "minSalePrice" DECIMAL(12,2),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Item_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ItemIdentifier" (
    "id" SERIAL NOT NULL,
    "itemId" INTEGER NOT NULL,
    "type" "IdentifierType" NOT NULL,
    "value" TEXT NOT NULL,

    CONSTRAINT "ItemIdentifier_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Supplier" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "country" TEXT,
    "phone" TEXT,
    "note" TEXT,

    CONSTRAINT "Supplier_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Batch" (
    "id" SERIAL NOT NULL,
    "supplierId" INTEGER NOT NULL,
    "investorId" INTEGER NOT NULL,
    "arrivalDate" TIMESTAMP(3) NOT NULL,
    "extraCostTotal" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "costSplitMethod" "CostSplitMethod" NOT NULL DEFAULT 'NONE',
    "note" TEXT,

    CONSTRAINT "Batch_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PurchaseLine" (
    "id" SERIAL NOT NULL,
    "itemId" INTEGER,
    "productModelId" INTEGER,
    "quantity" INTEGER NOT NULL DEFAULT 1,
    "unitPrice" DECIMAL(12,2) NOT NULL,
    "extraCost" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "batchId" INTEGER,
    "walkInSellerId" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PurchaseLine_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SupplierPayment" (
    "id" SERIAL NOT NULL,
    "supplierId" INTEGER NOT NULL,
    "amount" DECIMAL(12,2) NOT NULL,
    "fee" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "note" TEXT,

    CONSTRAINT "SupplierPayment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WalkInSeller" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "WalkInSeller_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Transfer" (
    "id" SERIAL NOT NULL,
    "fromLocationId" INTEGER NOT NULL,
    "toLocationId" INTEGER NOT NULL,
    "userId" INTEGER NOT NULL,
    "date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "note" TEXT,

    CONSTRAINT "Transfer_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TransferItem" (
    "transferId" INTEGER NOT NULL,
    "itemId" INTEGER NOT NULL,

    CONSTRAINT "TransferItem_pkey" PRIMARY KEY ("transferId","itemId")
);

-- CreateTable
CREATE TABLE "Customer" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "note" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Customer_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Sale" (
    "id" SERIAL NOT NULL,
    "customerId" INTEGER,
    "partnerId" INTEGER,
    "locationId" INTEGER NOT NULL,
    "sellerId" INTEGER NOT NULL,
    "status" "SaleStatus" NOT NULL DEFAULT 'PAID',
    "total" DECIMAL(12,2) NOT NULL,
    "discount" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "dueDate" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Sale_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SaleItem" (
    "id" SERIAL NOT NULL,
    "saleId" INTEGER NOT NULL,
    "itemId" INTEGER,
    "productModelId" INTEGER,
    "quantity" INTEGER NOT NULL DEFAULT 1,
    "unitPrice" DECIMAL(12,2) NOT NULL,
    "unitCost" DECIMAL(12,2) NOT NULL,
    "investorId" INTEGER,
    "shareType" "ShareType" NOT NULL DEFAULT 'NONE',
    "shareValue" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "warrantyUntil" TIMESTAMP(3),

    CONSTRAINT "SaleItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SalePayment" (
    "id" SERIAL NOT NULL,
    "saleId" INTEGER NOT NULL,
    "amount" DECIMAL(12,2) NOT NULL,
    "method" "PaymentMethod" NOT NULL,
    "receivedBy" INTEGER NOT NULL,
    "date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SalePayment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Return" (
    "id" SERIAL NOT NULL,
    "saleId" INTEGER NOT NULL,
    "saleItemId" INTEGER NOT NULL,
    "quantity" INTEGER NOT NULL DEFAULT 1,
    "refundAmount" DECIMAL(12,2) NOT NULL,
    "result" "ReturnResult" NOT NULL,
    "reason" TEXT,
    "userId" INTEGER NOT NULL,
    "date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Return_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Partner" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "marketLocation" TEXT,
    "note" TEXT,

    CONSTRAINT "Partner_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Consignment" (
    "id" SERIAL NOT NULL,
    "partnerId" INTEGER NOT NULL,
    "handedById" INTEGER NOT NULL,
    "date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "dueDate" TIMESTAMP(3),
    "note" TEXT,

    CONSTRAINT "Consignment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ConsignmentItem" (
    "id" SERIAL NOT NULL,
    "consignmentId" INTEGER NOT NULL,
    "itemId" INTEGER NOT NULL,
    "minPrice" DECIMAL(12,2) NOT NULL,
    "status" "ConsignmentItemStatus" NOT NULL DEFAULT 'AT_PARTNER',
    "soldAt" TIMESTAMP(3),
    "saleItemId" INTEGER,
    "returnedAt" TIMESTAMP(3),

    CONSTRAINT "ConsignmentItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StockCount" (
    "id" SERIAL NOT NULL,
    "locationId" INTEGER NOT NULL,
    "userId" INTEGER NOT NULL,
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "finishedAt" TIMESTAMP(3),

    CONSTRAINT "StockCount_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StockCountScan" (
    "id" SERIAL NOT NULL,
    "stockCountId" INTEGER NOT NULL,
    "scannedCode" TEXT NOT NULL,
    "itemId" INTEGER,
    "scannedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "StockCountScan_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LedgerEntry" (
    "id" SERIAL NOT NULL,
    "type" "LedgerType" NOT NULL,
    "category" TEXT NOT NULL,
    "amount" DECIMAL(12,2) NOT NULL,
    "date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "note" TEXT,
    "userId" INTEGER NOT NULL,

    CONSTRAINT "LedgerEntry_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Setting" (
    "key" TEXT NOT NULL,
    "value" JSONB NOT NULL,

    CONSTRAINT "Setting_pkey" PRIMARY KEY ("key")
);

-- CreateIndex
CREATE UNIQUE INDEX "Role_name_key" ON "Role"("name");

-- CreateIndex
CREATE UNIQUE INDEX "User_phone_key" ON "User"("phone");

-- CreateIndex
CREATE UNIQUE INDEX "User_investorId_key" ON "User"("investorId");

-- CreateIndex
CREATE INDEX "AuditLog_entity_entityId_idx" ON "AuditLog"("entity", "entityId");

-- CreateIndex
CREATE INDEX "AuditLog_createdAt_idx" ON "AuditLog"("createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "Location_name_key" ON "Location"("name");

-- CreateIndex
CREATE UNIQUE INDEX "Investor_code_key" ON "Investor"("code");

-- CreateIndex
CREATE UNIQUE INDEX "Investor_isOwn_key" ON "Investor"("isOwn");

-- CreateIndex
CREATE UNIQUE INDEX "Category_name_key" ON "Category"("name");

-- CreateIndex
CREATE UNIQUE INDEX "CategoryAttribute_categoryId_key_key" ON "CategoryAttribute"("categoryId", "key");

-- CreateIndex
CREATE UNIQUE INDEX "ProductModel_categoryId_name_key" ON "ProductModel"("categoryId", "name");

-- CreateIndex
CREATE UNIQUE INDEX "AccessoryStock_productModelId_locationId_key" ON "AccessoryStock"("productModelId", "locationId");

-- CreateIndex
CREATE INDEX "Item_status_idx" ON "Item"("status");

-- CreateIndex
CREATE INDEX "Item_investorId_idx" ON "Item"("investorId");

-- CreateIndex
CREATE INDEX "Item_locationId_idx" ON "Item"("locationId");

-- CreateIndex
CREATE UNIQUE INDEX "ItemIdentifier_value_key" ON "ItemIdentifier"("value");

-- CreateIndex
CREATE INDEX "ItemIdentifier_itemId_idx" ON "ItemIdentifier"("itemId");

-- CreateIndex
CREATE INDEX "PurchaseLine_itemId_idx" ON "PurchaseLine"("itemId");

-- CreateIndex
CREATE INDEX "PurchaseLine_batchId_idx" ON "PurchaseLine"("batchId");

-- CreateIndex
CREATE INDEX "WalkInSeller_phone_idx" ON "WalkInSeller"("phone");

-- CreateIndex
CREATE UNIQUE INDEX "Customer_phone_key" ON "Customer"("phone");

-- CreateIndex
CREATE INDEX "Sale_status_idx" ON "Sale"("status");

-- CreateIndex
CREATE INDEX "Sale_createdAt_idx" ON "Sale"("createdAt");

-- CreateIndex
CREATE INDEX "SaleItem_itemId_idx" ON "SaleItem"("itemId");

-- CreateIndex
CREATE UNIQUE INDEX "ConsignmentItem_saleItemId_key" ON "ConsignmentItem"("saleItemId");

-- CreateIndex
CREATE INDEX "ConsignmentItem_status_idx" ON "ConsignmentItem"("status");

-- CreateIndex
CREATE UNIQUE INDEX "StockCountScan_stockCountId_scannedCode_key" ON "StockCountScan"("stockCountId", "scannedCode");

-- AddForeignKey
ALTER TABLE "User" ADD CONSTRAINT "User_roleId_fkey" FOREIGN KEY ("roleId") REFERENCES "Role"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "User" ADD CONSTRAINT "User_investorId_fkey" FOREIGN KEY ("investorId") REFERENCES "Investor"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AuditLog" ADD CONSTRAINT "AuditLog_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InvestorTransaction" ADD CONSTRAINT "InvestorTransaction_investorId_fkey" FOREIGN KEY ("investorId") REFERENCES "Investor"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CategoryAttribute" ADD CONSTRAINT "CategoryAttribute_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "Category"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProductModel" ADD CONSTRAINT "ProductModel_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "Category"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AccessoryStock" ADD CONSTRAINT "AccessoryStock_productModelId_fkey" FOREIGN KEY ("productModelId") REFERENCES "ProductModel"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AccessoryStock" ADD CONSTRAINT "AccessoryStock_locationId_fkey" FOREIGN KEY ("locationId") REFERENCES "Location"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Item" ADD CONSTRAINT "Item_productModelId_fkey" FOREIGN KEY ("productModelId") REFERENCES "ProductModel"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Item" ADD CONSTRAINT "Item_investorId_fkey" FOREIGN KEY ("investorId") REFERENCES "Investor"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Item" ADD CONSTRAINT "Item_locationId_fkey" FOREIGN KEY ("locationId") REFERENCES "Location"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ItemIdentifier" ADD CONSTRAINT "ItemIdentifier_itemId_fkey" FOREIGN KEY ("itemId") REFERENCES "Item"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Batch" ADD CONSTRAINT "Batch_supplierId_fkey" FOREIGN KEY ("supplierId") REFERENCES "Supplier"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Batch" ADD CONSTRAINT "Batch_investorId_fkey" FOREIGN KEY ("investorId") REFERENCES "Investor"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PurchaseLine" ADD CONSTRAINT "PurchaseLine_itemId_fkey" FOREIGN KEY ("itemId") REFERENCES "Item"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PurchaseLine" ADD CONSTRAINT "PurchaseLine_productModelId_fkey" FOREIGN KEY ("productModelId") REFERENCES "ProductModel"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PurchaseLine" ADD CONSTRAINT "PurchaseLine_batchId_fkey" FOREIGN KEY ("batchId") REFERENCES "Batch"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PurchaseLine" ADD CONSTRAINT "PurchaseLine_walkInSellerId_fkey" FOREIGN KEY ("walkInSellerId") REFERENCES "WalkInSeller"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SupplierPayment" ADD CONSTRAINT "SupplierPayment_supplierId_fkey" FOREIGN KEY ("supplierId") REFERENCES "Supplier"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Transfer" ADD CONSTRAINT "Transfer_fromLocationId_fkey" FOREIGN KEY ("fromLocationId") REFERENCES "Location"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Transfer" ADD CONSTRAINT "Transfer_toLocationId_fkey" FOREIGN KEY ("toLocationId") REFERENCES "Location"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Transfer" ADD CONSTRAINT "Transfer_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TransferItem" ADD CONSTRAINT "TransferItem_transferId_fkey" FOREIGN KEY ("transferId") REFERENCES "Transfer"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TransferItem" ADD CONSTRAINT "TransferItem_itemId_fkey" FOREIGN KEY ("itemId") REFERENCES "Item"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Sale" ADD CONSTRAINT "Sale_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Sale" ADD CONSTRAINT "Sale_partnerId_fkey" FOREIGN KEY ("partnerId") REFERENCES "Partner"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Sale" ADD CONSTRAINT "Sale_locationId_fkey" FOREIGN KEY ("locationId") REFERENCES "Location"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Sale" ADD CONSTRAINT "Sale_sellerId_fkey" FOREIGN KEY ("sellerId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SaleItem" ADD CONSTRAINT "SaleItem_saleId_fkey" FOREIGN KEY ("saleId") REFERENCES "Sale"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SaleItem" ADD CONSTRAINT "SaleItem_itemId_fkey" FOREIGN KEY ("itemId") REFERENCES "Item"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SaleItem" ADD CONSTRAINT "SaleItem_productModelId_fkey" FOREIGN KEY ("productModelId") REFERENCES "ProductModel"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SaleItem" ADD CONSTRAINT "SaleItem_investorId_fkey" FOREIGN KEY ("investorId") REFERENCES "Investor"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SalePayment" ADD CONSTRAINT "SalePayment_saleId_fkey" FOREIGN KEY ("saleId") REFERENCES "Sale"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SalePayment" ADD CONSTRAINT "SalePayment_receivedBy_fkey" FOREIGN KEY ("receivedBy") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Return" ADD CONSTRAINT "Return_saleId_fkey" FOREIGN KEY ("saleId") REFERENCES "Sale"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Return" ADD CONSTRAINT "Return_saleItemId_fkey" FOREIGN KEY ("saleItemId") REFERENCES "SaleItem"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Return" ADD CONSTRAINT "Return_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Consignment" ADD CONSTRAINT "Consignment_partnerId_fkey" FOREIGN KEY ("partnerId") REFERENCES "Partner"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Consignment" ADD CONSTRAINT "Consignment_handedById_fkey" FOREIGN KEY ("handedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ConsignmentItem" ADD CONSTRAINT "ConsignmentItem_consignmentId_fkey" FOREIGN KEY ("consignmentId") REFERENCES "Consignment"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ConsignmentItem" ADD CONSTRAINT "ConsignmentItem_itemId_fkey" FOREIGN KEY ("itemId") REFERENCES "Item"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ConsignmentItem" ADD CONSTRAINT "ConsignmentItem_saleItemId_fkey" FOREIGN KEY ("saleItemId") REFERENCES "SaleItem"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StockCount" ADD CONSTRAINT "StockCount_locationId_fkey" FOREIGN KEY ("locationId") REFERENCES "Location"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StockCount" ADD CONSTRAINT "StockCount_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StockCountScan" ADD CONSTRAINT "StockCountScan_stockCountId_fkey" FOREIGN KEY ("stockCountId") REFERENCES "StockCount"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StockCountScan" ADD CONSTRAINT "StockCountScan_itemId_fkey" FOREIGN KEY ("itemId") REFERENCES "Item"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LedgerEntry" ADD CONSTRAINT "LedgerEntry_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
