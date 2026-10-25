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
  let modelId = 0;
  const sellerPhone = `+99891${Date.now() % 10_000_000}`;

  beforeAll(async () => {
    app = await createTestApp();
    prisma = app.get(PrismaService);
    users = await seedUsers(prisma);
  });

  afterAll(async () => {
    if (modelId) {
      await prisma.purchaseLine.deleteMany({ where: { item: { productModelId: modelId } } });
      await prisma.item.deleteMany({ where: { productModelId: modelId } });
      await prisma.productModel.deleteMany({ where: { id: modelId } });
    }
    await prisma.walkInSeller.deleteMany({ where: { phone: sellerPhone } });
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

  type Current = {
    expectedCash: string;
    breakdown: Record<'paymentsCash' | 'cashIncome' | 'cashExpense' | 'cashRefunds' | 'walkInPurchases' | 'pendingWalkInPurchases', string>;
    events: { id: string; kind: string; cash: string | null; refType: string | null; user: { id: number } | null }[];
  };
  type Row = { lineId: number; amount: string; paidAt: string | null; paidBy: { id: number } | null };
  type Page = { items: Row[]; total: number };

  it('a Staff walk-in purchase leaves the drawer only once the Admin confirms the payout (F30, F32)', async () => {
    const admin = await loginAs(app, users.adminPhone);
    const staff = await loginAs(app, users.staffPhone);
    const iphone = await prisma.category.findUniqueOrThrow({ where: { name: 'iPhone' } });
    modelId = (await prisma.productModel.create({ data: { categoryId: iphone.id, name: `E2E-Day-Model-${Date.now()}` } })).id;
    const location = await prisma.location.findFirstOrThrow({ where: { isActive: true } });
    const current = async () => (await admin.get('/api/business-day/current').expect(200)).body as Current;

    const before = await current();
    const created = await staff
      .post('/api/walk-in-purchases')
      .send({
        seller: { name: 'Day Seller', phone: sellerPhone },
        productModelId: modelId,
        locationId: location.id,
        identifiers: [{ type: 'IMEI', value: `55${Date.now()}`.slice(0, 15) }],
        condition: 'USED',
        pricePaid: '150',
      })
      .expect(201);
    const itemId = (created.body as { id: number }).id;
    const { id: lineId } = await prisma.purchaseLine.findFirstOrThrow({ where: { itemId }, select: { id: true } });

    // Recorded but not paid out: the drawer is unchanged, the amount waits.
    const bought = await current();
    expect(bought.expectedCash).toBe(before.expectedCash);
    expect(Number(bought.breakdown.pendingWalkInPurchases) - Number(before.breakdown.pendingWalkInPurchases)).toBeCloseTo(150, 2);
    expect(bought.events.find((e) => e.id === `WALK_IN_PURCHASE:${lineId}`)).toMatchObject({ cash: null, refType: null });

    // Oldest first, so the new line is on the last page.
    const { total } = (await admin.get('/api/walk-in-purchases/pending?pageSize=1').expect(200)).body as Page;
    const last = (await admin.get(`/api/walk-in-purchases/pending?pageSize=1&page=${total}`).expect(200)).body as Page;
    expect(last.items).toEqual([expect.objectContaining({ lineId, amount: '150.00', paidAt: null, paidBy: null })]);

    const paid = (await admin.patch(`/api/walk-in-purchases/${lineId}/pay`).expect(200)).body as Row;
    expect(paid.paidAt).not.toBeNull();
    await admin.patch(`/api/walk-in-purchases/${lineId}/pay`).expect(409);
    const afterPay = await current();
    expect(Number(before.expectedCash) - Number(afterPay.expectedCash)).toBeCloseTo(150, 2);
    expect(Number(afterPay.breakdown.walkInPurchases) - Number(before.breakdown.walkInPurchases)).toBeCloseTo(150, 2);
    expect(afterPay.events.find((e) => e.id === `WALK_IN_PAYOUT:${lineId}`)).toMatchObject({ cash: '-150.00', user: { id: paid.paidBy?.id } });

    // The device panel shows the payout to view_cost viewers only.
    const adminItem = (await admin.get(`/api/items/${itemId}`).expect(200)).body as { walkIn: Row & { sellerName: string } };
    expect(adminItem.walkIn).toMatchObject({ lineId, sellerName: 'Day Seller', amount: '150.00', paidAt: paid.paidAt, canUndo: true });
    expect((await staff.get(`/api/items/${itemId}`).expect(200)).body).not.toHaveProperty('walkIn');

    await admin.patch(`/api/walk-in-purchases/${lineId}/unpay`).expect(200);
    const afterUndo = await current();
    expect(afterUndo.expectedCash).toBe(before.expectedCash);
    expect(afterUndo.events.some((e) => e.id === `WALK_IN_PAYOUT:${lineId}`)).toBe(false);

    await staff.get('/api/business-day/current').expect(403);
    await staff.get('/api/walk-in-purchases/pending').expect(403);
    await staff.patch(`/api/walk-in-purchases/${lineId}/pay`).expect(403);
    await staff.patch(`/api/walk-in-purchases/${lineId}/unpay`).expect(403);
  });
});
