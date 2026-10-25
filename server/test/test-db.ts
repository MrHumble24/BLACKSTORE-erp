import { config } from 'dotenv';
import { join } from 'node:path';

/**
 * E2E database naming. The e2e suite never runs on the dev database: it uses `<db>_test`,
 * derived from DATABASE_URL in `.env` so no credentials are duplicated here.
 */

/** Loads server/.env (existing env vars win) and returns DATABASE_URL, failing loudly if missing. */
function devDatabaseUrl(): string {
  config({ path: join(__dirname, '..', '.env'), quiet: true });
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error('DATABASE_URL is not set (server/.env)');
  return url;
}

/** Returns `url` with its database name (the path segment) replaced; the query string is kept. */
export function withDatabase(url: string, name: string): string {
  const parsed = new URL(url);
  parsed.pathname = `/${name}`;
  return parsed.toString();
}

/** Database name in a postgres URL. */
export function databaseName(url: string): string {
  return decodeURIComponent(new URL(url).pathname.slice(1));
}

/** The e2e database URL: DATABASE_URL with `_test` appended to the name (idempotent). */
export function testDatabaseUrl(): string {
  const url = devDatabaseUrl();
  const name = databaseName(url);
  return name.endsWith('_test') ? url : withDatabase(url, `${name}_test`);
}

/** Throws unless `url` points at a `_test` database; the last line of defence for the dev DB. */
export function assertTestDatabase(url: string): void {
  const name = databaseName(url);
  if (!name.endsWith('_test')) {
    throw new Error(`Refusing to run e2e on "${name}": the database name must end with _test`);
  }
}
