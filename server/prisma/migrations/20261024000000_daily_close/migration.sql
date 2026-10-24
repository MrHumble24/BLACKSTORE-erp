-- CreateEnum
CREATE TYPE "DayStatus" AS ENUM ('OPEN', 'CLOSED');

-- CreateEnum
CREATE TYPE "FlagRefType" AS ENUM ('SALE', 'PAYMENT', 'RETURN', 'EXPENSE', 'INCOME');

-- AlterTable
ALTER TABLE "LedgerEntry" ADD COLUMN     "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "inCash" BOOLEAN NOT NULL DEFAULT true;

-- AlterTable
ALTER TABLE "Return" ADD COLUMN     "cashRefund" DECIMAL(12,2) NOT NULL DEFAULT 0,
ADD COLUMN     "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

-- AlterTable
ALTER TABLE "SalePayment" ADD COLUMN     "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

-- CreateTable
CREATE TABLE "BusinessDay" (
    "id" SERIAL NOT NULL,
    "openedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "closedAt" TIMESTAMP(3),
    "status" "DayStatus" NOT NULL DEFAULT 'OPEN',
    "expectedCash" DECIMAL(12,2),
    "countedCash" DECIMAL(12,2),
    "cashVariance" DECIMAL(12,2),
    "expectedCard" DECIMAL(12,2),
    "countedCard" DECIMAL(12,2),
    "cardVariance" DECIMAL(12,2),
    "note" TEXT,
    "closedById" INTEGER,

    CONSTRAINT "BusinessDay_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DayCloseFlag" (
    "id" SERIAL NOT NULL,
    "businessDayId" INTEGER NOT NULL,
    "refType" "FlagRefType" NOT NULL,
    "refId" INTEGER NOT NULL,
    "reason" TEXT NOT NULL,
    "resolved" BOOLEAN NOT NULL DEFAULT false,
    "resolvedById" INTEGER,
    "resolvedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DayCloseFlag_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "BusinessDay_status_idx" ON "BusinessDay"("status");

-- CreateIndex
CREATE INDEX "DayCloseFlag_businessDayId_idx" ON "DayCloseFlag"("businessDayId");

-- AddForeignKey
ALTER TABLE "BusinessDay" ADD CONSTRAINT "BusinessDay_closedById_fkey" FOREIGN KEY ("closedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DayCloseFlag" ADD CONSTRAINT "DayCloseFlag_businessDayId_fkey" FOREIGN KEY ("businessDayId") REFERENCES "BusinessDay"("id") ON DELETE RESTRICT ON UPDATE CASCADE;


-- Enforce exactly one OPEN BusinessDay at a time (partial unique index; Prisma @@unique can't express the WHERE).
CREATE UNIQUE INDEX "BusinessDay_single_open" ON "BusinessDay"("status") WHERE "status" = 'OPEN';

-- Seed the first OPEN day so the shop always has a current day to reconcile against.
INSERT INTO "BusinessDay" ("openedAt", "status") VALUES (CURRENT_TIMESTAMP, 'OPEN');
