import { INestApplication } from '@nestjs/common';
import { App } from 'supertest/types';
import { PrismaService } from './../src/prisma/prisma.service';
import { cleanupUsers, createTestApp, loginAs, SeededUsers, seedUsers } from './e2e-setup';

// F28 closed days history and correction. Closes the real open day of the DB under test
// (the close auto-opens the next one), then lists and corrects it.
// Needs a reachable DATABASE_URL with migrations applied and the seed run.
describe('Business day history (e2e)', () => {
  let app: INestApplication<App>;
  let prisma: PrismaService;
  let users: SeededUsers;

  beforeAll(async () => {
    app = await createTestApp();
    prisma = app.get(PrismaService);
    users = await seedUsers(prisma);
  });

  afterAll(async () => {
    await cleanupUsers(prisma, [users.staffPhone, users.adminPhone]);
    await app.close();
  });

  type Day = { id: number; status: string; expectedCash: string; countedCash: string; cashVariance: string; note: string | null };

  it('Admin closes the day, sees it in the history and corrects countedCash; Staff is 403', async () => {
    const admin = await loginAs(app, users.adminPhone);
    const closed = (await admin.post('/api/business-day/close').send({ countedCash: '0', countedCard: '0' }).expect(201))
      .body as Day;

    const list = (await admin.get('/api/business-day?pageSize=5').expect(200)).body as { items: Day[]; total: number };
    expect(list.items[0].id).toBe(closed.id); // newest close first
    expect(list.items.every((d) => d.status === 'CLOSED')).toBe(true);

    const patched = (await admin.patch(`/api/business-day/${closed.id}`).send({ countedCash: '123.45', note: 'recount' }).expect(200))
      .body as Day;
    expect(patched.countedCash).toBe('123.45');
    expect(patched.expectedCash).toBe(closed.expectedCash); // frozen
    expect(Number(patched.cashVariance)).toBeCloseTo(123.45 - Number(closed.expectedCash), 2);
    expect(patched.note).toBe('recount');

    // Empty body → 400; the auto-opened day is OPEN → 409.
    await admin.patch(`/api/business-day/${closed.id}`).send({}).expect(400);
    const open = await prisma.businessDay.findFirstOrThrow({ where: { status: 'OPEN' }, select: { id: true } });
    await admin.patch(`/api/business-day/${open.id}`).send({ note: 'x' }).expect(409);

    const staff = await loginAs(app, users.staffPhone);
    await staff.get('/api/business-day').expect(403);
    await staff.patch(`/api/business-day/${closed.id}`).send({ note: 'x' }).expect(403);
  });
});
