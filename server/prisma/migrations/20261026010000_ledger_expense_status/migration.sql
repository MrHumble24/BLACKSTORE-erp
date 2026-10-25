-- CreateEnum
CREATE TYPE "ExpenseStatus" AS ENUM ('PENDING', 'CONFIRMED', 'EXCLUDED');

-- AlterTable
ALTER TABLE "LedgerEntry" ADD COLUMN "status" "ExpenseStatus" NOT NULL DEFAULT 'PENDING';

-- Existing rows were already subtracted from profit, so they keep counting (F27).
UPDATE "LedgerEntry" SET "status" = 'CONFIRMED';
