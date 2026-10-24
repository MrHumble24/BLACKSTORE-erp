import { randomBytes } from 'node:crypto';
import { BadRequestException, Injectable } from '@nestjs/common';
import { Prisma, TelegramLinkKind } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { TelegramConfigService } from '../integrations/telegram-config.service';

/** Link tokens live 7 days; a reprinted receipt reuses the same live token instead of spawning rows. */
const TOKEN_TTL_MS = 7 * 24 * 60 * 60 * 1000;

/** Which record a resolved token points at (kind + the Customer/Investor id). */
export interface TokenRef {
  kind: TelegramLinkKind;
  refId: number;
}

/**
 * Owns the Telegram deep-link lifecycle (F16): issue a one-time, 7-day-expiring random token for a
 * Customer/Investor, build their invite link, and consume a token to link a chat. The token is a
 * high-entropy random secret stored in a row, so the row gives one-time + expiry for free — no HMAC
 * or signing secret needed.
 */
@Injectable()
export class LinkTokenService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly telegram: TelegramConfigService,
  ) {}

  /**
   * Returns a usable token for (kind, refId): reuse the newest live (unused, unexpired) one if it
   * exists so reprinting a receipt doesn't spawn endless rows; otherwise mint a fresh url-safe token.
   */
  async issueToken(kind: TelegramLinkKind, refId: number): Promise<string> {
    // The OWN/business investor's report folds in whole-business and accessory figures, so its record
    // must never be linked to a Telegram chat. Refuse at the single mint point (covers buildInviteLink
    // and any future caller), so no token can ever exist for it — defense in depth with the F18 query.
    if (kind === TelegramLinkKind.INVESTOR) {
      const investor = await this.prisma.investor.findUnique({ where: { id: refId }, select: { isOwn: true } });
      if (investor?.isOwn) throw new BadRequestException('The business investor cannot be linked to Telegram');
    }
    const now = new Date();
    const live = await this.prisma.telegramLinkToken.findFirst({
      where: { kind, refId, usedAt: null, expiresAt: { gt: now } },
      orderBy: { createdAt: 'desc' },
    });
    if (live) return live.token;
    const token = randomBytes(16).toString('base64url'); // ~22 chars, well under Telegram's 64-char limit
    const expiresAt = new Date(now.getTime() + TOKEN_TTL_MS);
    const created = await this.prisma.telegramLinkToken.create({ data: { token, kind, refId, expiresAt } });
    return created.token;
  }

  /**
   * Deep link a customer/investor taps: `https://t.me/<bot>?start=<token>`. Null when no bot is
   * configured (no username) — F17/F18 fall back to no link in that case.
   */
  async buildInviteLink(kind: TelegramLinkKind, refId: number): Promise<string | null> {
    const { botUsername } = await this.telegram.getStatus();
    if (!botUsername) return null;
    const token = await this.issueToken(kind, refId);
    return `https://t.me/${botUsername}?start=${token}`;
  }

  /**
   * The /start operation: consume the token AND link the chat in ONE transaction, so there is no
   * window where the token is spent but the chat is not linked (or vice versa). Returns the ref on
   * success (for the confirmation reply), or null for an absent/used/expired/unknown token.
   */
  async linkChat(token: string, chatId: string): Promise<TokenRef | null> {
    return this.prisma.$transaction(async (tx) => {
      const ref = await this.markUsed(tx, token);
      if (!ref) return null;
      // Latest link wins: telegramChatId is @unique per table, so clear any other record of THIS
      // kind that already holds this chat id before assigning it here — all in the same transaction.
      // The clear is same-kind only on purpose: one person can be both a Customer and an Investor,
      // so the same chat id may legitimately sit on one of each at once (cross-kind coexistence).
      if (ref.kind === TelegramLinkKind.CUSTOMER) {
        await tx.customer.updateMany({ where: { telegramChatId: chatId }, data: { telegramChatId: null } });
        await tx.customer.update({ where: { id: ref.refId }, data: { telegramChatId: chatId } });
      } else {
        await tx.investor.updateMany({ where: { telegramChatId: chatId }, data: { telegramChatId: null } });
        await tx.investor.update({ where: { id: ref.refId }, data: { telegramChatId: chatId } });
      }
      return ref;
    });
  }

  /**
   * Finds a live token and claims it (usedAt = now) inside the caller's transaction. The guarded
   * updateMany makes the claim atomic, so two concurrent consumes can never both win. Returns the
   * ref when this call claimed it, else null.
   */
  private async markUsed(tx: Prisma.TransactionClient, token: string): Promise<TokenRef | null> {
    const now = new Date();
    const row = await tx.telegramLinkToken.findUnique({ where: { token } });
    if (!row || row.usedAt || row.expiresAt <= now) return null;
    const claim = await tx.telegramLinkToken.updateMany({
      where: { id: row.id, usedAt: null },
      data: { usedAt: now },
    });
    if (claim.count !== 1) return null; // another consume claimed it first
    return { kind: row.kind, refId: row.refId };
  }
}
