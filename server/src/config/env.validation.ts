import { plainToInstance } from 'class-transformer';
import { parseEncKey } from '../common/crypto';
import {
  IsIn,
  IsInt,
  IsNotEmpty,
  IsString,
  Min,
  MinLength,
  ValidateIf,
  validateSync,
} from 'class-validator';

/** Every environment variable the server reads, with defaults for the optional ones. */
export class EnvironmentVariables {
  @IsString()
  @IsNotEmpty()
  DATABASE_URL!: string;

  @IsString()
  @MinLength(32, { message: 'JWT_SECRET must be at least 32 characters' })
  JWT_SECRET!: string;

  @IsString()
  CORS_ORIGIN: string = 'http://localhost:5173';

  @IsInt()
  @Min(1)
  SESSION_TTL_MINUTES: number = 30;

  @IsInt()
  @Min(1)
  PORT: number = 3000;

  @IsIn(['development', 'production', 'test'])
  NODE_ENV: string = 'development';

  // ── Backups (F07) ──────────────────────────────────────────
  // Where encrypted daily dumps are written. Defaults to a local folder.
  @IsString()
  BACKUP_DIR: string = './backups';

  // A second copy on separate storage (network/cloud mount); off when empty.
  @IsString()
  BACKUP_SECOND_DIR: string = '';

  // openssl passphrase for the dumps; required in production, optional elsewhere.
  @ValidateIf((o: EnvironmentVariables) => o.NODE_ENV === 'production')
  @IsNotEmpty({ message: 'BACKUP_PASSPHRASE is required in production' })
  @IsString()
  @MinLength(16, { message: 'BACKUP_PASSPHRASE must be at least 16 characters' })
  BACKUP_PASSPHRASE: string = '';

  // Telegram off-site copy; skipped with a warning when either is empty.
  @IsString()
  TELEGRAM_BOT_TOKEN: string = '';

  @IsString()
  TELEGRAM_BACKUP_CHAT_ID: string = '';

  // Low-stock alerts chat (F11); empty = Telegram alerts off.
  @IsString()
  TELEGRAM_ALERT_CHAT_ID: string = '';

  // Key for encrypting the in-app Telegram token (F12); 32 bytes hex/base64.
  // Empty = in-app config disabled (env token still works). No hard-coded fallback.
  @IsString()
  TELEGRAM_ENC_KEY: string = '';

  // ── Super admin (F12, seed only) ───────────────────────────
  // Dedicated super-admin login, separate from the owner's Admin account.
  // Empty SUPER_ADMIN_PASSWORD => the seed skips the user (no guessable default).
  @IsString()
  SUPER_ADMIN_PHONE: string = '';

  @IsString()
  SUPER_ADMIN_PASSWORD: string = '';
}

/** Used by ConfigModule: fails startup with a list of every bad or missing variable. */
export function validateEnv(
  config: Record<string, unknown>,
): EnvironmentVariables {
  const env = plainToInstance(EnvironmentVariables, config, {
    enableImplicitConversion: true,
  });
  const errors = validateSync(env);
  if (errors.length > 0) {
    const details = errors
      .map((e) => Object.values(e.constraints ?? {}).join(', '))
      .join('\n  - ');
    throw new Error(`Invalid environment configuration:\n  - ${details}`);
  }
  // When set, the encryption key must decode to exactly 32 bytes (checked once, at startup).
  if (env.TELEGRAM_ENC_KEY) {
    try {
      parseEncKey(env.TELEGRAM_ENC_KEY);
    } catch (e) {
      throw new Error(
        `Invalid environment configuration:\n  - ${e instanceof Error ? e.message : String(e)}`,
        { cause: e },
      );
    }
  }
  return env;
}
