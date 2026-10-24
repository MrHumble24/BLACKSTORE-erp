import {
  BadRequestException,
  ConflictException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Cron } from '@nestjs/schedule';
import { access, copyFile, mkdir, readdir, rm, stat } from 'node:fs/promises';
import { join } from 'node:path';
import type { PublicUser } from '../common/auth-user';
import { AuditService } from '../audit/audit.service';
import {
  decryptFile,
  encryptFile,
  gunzipFile,
  gzipFile,
  pgDump,
  psqlRestore,
} from './backup-runner';
import {
  BACKUP_NAME,
  backupFileName,
  prune,
  toBackup,
  writeSidecar,
  type Backup,
  type Sidecar,
  KEEP,
} from './backup-files';
import { sendDocument, telegramSkipReason } from '../common/telegram';
import { TelegramConfigService } from '../integrations/telegram-config.service';

export interface RestoreResult {
  restoredFrom: string;
  safetyBackup: string;
  finishedAt: string;
}

/** Backup dirs hold full database dumps: owner-only access. */
const DIR_MODE = 0o700;

// ponytail: in-process flag, fine for the single server process; use a DB advisory lock if it ever scales out.
let busy = false;

/** True when the path exists. */
function exists(path: string): Promise<boolean> {
  return access(path).then(
    () => true,
    () => false,
  );
}

/** Runs one backup or restore at a time; a second one while it runs gets 409. */
async function exclusive<T>(work: () => Promise<T>): Promise<T> {
  if (busy) throw new ConflictException('A backup or restore is already running');
  busy = true;
  try {
    return await work();
  } finally {
    busy = false;
  }
}

/** Encrypted database dumps (FR-31): a daily cron, a manual run, a listing and a restore. */
@Injectable()
export class BackupsService {
  private readonly logger = new Logger(BackupsService.name);

  constructor(
    private readonly config: ConfigService,
    private readonly audit: AuditService,
    private readonly telegram: TelegramConfigService,
  ) {}

  /** Daily off-hours dump; failures are logged, never thrown (the cron must keep running). */
  @Cron('0 3 * * *')
  async scheduledBackup(): Promise<void> {
    try {
      const backup = await this.run();
      this.logger.log(`Daily backup written: ${backup.fileName}`);
    } catch (e) {
      this.logger.error(`Daily backup failed: ${e instanceof Error ? e.message : String(e)}`);
    }
  }

  /** Manual or cron backup; one at a time (409 while another backup or restore runs). */
  run(): Promise<Backup> {
    return exclusive(() => this.dump(true));
  }

  /**
   * Dumps → gzip → encrypts into BACKUP_DIR, then the off-site copies, then (if `pruneAfter`)
   * prunes to 30. Restore passes false so its safety backup can't delete the file being restored.
   */
  private async dump(pruneAfter: boolean): Promise<Backup> {
    const dir = this.dir();
    await mkdir(dir, { recursive: true, mode: DIR_MODE });
    const fileName = backupFileName();
    const encPath = join(dir, fileName);
    // Names are per second: never overwrite (a restore's safety dump could clobber its own source).
    if (await exists(encPath)) throw new ConflictException('A backup was just taken; try again in a second');
    const tmpSql = join(dir, `.tmp-${Date.now()}.sql`);
    const tmpGz = `${tmpSql}.gz`;
    try {
      await pgDump(this.databaseUrl(), tmpSql);
      await gzipFile(tmpSql, tmpGz);
      await encryptFile(tmpGz, encPath, this.passphrase());
    } finally {
      await rm(tmpSql, { force: true });
      await rm(tmpGz, { force: true });
    }

    const sentToTelegram = await this.maybeTelegram(encPath);
    const meta: Sidecar = { sentToTelegram, secondCopy: false, createdAt: new Date().toISOString() };
    meta.secondCopy = await this.copyToSecond(dir, fileName, meta);
    await writeSidecar(dir, fileName, meta);
    if (pruneAfter) await this.pruneAll();

    const { size } = await stat(encPath);
    return { fileName, size, ...meta };
  }

