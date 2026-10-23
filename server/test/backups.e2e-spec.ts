// Must stay the first import: sets BACKUP_DIR & co. before AppModule (and ConfigModule) load.
import { backupDir } from './backups-env';
import { INestApplication } from '@nestjs/common';
import { App } from 'supertest/types';
import { access, rm } from 'node:fs/promises';
import { join } from 'node:path';
import { PrismaService } from './../src/prisma/prisma.service';
import { cleanupUsers, createTestApp, loginAs, seedUsers } from './e2e-setup';

// FR-31 backups: manual run and restore against a temp BACKUP_DIR.
// Needs pg_dump, psql and openssl. A restore replaces the whole database, so e2e runs in band.
describe('Backups (e2e)', () => {
  let app: INestApplication<App>;
  let prisma: PrismaService;
  let staffPhone = '';
  let adminPhone = '';
  let fileName = '';

  beforeAll(async () => {
    app = await createTestApp();
    prisma = app.get(PrismaService);
    ({ staffPhone, adminPhone } = await seedUsers(prisma));
  });

  afterAll(async () => {
    await cleanupUsers(prisma, [staffPhone, adminPhone]);
    await app.close();
    await rm(backupDir, { recursive: true, force: true });
  });

  it('Admin runs a backup; no Telegram vars → sentToTelegram false and the file is on disk', async () => {
    const admin = await loginAs(app, adminPhone);
    const res = await admin.post('/api/backups').expect(201);
    const body = res.body as { fileName: string; sentToTelegram: boolean; secondCopy: boolean; size: number };
    fileName = body.fileName;
    expect(body.sentToTelegram).toBe(false);
    expect(body.secondCopy).toBe(false);
    expect(body.fileName).toMatch(/^blackstore-\d{4}-\d{2}-\d{2}-\d{6}\.sql\.gz\.enc$/);
    expect(body.size).toBeGreaterThan(0);
    await expect(access(join(backupDir, body.fileName))).resolves.toBeUndefined();
  });

  it('Staff cannot run a backup (403)', async () => {
    const staff = await loginAs(app, staffPhone);
    await staff.post('/api/backups').expect(403);
  });

  it('restore rejects a wrong confirm and a ".." name (400)', async () => {
    const admin = await loginAs(app, adminPhone);
    await admin.post(`/api/backups/${fileName}/restore`).send({ confirm: 'nope' }).expect(400);
    const bad = encodeURIComponent('..blackstore.sql.gz.enc');
    await admin.post(`/api/backups/${bad}/restore`).send({ confirm: '..blackstore.sql.gz.enc' }).expect(400);
  });

  it('restore brings the database back: a ledger entry made after the backup is gone', async () => {
    const admin = await loginAs(app, adminPhone);
    const created = await admin
      .post('/api/ledger')
      .send({ type: 'EXPENSE', category: 'e2e-restore', amount: '1.00' })
      .expect(201);
    const entryId = (created.body as { id: number }).id;
    // File names are per second; let the clock move so the safety backup gets its own name.
    await new Promise((resolve) => setTimeout(resolve, 1100));

    const res = await admin.post(`/api/backups/${fileName}/restore`).send({ confirm: fileName }).expect(200);
    expect((res.body as { restoredFrom: string }).restoredFrom).toBe(fileName);
    expect(await prisma.ledgerEntry.findUnique({ where: { id: entryId } })).toBeNull();
  });
});
