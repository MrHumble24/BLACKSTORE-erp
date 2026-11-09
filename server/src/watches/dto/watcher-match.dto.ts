import {
  IsIn,
  IsISO8601,
  IsNotEmpty,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
} from 'class-validator';
import { MONEY_REGEX } from '../../common/money';
import { WATCH_CURRENCIES } from './create-watch.dto';

/**
 * Body the Watcher POSTs for one match (contract F34-API-01 section 2). Strict on purpose: this
 * is the ERP's first public write endpoint. Nullable fields accept null or a missing key.
 */
export class WatcherMatchDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  matchId!: string;

  // ERP Watch.id as a string; up to 9 digits keeps it inside a Postgres Int.
  @Matches(/^\d{1,9}$/, { message: 'watchExternalId must be a numeric string' })
  watchExternalId!: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  device!: string;

  @IsOptional()
  @Matches(MONEY_REGEX, { message: 'price must be a decimal string' })
  price?: string | null;

  @IsOptional()
  @IsIn(WATCH_CURRENCIES)
  currency?: (typeof WATCH_CURRENCIES)[number] | null;

  @IsOptional()
  @IsString()
  @MaxLength(40)
  condition?: string | null;

  @Matches(/^(0(\.\d{1,3})?|1(\.0{1,3})?)$/, { message: 'confidence must be a decimal string 0–1' })
  confidence!: string;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  sellerName?: string | null;

  @IsOptional()
  @Matches(/^\d{1,32}$/, { message: 'sellerTelegramId must be a numeric string' })
  sellerTelegramId?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(64)
  sellerUsername?: string | null;

  @IsString()
  @IsNotEmpty()
  @MaxLength(4096)
  messageText!: string;

  // Null for basic Telegram groups, which have no message links.
  @IsOptional()
  @IsString()
  @MaxLength(500)
  @Matches(/^https:\/\/t\.me\//, { message: 'messageLink must be a https://t.me/ link' })
  messageLink?: string | null;

  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  group!: string;

  @IsOptional()
  @IsString()
  @MaxLength(4096)
  parentText?: string | null;

  @IsISO8601({ strict: true })
  createdAt!: string;
}
