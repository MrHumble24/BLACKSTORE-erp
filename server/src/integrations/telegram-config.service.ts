import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Prisma } from '@prisma/client';
import { AuditService } from '../audit/audit.service';
import { PrismaService } from '../prisma/prisma.service';
import { EncryptedBlob, decrypt, encrypt, parseEncKey } from '../common/crypto';
import { TelegramBot, TelegramChat, getMe } from '../common/telegram';
import { SaveTelegramDto, UpdateTelegramSettingsDto } from './dto/save-telegram.dto';

const TELEGRAM_KEY = 'telegram';
/** The chat picker lists only the most recently seen chats. */
const CHAT_LIST_LIMIT = 50;

/** Per-feature on/off flags; only shipped Telegram features appear here. */
export interface TelegramFeatures {
  lowStockDigest: boolean;
  ownerSnapshot: boolean;
  // Customer-facing features (F17). Default OFF — they message external people, so the owner opts in.
  customerReceipts: boolean;
  debtReminders: boolean;
  warrantyReminders: boolean;
  // Monthly per-investor report cron (F18, roadmap #6). Default OFF — it messages external investors.
  investorReports: boolean;
  // Day close and cash variance alerts to owner (Phase 1). Default ON.
  dayCloseAlerts: boolean;
  // Owner alert per Watcher match (F34). Default OFF: the Watcher's own bot already alerts the owner.
  matchAlerts: boolean;
}

/** The 'telegram' Setting row value. The token is stored encrypted and never leaves the server. */
interface TelegramConfig {
  botTokenEnc: EncryptedBlob | null;
  botUsername: string;
  botName: string;
  backupChatId: string;
  alertChatId: string;
  enabled: boolean;
  features: TelegramFeatures;
}

/** What the config endpoints return: everything except the token. */
export type TelegramStatus = Omit<TelegramConfig, 'botTokenEnc'> & { configured: boolean };

/** Resolved credentials for the backup + digest senders. */
export interface TelegramCredentials {
  token: string;
  backupChatId: string;
  alertChatId: string;
}

/** Everything the inbound poll loop needs from a SINGLE row read per cycle (avoids triple-reading). */
export interface TelegramRuntime {
  enabled: boolean; // master switch: flag on AND a token resolves
  token: string;
  alertChatId: string;
  ownerSnapshotEnabled: boolean; // enabled AND the ownerSnapshot feature flag
  features: TelegramFeatures; // per-feature flags, for the bot's button menu (F22)
}

/**
 * Reads/writes the single 'telegram' Setting row (F12): verify a bot token, store it encrypted,
 * and hand resolved credentials (DB first, env fallback) to the backup and low-stock senders.
 */
@Injectable()
export class TelegramConfigService {
  private readonly logger = new Logger(TelegramConfigService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
    private readonly audit: AuditService,
  ) {}

  /** Config safe to return (no token). */
  async getStatus(): Promise<TelegramStatus> {
    return this.toStatus(await this.read());
  }

  /**
   * Token + chat ids for the senders. Uses the stored token when it decrypts; on unset OR decrypt
   * failure, falls back to env (logging a warning for a failure) — never throws.
   */
  async getCredentials(): Promise<TelegramCredentials> {
    const c = await this.read();
    const token = this.decryptToken(c);
    if (token) {
      return {
        token,
        backupChatId: c.backupChatId || this.env('TELEGRAM_BACKUP_CHAT_ID'),
        alertChatId: c.alertChatId || this.env('TELEGRAM_ALERT_CHAT_ID'),
      };
    }
    return {
      token: this.env('TELEGRAM_BOT_TOKEN'),
      backupChatId: this.env('TELEGRAM_BACKUP_CHAT_ID'),
      alertChatId: this.env('TELEGRAM_ALERT_CHAT_ID'),
    };
  }

