import { Injectable } from '@nestjs/common';
import type { BotUpdate } from '../common/telegram';
import { PrismaService } from '../prisma/prisma.service';
import type { Role } from './menu';

/**
 * Works out who sent a bot message (F22): owner, linked customer, linked investor, or a mix. Only
 * private chats get a role, so profit (FR-29) and customer names never land in a group with staff.
 */
@Injectable()
export class BotRoleService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Role of the update's chat: owner = the configured alerts chat (same equality as `/status`);
   * customer/investor = linked via /start. At most two DB reads, run together; none for a group.
   * The OWN (business) investor and inactive investors get no investor role.
   */
  async resolve(update: BotUpdate, alertChatId: string): Promise<Role> {
    if (update.chat.type !== 'private') return { owner: false };
    const telegramChatId = update.chatId;
    const [customer, investor] = await Promise.all([
      this.prisma.customer.findUnique({ where: { telegramChatId }, select: { id: true } }),
      this.prisma.investor.findUnique({
        where: { telegramChatId },
        select: { id: true, name: true, isActive: true, isOwn: true },
      }),
    ]);
    const role: Role = { owner: alertChatId !== '' && telegramChatId === alertChatId };
    if (customer) role.customerId = customer.id;
    if (investor?.isActive && investor.isOwn !== true) role.investor = { id: investor.id, name: investor.name };
    return role;
  }
}
