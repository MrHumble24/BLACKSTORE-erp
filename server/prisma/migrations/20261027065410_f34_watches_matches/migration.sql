-- CreateEnum
CREATE TYPE "MatchStatus" AS ENUM ('NEW', 'SEEN', 'CONTACTED', 'BOUGHT', 'IGNORED');

-- CreateTable
CREATE TABLE "Watch" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "aliases" TEXT[],
    "productModelId" INTEGER,
    "maxPrice" DECIMAL(12,2),
    "currency" TEXT NOT NULL DEFAULT 'USD',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "syncedAt" TIMESTAMP(3),
    "createdById" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Watch_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Match" (
    "id" SERIAL NOT NULL,
    "externalId" TEXT NOT NULL,
    "watchId" INTEGER NOT NULL,
    "status" "MatchStatus" NOT NULL DEFAULT 'NEW',
    "device" TEXT NOT NULL,
    "price" DECIMAL(12,2),
    "currency" TEXT,
    "condition" TEXT,
    "confidence" DECIMAL(4,3) NOT NULL,
    "sellerName" TEXT,
    "sellerTelegramId" TEXT,
    "sellerUsername" TEXT,
    "messageText" TEXT NOT NULL,
    "messageLink" TEXT NOT NULL,
    "groupTitle" TEXT NOT NULL,
    "parentText" TEXT,
    "messageAt" TIMESTAMP(3) NOT NULL,
    "receivedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "statusChangedAt" TIMESTAMP(3),
    "statusChangedById" INTEGER,
    "note" TEXT,

    CONSTRAINT "Match_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Watch_isActive_idx" ON "Watch"("isActive");

-- CreateIndex
CREATE INDEX "Watch_productModelId_idx" ON "Watch"("productModelId");

-- CreateIndex
CREATE UNIQUE INDEX "Match_externalId_key" ON "Match"("externalId");

-- CreateIndex
CREATE INDEX "Match_watchId_idx" ON "Match"("watchId");

-- CreateIndex
CREATE INDEX "Match_status_receivedAt_idx" ON "Match"("status", "receivedAt");

-- AddForeignKey
ALTER TABLE "Watch" ADD CONSTRAINT "Watch_productModelId_fkey" FOREIGN KEY ("productModelId") REFERENCES "ProductModel"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Watch" ADD CONSTRAINT "Watch_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Match" ADD CONSTRAINT "Match_watchId_fkey" FOREIGN KEY ("watchId") REFERENCES "Watch"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Match" ADD CONSTRAINT "Match_statusChangedById_fkey" FOREIGN KEY ("statusChangedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
