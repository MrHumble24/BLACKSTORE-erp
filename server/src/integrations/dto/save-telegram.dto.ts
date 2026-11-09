import { Type } from 'class-transformer';
import {
  IsBoolean,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
  ValidateNested,
} from 'class-validator';

/** Per-feature on/off flags (F12). Only shipped features appear here. */
export class TelegramFeaturesDto {
  // Daily low-stock digest cron (feature #7).
  @IsOptional()
  @IsBoolean()
  lowStockDigest?: boolean;

  // Daily owner business snapshot cron (Telegram roadmap #1).
  @IsOptional()
  @IsBoolean()
  ownerSnapshot?: boolean;

  // Send a Telegram receipt to a linked customer after each sale (F17, roadmap #3). Default off.
  @IsOptional()
  @IsBoolean()
  customerReceipts?: boolean;

  // Weekly debt reminder to linked customers who owe money (F17, roadmap #4). Default off.
  @IsOptional()
  @IsBoolean()
  debtReminders?: boolean;

  // Daily warranty-expiry reminder to linked customers (F17, roadmap #4). Default off.
  @IsOptional()
  @IsBoolean()
  warrantyReminders?: boolean;

  // Monthly per-investor report cron (F18, roadmap #6). Default off.
  @IsOptional()
  @IsBoolean()
  investorReports?: boolean;

  // Day close and cash variance alerts to owner (Phase 1). Default on.
  @IsOptional()
  @IsBoolean()
  dayCloseAlerts?: boolean;

  // Owner alert per Watcher match (F34). Default off: the Watcher's own bot already alerts.
  @IsOptional()
  @IsBoolean()
  matchAlerts?: boolean;
}

/** Everyday Telegram settings (no token): toggles + chat ids. Needs a bot already configured. */
export class UpdateTelegramSettingsDto {
  @IsOptional()
  @IsString()
  @MaxLength(100)
  backupChatId?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  alertChatId?: string;

  // Master Telegram switch; when false every Telegram facility is off.
  @IsOptional()
  @IsBoolean()
  enabled?: boolean;

  @IsOptional()
  @ValidateNested()
  @Type(() => TelegramFeaturesDto)
  features?: TelegramFeaturesDto;
}

/** Connect/replace the bot: everything above plus a token to verify and store. */
export class SaveTelegramDto extends UpdateTelegramSettingsDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  token!: string;
}
