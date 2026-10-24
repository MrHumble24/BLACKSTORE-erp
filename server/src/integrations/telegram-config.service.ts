import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Prisma } from '@prisma/client';
import { AuditService } from '../audit/audit.service';
import { PrismaService } from '../prisma/prisma.service';
import { EncryptedBlob, decrypt, encrypt, parseEncKey } from '../common/crypto';
import { TelegramBot, TelegramChat, getMe, getUpdates } from '../common/telegram';
import { SaveTelegramDto, UpdateTelegramSettingsDto } from './dto/save-telegram.dto';

const TELEGRAM_KEY = 'telegram';

/** Per-feature on/off flags; only shipped Telegram features appear here. */
export interface TelegramFeatures {
  lowStockDigest: boolean;
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
      features: { lowStockDigest: dto.features?.lowStockDigest ?? before.features.lowStockDigest },
    };
    await this.persist(next, before, actorId);
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
      features: { lowStockDigest: dto.features?.lowStockDigest ?? before.features.lowStockDigest },
    };
    await this.persist(next, before, actorId);
    return this.toStatus(next);
  }

  /** Upserts the 'telegram' row and audits the change (status snapshots only — never the token). */
  private async persist(next: TelegramConfig, before: TelegramConfig, actorId: number): Promise<void> {
    await this.prisma.$transaction(async (tx) => {
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

  /** Clears the stored config (back to env fallback); audited. */
  async clear(actorId: number): Promise<void> {
    const before = await this.read();
    await this.prisma.$transaction(async (tx) => {
      await tx.setting.deleteMany({ where: { key: TELEGRAM_KEY } });
      await this.audit.log(
        { userId: actorId, action: 'delete', entity: 'Setting', entityId: 0, before: this.toStatus(before), after: null },
        tx,
      );
    });
  }

  /** Recent distinct chats the bot can see, for the UI picker; empty when none/unconfigured. */
  async getChats(): Promise<TelegramChat[]> {
    const { token } = await this.getCredentials();
    if (!token) return [];
    return getUpdates(token);
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
      features: { lowStockDigest: s.features?.lowStockDigest ?? true },
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
