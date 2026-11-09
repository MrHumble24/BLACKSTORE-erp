import { INestApplication } from '@nestjs/common';
import { App } from 'supertest/types';
import { PrismaService } from './../src/prisma/prisma.service';
import { cleanupUsers, createTestApp, loginAs, seedUsers } from './e2e-setup';

interface WatchBody {
  id: number;
  aliases: string[];
  maxPrice: string | null;
}

// F34 watches and matches: Admin manages them, Staff is locked out. Matches are seeded through
// Prisma because only the (later) webhook creates them.
describe('Watches and matches (e2e)', () => {
  let app: INestApplication<App>;
  let prisma: PrismaService;
  let staffPhone = '';
  let adminPhone = '';
  const watchIds: number[] = [];
  let admin: Awaited<ReturnType<typeof loginAs>>;
  let staff: Awaited<ReturnType<typeof loginAs>>;

  beforeAll(async () => {
    app = await createTestApp();
    prisma = app.get(PrismaService);
    ({ staffPhone, adminPhone } = await seedUsers(prisma));
    admin = await loginAs(app, adminPhone);
    staff = await loginAs(app, staffPhone);
  });

  afterAll(async () => {
    await prisma.match.deleteMany({ where: { watchId: { in: watchIds } } });
    await prisma.watch.deleteMany({ where: { id: { in: watchIds } } });
    await cleanupUsers(prisma, [staffPhone, adminPhone]);
    await app.close();
  });

  it('Admin creates a watch with cleaned aliases and sees it in the list', async () => {
    const res = await admin
      .post('/api/watches')
      .send({ name: 'iPhone 17 Pro Max', aliases: [' 17 Pro Max', '17pm', '17PM'], maxPrice: '1300' })
      .expect(201);
    const watch = res.body as WatchBody;
    watchIds.push(watch.id);
    expect(watch.aliases).toEqual(['17 pro max', '17pm']);
    expect(watch.maxPrice).toBe('1300.00');

    const list = await admin.get('/api/watches').expect(200);
    const items = (list.body as { items: WatchBody[] }).items;
    expect(items.map((w) => w.id)).toContain(watch.id);
  });

  it('Staff gets 403 on watches and matches', async () => {
    await staff.get('/api/watches').expect(403);
    await staff.get('/api/matches').expect(403);
    await staff.post('/api/watches').send({ name: 'x', aliases: ['x'] }).expect(403);
    await staff.patch(`/api/watches/${watchIds[0]}`).send({ isActive: false }).expect(403);
    await staff.patch('/api/matches/1/status').send({ status: 'SEEN' }).expect(403);
    await staff.patch('/api/matches/1').send({ note: 'x' }).expect(403);
  });

  it('reports the Watcher as not configured under test (never pushes to a live Watcher)', async () => {
    const res = await admin.get('/api/watches/sync-status').expect(200);
    expect(res.body).toMatchObject({ configured: false });
  });

  it('Admin gets 404 on unknown watch and match', async () => {
    await admin.patch('/api/watches/999999').send({ isActive: false }).expect(404);
    await admin.patch('/api/matches/999999').send({ note: 'x' }).expect(404);
  });

  it('Admin moves a match through the allowed statuses and never sees the seller id', async () => {
    const match = await prisma.match.create({
      data: {
        externalId: `e2e_${Date.now()}`,
        watchId: watchIds[0],
        device: 'iPhone 17 Pro Max',
        confidence: '0.920',
        sellerTelegramId: '123456789',
        messageText: 'Bor, 1200$',
        messageLink: 'https://t.me/c/1/2',
        groupTitle: 'E2E group',
        messageAt: new Date(),
      },
    });

    const list = await admin.get(`/api/matches?watchId=${watchIds[0]}`).expect(200);
    const [row] = (list.body as { items: Record<string, unknown>[] }).items;
    expect(row).toMatchObject({ id: match.id, status: 'NEW', confidence: '0.920' });
    expect(row).not.toHaveProperty('sellerTelegramId');

    await admin.patch(`/api/matches/${match.id}/status`).send({ status: 'SEEN' }).expect(200);
    await admin.patch(`/api/matches/${match.id}/status`).send({ status: 'BOUGHT' }).expect(400);
    await admin.patch(`/api/matches/${match.id}`).send({ note: 'Call tomorrow' }).expect(200);
    await admin.patch(`/api/matches/${match.id}`).send({}).expect(400);
    const kept = await prisma.match.findUniqueOrThrow({ where: { id: match.id } });
    expect(kept.note).toBe('Call tomorrow');
    await admin.patch('/api/matches/999999999/status').send({ status: 'SEEN' }).expect(404);

    const summary = await admin.get('/api/dashboard/summary').expect(200);
    expect(summary.body).toHaveProperty('newMatchCount');
  });
});
