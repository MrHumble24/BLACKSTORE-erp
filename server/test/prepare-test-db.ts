import { execSync } from 'node:child_process';
import { Client } from 'pg';
import { assertTestDatabase, databaseName, testDatabaseUrl, withDatabase } from './test-db';

/**
 * `pretest:e2e`: creates `<db>_test` if missing, then applies migrations and the seed to it.
 * Connects to the server's `postgres` maintenance DB with the same credentials as DATABASE_URL.
 */
async function main(): Promise<void> {
  const url = testDatabaseUrl();
  assertTestDatabase(url);
  const name = databaseName(url);

  const admin = new Client({ connectionString: withDatabase(url, 'postgres') });
  await admin.connect();
  try {
    const found = await admin.query('SELECT 1 FROM pg_database WHERE datname = $1', [name]);
    if (found.rowCount === 0) {
      // Identifiers can't be bound as parameters; quote and escape the name instead.
      await admin.query(`CREATE DATABASE "${name.replace(/"/g, '""')}"`);
      console.log(`Created database ${name}`);
    }
  } finally {
    await admin.end();
  }

  const env = { ...process.env, DATABASE_URL: url };
  execSync('npx prisma migrate deploy', { stdio: 'inherit', env });
  execSync('npx prisma db seed', { stdio: 'inherit', env });
}

main().catch((err: unknown) => {
  console.error(err);
  process.exit(1);
});
