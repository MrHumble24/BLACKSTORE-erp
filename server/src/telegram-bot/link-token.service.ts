import { randomBytes } from 'node:crypto';
import { BadRequestException, Injectable } from '@nestjs/common';
import { Prisma, TelegramLinkKind } from '@prisma/client';
import { AuditService } from '../audit/audit.service';
import { PrismaService } from '../prisma/prisma.service';
import { TelegramConfigService } from '../integrations/telegram-config.service';

/** Link tokens live 7 days; a reprinted receipt reuses the same live token instead of spawning rows. */
const TOKEN_TTL_MS = 7 * 24 * 60 * 60 * 1000;

/** Which record a resolved token points at (kind + the Customer/Investor id). */
export interface TokenRef {
  kind: TelegramLinkKind;
  refId: number;
}

/** A claimed token: its ref plus the staff user who issued it (null for tokens from before F24). */
interface ClaimedToken extends TokenRef {
  issuedById: number | null;
}

/** The three link columns shared by Customer and Investor (F24). */
interface ChatFields {
  telegramChatId: string | null;
  telegramLinkedAt: Date | null;
  telegramLinkedById: number | null;
}

const UNLINKED: ChatFields = { telegramChatId: null, telegramLinkedAt: null, telegramLinkedById: null };

/** AuditLog entity name per link kind. */
const entityOf = (kind: TelegramLinkKind) => (kind === TelegramLinkKind.CUSTOMER ? 'Customer' : 'Investor');