  /**
   * One-shot read for the inbound poll loop: resolves token + alert chat + both gates from a SINGLE
   * row read, so a 5s cycle no longer reads the row three times (isEnabled + getCredentials +
   * isFeatureEnabled). Same semantics as those methods, just folded into one read.
   */
  async getRuntime(): Promise<TelegramRuntime> {
    const c = await this.read();
    const token = this.decryptToken(c) || this.env('TELEGRAM_BOT_TOKEN');
    const enabled = c.enabled && token !== '';
    return {
      enabled,
      token,
      alertChatId: c.alertChatId || this.env('TELEGRAM_ALERT_CHAT_ID'),
      ownerSnapshotEnabled: enabled && (c.features.ownerSnapshot ?? true),
      features: c.features,
    };
  }

  /** False when the master switch is off; otherwise the flag's value (missing flag defaults to on). */
  async isFeatureEnabled(key: keyof TelegramFeatures): Promise<boolean> {
    const c = await this.read();
    if (!c.enabled) return false;
    return c.features[key] ?? true;
  }

  /** Checks a token with Telegram and returns the bot identity; does not save. */
  async verify(token: string): Promise<TelegramBot> {
    try {
      return await getMe(token);
    } catch (e) {
      throw new BadRequestException(e instanceof Error ? e.message : 'Telegram verification failed');
    }
  }

  /** Verifies, encrypts and saves the token plus chat ids and flags; audited (no token in the log). */
  async save(dto: SaveTelegramDto, actorId: number): Promise<TelegramStatus> {
    const key = this.key();
    if (!key) {
      throw new BadRequestException('TELEGRAM_ENC_KEY is not configured; cannot store the token');
    }
    const bot = await this.verify(dto.token);
    const before = await this.read();
    const next: TelegramConfig = {
      botTokenEnc: encrypt(dto.token, key),
      botUsername: bot.username,
      botName: bot.name,
      backupChatId: dto.backupChatId ?? before.backupChatId,
      alertChatId: dto.alertChatId ?? before.alertChatId,
      enabled: dto.enabled ?? before.enabled,
      features: { ...before.features, ...definedFlags(dto.features) },
    };
    // A different bot sees different chats: forget the old bot's chats in the same transaction.
    // Compare against the token in use (stored, else env) so re-saving the env bot keeps its chats.
    const tokenChanged = (this.decryptToken(before) || this.env('TELEGRAM_BOT_TOKEN')) !== dto.token;
    await this.persist(next, before, actorId, tokenChanged);
    return this.toStatus(next);
  }

  /**
   * Updates toggles / chat ids WITHOUT a token, keeping the stored bot. Requires a bot already
   * configured (else 400) — there is nothing to attach these settings to otherwise.
   */
  async updateSettings(dto: UpdateTelegramSettingsDto, actorId: number): Promise<TelegramStatus> {
    const before = await this.read();
    if (!before.botTokenEnc) {
      throw new BadRequestException('No Telegram bot is configured; connect a bot with a token first');
    }
    const next: TelegramConfig = {
      ...before, // keeps botTokenEnc / botUsername / botName untouched
      backupChatId: dto.backupChatId ?? before.backupChatId,
      alertChatId: dto.alertChatId ?? before.alertChatId,
      enabled: dto.enabled ?? before.enabled,
      features: { ...before.features, ...definedFlags(dto.features) },
    };
    await this.persist(next, before, actorId);
    return this.toStatus(next);
  }

  /**
   * Upserts the 'telegram' row and audits the change (status snapshots only — never the token).
   * `clearChats` empties TelegramKnownChat in the same transaction (the bot changed).
   */
  private async persist(
    next: TelegramConfig,
    before: TelegramConfig,
    actorId: number,
    clearChats = false,
  ): Promise<void> {
    await this.prisma.$transaction(async (tx) => {
      if (clearChats) await tx.telegramKnownChat.deleteMany({});
      await tx.setting.upsert({
        where: { key: TELEGRAM_KEY },
        create: { key: TELEGRAM_KEY, value: next as unknown as Prisma.InputJsonObject },
        update: { value: next as unknown as Prisma.InputJsonObject },
      });
      await this.audit.log(
        { userId: actorId, action: 'update', entity: 'Setting', entityId: 0, before: this.toStatus(before), after: this.toStatus(next) },
        tx,
      );
    });
  }

