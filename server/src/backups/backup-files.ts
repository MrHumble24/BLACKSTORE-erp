import { readFile, readdir, rm, stat, writeFile } from 'node:fs/promises';
import { join } from 'node:path';

/** How many backups to keep per folder (contract: last 30). */
export const KEEP = 30;

export interface Backup {
  fileName: string;
  size: number;
  createdAt: string;
  sentToTelegram: boolean;
  secondCopy: boolean;
}

/** The two off-site flags plus the creation time, stored in a `<file>.json` sidecar. */
export interface Sidecar {
  sentToTelegram: boolean;
  secondCopy: boolean;
  createdAt: string;
}

/**
 * The only names a backup may have. Restore checks against it, which also blocks sidecars,
 * tmp files and path traversal in one go.
 */
export const BACKUP_NAME = /^blackstore-\d{4}-\d{2}-\d{2}-\d{6}\.sql\.gz\.enc$/;

/** Encrypted-dump file name at second precision, e.g. `blackstore-2026-10-22-030000.sql.gz.enc`. */
export function backupFileName(date: Date = new Date()): string {
  const p = (n: number) => String(n).padStart(2, '0');
  const time = `${p(date.getHours())}${p(date.getMinutes())}${p(date.getSeconds())}`;
  const stamp = `${date.getFullYear()}-${p(date.getMonth() + 1)}-${p(date.getDate())}-${time}`;
  return `blackstore-${stamp}.sql.gz.enc`;
}

/** Writes the sidecar next to its backup file. */
export async function writeSidecar(dir: string, fileName: string, meta: Sidecar): Promise<void> {
  await writeFile(join(dir, `${fileName}.json`), JSON.stringify(meta), 'utf8');
}

/** Reads one backup + its sidecar into a Backup, falling back to mtime if the sidecar is gone. */
export async function toBackup(dir: string, fileName: string): Promise<Backup> {
  const info = await stat(join(dir, fileName));
  try {
    const meta = JSON.parse(await readFile(join(dir, `${fileName}.json`), 'utf8')) as Sidecar;
    return { fileName, size: info.size, ...meta };
  } catch {
    return {
      fileName,
      size: info.size,
      createdAt: info.mtime.toISOString(),
      sentToTelegram: false,
      secondCopy: false,
    };
  }
}

/** Deletes all but the newest `keep` .enc files in a folder, each with its sidecar. */
export async function prune(dir: string, keep = KEEP): Promise<void> {
  const names = (await readdir(dir)).filter((n) => n.endsWith('.enc')).sort().reverse();
  await Promise.all(
    names.slice(keep).flatMap((name) => [
      rm(join(dir, name), { force: true }),
      rm(join(dir, `${name}.json`), { force: true }),
    ]),
  );
}
