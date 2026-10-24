import { Injectable, Logger } from '@nestjs/common';
import { BotUpdate, errorMessage } from '../common/telegram';
import { PrismaService } from '../prisma/prisma.service';

/**
 * Remembers every chat the bot sees (F21) so the owner's chat picker has something to list. The
 * poller is the only reader of Telegram's update queue, so this is the only place chats are learned.
 * No audit row: the bot, not an app user, saw the chat (same exception as `/start` in commands.ts).
 */
@Injectable()
export class KnownChatService {
  private readonly logger = new Logger(KnownChatService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Upserts the update's chat, or deletes it when the bot was removed or the group migrated to a
   * supergroup (the old id is dead; the new one arrives on its next update). Never throws: a DB
   * hiccup must not stop the poll loop. Logs only the error message (titles are personal data).
   */
  async track(update: BotUpdate): Promise<void> {
    const { id: chatId, title, type } = update.chat;
    try {
      if (update.removed || update.migratedTo) {
        await this.prisma.telegramKnownChat.deleteMany({ where: { chatId } });
        return;
      }
      await this.prisma.telegramKnownChat.upsert({
        where: { chatId },
        create: { chatId, title, type },
        update: { title, type }, // lastSeenAt is @updatedAt
      });
    } catch (e) {
      this.logger.warn(`Known chat tracking failed: ${errorMessage(e)}`);
    }
  }
}
