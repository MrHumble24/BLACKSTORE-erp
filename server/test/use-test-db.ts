import { assertTestDatabase, testDatabaseUrl } from './test-db';

// Jest `setupFiles` entry: runs before every e2e spec's imports, so AppModule, ConfigModule
// and PrismaService only ever see the `_test` database. dotenv never overrides a set var.
process.env.DATABASE_URL = testDatabaseUrl();
assertTestDatabase(process.env.DATABASE_URL);
