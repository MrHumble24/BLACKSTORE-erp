import { assertTestDatabase, testDatabaseUrl } from './test-db';

// Jest `setupFiles` entry: runs before every e2e spec's imports, so AppModule, ConfigModule
// and PrismaService only ever see the `_test` database. dotenv never overrides a set var.
process.env.DATABASE_URL = testDatabaseUrl();
assertTestDatabase(process.env.DATABASE_URL);
// Fixed Watcher webhook secret so the F34 webhook e2e can sign requests (never a real secret).
process.env.WATCHER_WEBHOOK_SECRET = 'e2e-watcher-webhook-secret-0123456789abcdef';
// Blank Watcher URL/key so e2e never pushes watches to a live Watcher (dotenv treats empty as set).
process.env.WATCHER_URL = '';
process.env.WATCHER_API_KEY = '';
