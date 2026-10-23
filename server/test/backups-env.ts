import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

/**
 * Backup e2e env. ConfigModule reads env when AppModule loads, so backups.e2e-spec imports this
 * file first: a temp BACKUP_DIR, a passphrase, and no second copy or Telegram.
 */
export const backupDir = mkdtempSync(join(tmpdir(), 'bk-e2e-'));
process.env.BACKUP_DIR = backupDir;
process.env.BACKUP_SECOND_DIR = '';
process.env.BACKUP_PASSPHRASE = 'e2e-passphrase-0123456789';
process.env.TELEGRAM_BOT_TOKEN = '';
