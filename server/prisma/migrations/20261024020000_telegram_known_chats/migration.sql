-- CreateTable
CREATE TABLE "TelegramKnownChat" (
    "chatId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "lastSeenAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TelegramKnownChat_pkey" PRIMARY KEY ("chatId")
);
