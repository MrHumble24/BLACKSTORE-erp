import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types';
import { signWatcherBody } from './../src/common/webhook-signature.guard';
import { PrismaService } from './../src/prisma/prisma.service';
import { cleanupUsers, createTestApp, loginAs, seedUsers } from './e2e-setup';

const URL = '/api/webhooks/watcher/match';

// F34 inbound Watcher webhook: HMAC-signed, idempotent on matchId, strict body.
describe('Watcher match webhook (e2e)', () => {
  let app: INestApplication<App>;
  let prisma: PrismaService;
  let phones: string[] = [];
  let watchId = 0;
  const matchId = `e2e_${Date.now()}`;

  /** Sends `body` exactly as signed (raw string), like the Watcher does. */
  function post(payload: object, sign = true) {
    const raw = JSON.stringify(payload);
    const ts = String(Math.floor(Date.now() / 1000));
    const req = request(app.getHttpServer()).post(URL).set('Content-Type', 'application/json');
    if (sign) {
      const secret = process.env.WATCHER_WEBHOOK_SECRET ?? '';
      req.set('x-watcher-timestamp', ts).set('x-watcher-signature', signWatcherBody(secret, ts, raw));
    }
    return req.send(raw);
  }

  function body(over: object = {}) {
    return {
      matchId, watchExternalId: String(watchId), device: 'iPhone 17 Pro Max', price: '1200.00',
      currency: 'USD', condition: 'used', confidence: '0.920', sellerName: 'Ali', sellerTelegramId: '123',
      sellerUsername: 'ali', messageText: 'Bor, 1200$', messageLink: 'https://t.me/c/1/2',
      group: 'Bazaar', parentText: null, createdAt: '2026-10-27T10:15:00Z', ...over,
    };
  }

  beforeAll(async () => {
    app = await createTestApp();
    prisma = app.get(PrismaService);
    const users = await seedUsers(prisma);
    phones = [users.staffPhone, users.adminPhone];
    const creator = await prisma.user.findUniqueOrThrow({ where: { phone: users.adminPhone } });
    const data = { name: 'E2E webhook', aliases: ['e2e'], createdById: creator.id };
    watchId = (await prisma.watch.create({ data })).id;
  });

  afterAll(async () => {
    await prisma.match.deleteMany({ where: { watchId } });
    await prisma.watch.delete({ where: { id: watchId } });
    await cleanupUsers(prisma, phones);
    await app.close();
  });

  it('stores a signed match once and lists it; a repeat is a duplicate', async () => {
    const first = await post(body()).expect(200);
    expect(first.body).toMatchObject({ duplicate: false });
    const id = (first.body as { id: number }).id;

    const admin = await loginAs(app, phones[1]);
    const list = await admin.get(`/api/matches?watchId=${watchId}`).expect(200);
    const items = (list.body as { items: { id: number; groupTitle: string }[] }).items;
    expect(items).toEqual([expect.objectContaining({ id, groupTitle: 'Bazaar' })]);
    expect(items[0]).not.toHaveProperty('sellerTelegramId');

    const again = await post(body()).expect(200);
    expect(again.body).toEqual({ id, duplicate: true });
  });

  it('rejects an unsigned request with 401', async () => {
    await post(body({ matchId: `${matchId}_u` }), false).expect(401);
  });

  it('accepts a basic-group match with messageLink null', async () => {
    const res = await post(body({ matchId: `${matchId}_n`, messageLink: null })).expect(200);
    const id = (res.body as { id: number }).id;
    const row = await prisma.match.findUniqueOrThrow({ where: { id }, select: { messageLink: true } });
    expect(row.messageLink).toBeNull();
  });

  it('rejects a non-t.me link with 400', async () => {
    await post(body({ matchId: `${matchId}_l`, messageLink: 'http://evil' })).expect(400);
  });
});
