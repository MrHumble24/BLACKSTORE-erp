-- AlterTable
ALTER TABLE "Customer" ADD COLUMN     "telegramLinkedAt" TIMESTAMP(3),
ADD COLUMN     "telegramLinkedById" INTEGER;

-- AlterTable
ALTER TABLE "Investor" ADD COLUMN     "telegramLinkedAt" TIMESTAMP(3),
ADD COLUMN     "telegramLinkedById" INTEGER;

-- AlterTable
ALTER TABLE "TelegramLinkToken" ADD COLUMN     "issuedById" INTEGER;

-- AddForeignKey
ALTER TABLE "Investor" ADD CONSTRAINT "Investor_telegramLinkedById_fkey" FOREIGN KEY ("telegramLinkedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Customer" ADD CONSTRAINT "Customer_telegramLinkedById_fkey" FOREIGN KEY ("telegramLinkedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TelegramLinkToken" ADD CONSTRAINT "TelegramLinkToken_issuedById_fkey" FOREIGN KEY ("issuedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