  /**
   * Clears the stored config (back to env fallback) and the known chats; audited. Known race,
   * acceptable: a poll already in flight may write one old chat back; the next bot change clears it.
   */
  async clear(actorId: number): Promise<void> {
    const before = await this.read();
    await this.prisma.$transaction(async (tx) => {
      await tx.setting.deleteMany({ where: { key: TELEGRAM_KEY } });
      await tx.telegramKnownChat.deleteMany({});
      await this.audit.log(
        { userId: actorId, action: 'delete', entity: 'Setting', entityId: 0, before: this.toStatus(before), after: null },
        tx,
      );
    });
  }

  /**
   * Chats the poller has seen (F21), newest first, for the UI picker. Empty without a bot on purpose:
   * leftover rows must not show when no bot is set.
   */
  async getChats(): Promise<TelegramChat[]> {
    const { token } = await this.getCredentials();
    if (!token) return [];
    const rows = await this.prisma.telegramKnownChat.findMany({
      select: { chatId: true, title: true, type: true },
      orderBy: { lastSeenAt: 'desc' },
      take: CHAT_LIST_LIMIT,
    });
    return rows.map((r) => ({ id: r.chatId, title: r.title, type: r.type }));
  }

  /** Reads the row and fills defaults (enabled + every flag default on, preserving old behaviour). */
  private async read(): Promise<TelegramConfig> {
    const row = await this.prisma.setting.findUnique({ where: { key: TELEGRAM_KEY } });
    const s = (row?.value ?? {}) as Partial<TelegramConfig>;
    return {
      botTokenEnc: s.botTokenEnc ?? null,
      botUsername: s.botUsername ?? '',
      botName: s.botName ?? '',
      backupChatId: s.backupChatId ?? '',
      alertChatId: s.alertChatId ?? '',
      enabled: s.enabled ?? true,
      features: {
        lowStockDigest: s.features?.lowStockDigest ?? true,
        ownerSnapshot: s.features?.ownerSnapshot ?? true, // missing flag = on, same as lowStockDigest
        // Customer-facing features default OFF: isFeatureEnabled does `?? true` for a missing key, so
        // this `?? false` in read() is the ONLY thing that keeps them off until the owner opts in.
        customerReceipts: s.features?.customerReceipts ?? false,
        debtReminders: s.features?.debtReminders ?? false,
        warrantyReminders: s.features?.warrantyReminders ?? false,
        // Investor reports message external investors → OFF until the owner opts in (same `?? false`
        // reason as the customer flags above: isFeatureEnabled defaults a MISSING flag to on).
        investorReports: s.features?.investorReports ?? false,
        dayCloseAlerts: s.features?.dayCloseAlerts ?? true,
        // OFF until opted in (same `?? false` reason as above): on would double the Watcher's alerts.
        matchAlerts: s.features?.matchAlerts ?? false,
      },
    };
  }

  /** Decrypts the stored token, or null (with a warning) when the key is missing or decryption fails. */
  private decryptToken(c: TelegramConfig): string | null {
    if (!c.botTokenEnc) return null; // unset: silent env fallback
    const key = this.key();
    if (!key) {
      this.logger.warn('Telegram token is stored but TELEGRAM_ENC_KEY is unset; using env fallback');
      return null;
    }
    try {
      return decrypt(c.botTokenEnc, key);
    } catch (e) {
      this.logger.warn(
        `Telegram token decryption failed (${e instanceof Error ? e.message : String(e)}); using env fallback`,
      );
      return null;
    }
  }

  private key(): Buffer | null {
    const raw = this.env('TELEGRAM_ENC_KEY');
    return raw ? parseEncKey(raw) : null;
  }

  private env(name: string): string {
    return this.config.get<string>(name) ?? '';
  }

  private toStatus(c: TelegramConfig): TelegramStatus {
    const { botTokenEnc, ...rest } = c;
    return { ...rest, configured: botTokenEnc != null };
  }
}

/** Flags the DTO actually sets (`?? before` per key): spread over the old flags, the rest are kept. */
function definedFlags(dto: Partial<TelegramFeatures> | undefined): Partial<TelegramFeatures> {
  return Object.fromEntries(Object.entries(dto ?? {}).filter(([, v]) => v != null));
}
