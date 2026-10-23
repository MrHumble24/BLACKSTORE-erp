import { execFile } from 'node:child_process';
import { createReadStream, createWriteStream } from 'node:fs';
import { pipeline } from 'node:stream/promises';
import { promisify } from 'node:util';
import { createGunzip, createGzip } from 'node:zlib';

const exec = promisify(execFile);

/**
 * Runs a tool and rethrows any failure as `<tool> failed: <stderr>` only: the default
 * execFile error carries the full command line and env, which may hold credentials.
 */
async function run(tool: string, args: string[], env: NodeJS.ProcessEnv): Promise<void> {
  try {
    await exec(tool, args, { env: { ...process.env, ...env } });
  } catch (e) {
    const stderr = String((e as { stderr?: unknown }).stderr ?? '');
    // No `cause` on purpose: the original error is exactly what must not travel further.
    // eslint-disable-next-line preserve-caught-error
    throw new Error(`${tool} failed: ${stderr.slice(0, 500)}`);
  }
}

/** libpq env vars from a postgres URL, so the password never sits in argv or an error message. */
export function pgEnv(databaseUrl: string): NodeJS.ProcessEnv {
  const url = new URL(databaseUrl);
  return {
    PGHOST: decodeURIComponent(url.hostname),
    PGPORT: url.port || '5432',
    PGUSER: decodeURIComponent(url.username),
    PGPASSWORD: decodeURIComponent(url.password),
    PGDATABASE: decodeURIComponent(url.pathname.slice(1)),
  };
}

/**
 * The exact shell steps of a backup/restore, each with execFile (never a string-built shell
 * command, so no injection) and the passphrase passed only through an env var (never argv/logs).
 */

/** Plain-SQL dump of the database; --clean --if-exists so a restore replaces existing objects. */
export async function pgDump(databaseUrl: string, outSqlPath: string): Promise<void> {
  await run('pg_dump', ['--clean', '--if-exists', '--no-owner', '--no-privileges', '-f', outSqlPath], pgEnv(databaseUrl));
}

/** Restores a plain-SQL dump in one transaction so a failure leaves the database untouched. */
export async function psqlRestore(databaseUrl: string, sqlPath: string): Promise<void> {
  await run('psql', ['--single-transaction', '-v', 'ON_ERROR_STOP=1', '-f', sqlPath], pgEnv(databaseUrl));
}

/** openssl AES-256-CBC + PBKDF2 encrypt; the passphrase is read from the child's env only. */
export async function encryptFile(inPath: string, outPath: string, passphrase: string): Promise<void> {
  await run(
    'openssl',
    ['enc', '-aes-256-cbc', '-pbkdf2', '-salt', '-in', inPath, '-out', outPath, '-pass', 'env:BACKUP_PASSPHRASE'],
    { BACKUP_PASSPHRASE: passphrase },
  );
}

/** Reverse of encryptFile. */
export async function decryptFile(inPath: string, outPath: string, passphrase: string): Promise<void> {
  await run(
    'openssl',
    ['enc', '-d', '-aes-256-cbc', '-pbkdf2', '-in', inPath, '-out', outPath, '-pass', 'env:BACKUP_PASSPHRASE'],
    { BACKUP_PASSPHRASE: passphrase },
  );
}

/** Streams a gzip of one file to another (node zlib, so no system gzip dependency). */
export async function gzipFile(inPath: string, outPath: string): Promise<void> {
  await pipeline(createReadStream(inPath), createGzip(), createWriteStream(outPath));
}

/** Reverse of gzipFile; the output is gunzip-compatible for the manual restore too. */
export async function gunzipFile(inPath: string, outPath: string): Promise<void> {
  await pipeline(createReadStream(inPath), createGunzip(), createWriteStream(outPath));
}