  /** The newest backups (last 30), each with its two off-site flags from the sidecar. */
  async list(): Promise<Backup[]> {
    const dir = this.dir();
    await mkdir(dir, { recursive: true, mode: DIR_MODE });
    const names = (await readdir(dir)).filter((n) => n.endsWith('.enc'));
    const backups = await Promise.all(names.map((name) => toBackup(dir, name)));
    return backups.sort((a, b) => b.createdAt.localeCompare(a.createdAt)).slice(0, KEEP);
  }

  /** Takes a safety backup, then decrypts + gunzips + restores the chosen dump in one transaction. */
  async restore(fileName: string, confirm: string, actor: PublicUser): Promise<RestoreResult> {
    if (!BACKUP_NAME.test(fileName)) throw new BadRequestException('Invalid backup file name');
    const dir = this.dir();
    const encPath = join(dir, fileName);
    if (!(await exists(encPath))) throw new NotFoundException('Backup not found');
    if (confirm !== fileName) throw new BadRequestException('confirm must equal the file name');
    return exclusive(() => this.restoreFrom(fileName, actor));
  }

  /** The restore itself, run under the in-flight flag; prunes only after it succeeded. */
  private async restoreFrom(fileName: string, actor: PublicUser): Promise<RestoreResult> {
    const dir = this.dir();
    const encPath = join(dir, fileName);
    const safety = await this.dump(false);
    const tmpGz = join(dir, `.restore-${Date.now()}.gz`);
    const tmpSql = `${tmpGz}.sql`;
    try {
      await decryptFile(encPath, tmpGz, this.passphrase());
      await gunzipFile(tmpGz, tmpSql);
      // ponytail: no maintenance mode; a request that lands mid-restore may fail once — fine for a shop.
      await psqlRestore(this.databaseUrl(), tmpSql);
    } finally {
      await rm(tmpGz, { force: true });
      await rm(tmpSql, { force: true });
    }
    await this.pruneAll();
    // Audited after the restore, so the row lands in the restored database.
    await this.audit.log({
      userId: actor.id,
      action: 'restore',
      entity: 'Backup',
      entityId: 0,
      after: { restoredFrom: fileName, safetyBackup: safety.fileName },
    });
    return { restoredFrom: fileName, safetyBackup: safety.fileName, finishedAt: new Date().toISOString() };
  }

  /** Sends the dump to Telegram when configured and under the size cap; else logs and skips. */
  private async maybeTelegram(encPath: string): Promise<boolean> {
    const { token, backupChatId: chatId } = await this.telegram.getCredentials();
    const { size } = await stat(encPath);
    const skip = telegramSkipReason(token, chatId, size);
    if (skip) {
      this.logger.warn(skip);
      return false;
    }
    try {
      return await sendDocument(token, chatId, encPath);
    } catch {
      this.logger.warn('Telegram send failed; the local copy is kept');
      return false;
    }
  }

  /** Copies the dump and its sidecar to the separate-storage folder; true only if the copy worked. */
  private async copyToSecond(dir: string, fileName: string, meta: Sidecar): Promise<boolean> {
    const second = this.secondDir();
    if (!second) return false;
    try {
      await mkdir(second, { recursive: true, mode: DIR_MODE });
      await copyFile(join(dir, fileName), join(second, fileName));
      await writeSidecar(second, fileName, { ...meta, secondCopy: true });
      return true;
    } catch {
      this.logger.warn('Second-copy write failed; the local copy is kept');
      return false;
    }
  }

  /** Keeps the newest 30 in both folders. */
  private async pruneAll(): Promise<void> {
    await prune(this.dir());
    const second = this.secondDir();
    if (second) await prune(second);
  }

  private databaseUrl(): string {
    return this.config.getOrThrow<string>('DATABASE_URL');
  }
  private passphrase(): string {
    return this.config.get<string>('BACKUP_PASSPHRASE') ?? '';
  }
  private dir(): string {
    return this.config.get<string>('BACKUP_DIR') || './backups';
  }
  private secondDir(): string {
    return this.config.get<string>('BACKUP_SECOND_DIR') ?? '';
  }
}