/** Invite-link answer for a Customer/Investor: the deep link (null when no bot or already linked). */
export interface TelegramLinkResult {
  link: string | null;
  linked: boolean;
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
    private readonly audit: AuditService,
  ) {}

  /**
   * Returns a usable token for (kind, refId) issued by `issuedById`: reuse the newest live (unused,
   * unexpired) one by the SAME issuer so reprinting a receipt doesn't spawn endless rows; otherwise
   * mint a fresh url-safe token. Reuse is per issuer so the issuer on a consumed token is really the
   * person who handed it out (F24 attribution).
   */
  async issueToken(kind: TelegramLinkKind, refId: number, issuedById: number): Promise<string> {
    // The OWN/business investor's report folds in whole-business and accessory figures, so its record
    // must never be linked to a Telegram chat. Refuse at the single mint point (covers buildInviteLink
    // and any future caller), so no token can ever exist for it — defense in depth with the F18 query.
    if (kind === TelegramLinkKind.INVESTOR) {
      const investor = await this.prisma.investor.findUnique({ where: { id: refId }, select: { isOwn: true } });
      if (investor?.isOwn) throw new BadRequestException('The business investor cannot be linked to Telegram');
    }
    const now = new Date();
    // ponytail: find-then-create can race and mint two live tokens; linkChat consumes all siblings on
    // the first successful link, so the extra one is harmless. Add a partial unique index if it matters.
    const live = await this.prisma.telegramLinkToken.findFirst({
      where: { kind, refId, issuedById, usedAt: null, expiresAt: { gt: now } },
      orderBy: { createdAt: 'desc' },
    });
    if (live) return live.token;
    const token = randomBytes(16).toString('base64url'); // ~22 chars, well under Telegram's 64-char limit
    const expiresAt = new Date(now.getTime() + TOKEN_TTL_MS);
    const created = await this.prisma.telegramLinkToken.create({ data: { token, kind, refId, expiresAt, issuedById } });
    return created.token;
  }

  /**
   * Deep link a customer/investor taps: `https://t.me/<bot>?start=<token>`. Null when no bot is
   * configured (no username) — F17/F18 fall back to no link in that case.
   */
  async buildInviteLink(kind: TelegramLinkKind, refId: number, issuedById: number): Promise<string | null> {
    const { botUsername } = await this.telegram.getStatus();
    if (!botUsername) return null;
    const token = await this.issueToken(kind, refId, issuedById);
    return `https://t.me/${botUsername}?start=${token}`;
  }

  /**
   * The /start operation: consume the token AND link the chat in ONE transaction, so there is no
   * window where the token is spent but the chat is not linked (or vice versa). Returns the ref on
   * success (for the confirmation reply), or null for an absent/used/expired/unknown token, or when
   * the record is already linked (a second live token must never take over a linked chat; the token
   * stays consumed). On success every other unused token for the same record is consumed too, and
   * the link is stamped with when and by whose token it happened (F24).
   *
   * A /start link is audited under the user who issued the token: the Telegram user has no account,
   * and the issuer is the staff member who handed the link out (`via: 'invite'`). Tokens without an
   * issuer only exist for the 7-day TTL after F24 deployed, so for them no audit row is written
   * (AuditLog.userId is required); this is a transition case, not a lasting exception.
   */
  async linkChat(token: string, chatId: string): Promise<TokenRef | null> {
    return this.prisma.$transaction(async (tx) => {
      const claimed = await this.markUsed(tx, token);
      if (!claimed) return null;
      const ref: TokenRef = { kind: claimed.kind, refId: claimed.refId };
      if (await this.isLinked(tx, ref)) return null;
      await this.consumeLiveTokens(tx, ref);
      // Latest link wins: telegramChatId is @unique per table, so clear the other record of THIS
      // kind that already holds this chat id before assigning it here — all in the same transaction.
      // The clear is same-kind only on purpose: one person can be both a Customer and an Investor,
      // so the same chat id may legitimately sit on one of each at once (cross-kind coexistence).
      const previousId = await this.chatHolderId(tx, ref.kind, chatId);
      if (previousId !== null) await this.setChat(tx, ref.kind, previousId, UNLINKED);
      await this.setChat(tx, ref.kind, ref.refId, {
        telegramChatId: chatId,
        telegramLinkedAt: new Date(),
        telegramLinkedById: claimed.issuedById,
      });
      if (claimed.issuedById !== null) {
        const entry = { userId: claimed.issuedById, entity: entityOf(ref.kind) };
        if (previousId !== null) {
          await this.audit.log(
            { ...entry, action: 'telegram_unlink', entityId: previousId, before: { telegramLinked: true }, after: { telegramLinked: false, via: 'relink' } },
            tx,
          );
        }
        await this.audit.log(
          { ...entry, action: 'telegram_link', entityId: ref.refId, before: { telegramLinked: false }, after: { telegramLinked: true, via: 'invite' } },
          tx,
        );
      }
      return ref;
    });
  }

  /**
   * Admin unlink (F24): clears the chat and its attribution, consumes every live token so an old link
   * still sitting in someone's chat can't re-link, and audits it under the actor — one transaction.
   * The caller checks 404 first; 400 when the record has no chat linked.
   */
  async unlink(kind: TelegramLinkKind, refId: number, actorId: number): Promise<void> {
    await this.prisma.$transaction(async (tx) => {
      if (!(await this.isLinked(tx, { kind, refId }))) throw new BadRequestException('Not linked');
      await this.setChat(tx, kind, refId, UNLINKED);
      await this.consumeLiveTokens(tx, { kind, refId });
      await this.audit.log(
        {
          userId: actorId,
          action: 'telegram_unlink',
          entity: entityOf(kind),
          entityId: refId,
          before: { telegramLinked: true },
          after: { telegramLinked: false },
        },
        tx,
      );
    });
  }

  /** Marks every unused token of the record as used. */
  private async consumeLiveTokens(tx: Prisma.TransactionClient, ref: TokenRef): Promise<void> {
    await tx.telegramLinkToken.updateMany({
      where: { kind: ref.kind, refId: ref.refId, usedAt: null },
      data: { usedAt: new Date() },
    });
  }

  /** Id of the record of this kind currently holding the chat (unique per table), or null. */
  private async chatHolderId(tx: Prisma.TransactionClient, kind: TelegramLinkKind, chatId: string): Promise<number | null> {
    const query = { where: { telegramChatId: chatId }, select: { id: true } };
    const row =
      kind === TelegramLinkKind.CUSTOMER ? await tx.customer.findUnique(query) : await tx.investor.findUnique(query);
    return row?.id ?? null;
  }

  /** Writes the three link columns on one Customer/Investor. */
  private async setChat(tx: Prisma.TransactionClient, kind: TelegramLinkKind, id: number, data: ChatFields): Promise<void> {
    if (kind === TelegramLinkKind.CUSTOMER) await tx.customer.update({ where: { id }, data });
    else await tx.investor.update({ where: { id }, data });
  }

  /** True when the target Customer/Investor already has a chat linked. */
  private async isLinked(tx: Prisma.TransactionClient, ref: TokenRef): Promise<boolean> {
    const query = { where: { id: ref.refId }, select: { telegramChatId: true } };
    const row =
      ref.kind === TelegramLinkKind.CUSTOMER
        ? await tx.customer.findUnique(query)
        : await tx.investor.findUnique(query);
    return Boolean(row?.telegramChatId);
  }

  /**
   * Finds a live token and claims it (usedAt = now) inside the caller's transaction. The guarded
   * updateMany makes the claim atomic, so two concurrent consumes can never both win. Returns the
   * ref and issuer when this call claimed it, else null.
   */
  private async markUsed(tx: Prisma.TransactionClient, token: string): Promise<ClaimedToken | null> {
    const now = new Date();
    const row = await tx.telegramLinkToken.findUnique({ where: { token } });
    if (!row || row.usedAt || row.expiresAt <= now) return null;
    const claim = await tx.telegramLinkToken.updateMany({
      where: { id: row.id, usedAt: null },
      data: { usedAt: now },
    });
    if (claim.count !== 1) return null; // another consume claimed it first
    return { kind: row.kind, refId: row.refId, issuedById: row.issuedById };
  }
}
