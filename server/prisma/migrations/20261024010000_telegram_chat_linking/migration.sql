-- CreateEnum
CREATE TYPE "TelegramLinkKind" AS ENUM ('CUSTOMER', 'INVESTOR');

-- AlterTable
ALTER TABLE "Customer" ADD COLUMN     "telegramChatId" TEXT;

-- AlterTable
ALTER TABLE "Investor" ADD COLUMN     "telegramChatId" TEXT;

-- CreateTable
CREATE TABLE "TelegramLinkToken" (
    "id" SERIAL NOT NULL,
    "token" TEXT NOT NULL,
    "kind" "TelegramLinkKind" NOT NULL,
    "refId" INTEGER NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "usedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TelegramLinkToken_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Customer_telegramChatId_key" ON "Customer"("telegramChatId");

-- CreateIndex
CREATE UNIQUE INDEX "Investor_telegramChatId_key" ON "Investor"("telegramChatId");

-- CreateIndex
CREATE UNIQUE INDEX "TelegramLinkToken_token_key" ON "TelegramLinkToken"("token");

-- CreateIndex
CREATE INDEX "TelegramLinkToken_kind_refId_idx" ON "TelegramLinkToken"("kind", "refId");
