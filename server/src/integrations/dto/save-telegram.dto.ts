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
}

/** Verify + save the Telegram bot token, chat ids and feature flags. */
export class SaveTelegramDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  token!: string;

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
