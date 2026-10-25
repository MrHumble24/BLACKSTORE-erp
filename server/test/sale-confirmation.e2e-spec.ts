import { INestApplication } from '@nestjs/common';
import { App } from 'supertest/types';
import { PrismaService } from './../src/prisma/prisma.service';
import { cleanupUsers, createTestApp, loginAs, SeededUsers, seedUsers } from './e2e-setup';

type Agent = Awaited<ReturnType<typeof loginAs>>;

// F33 sale confirmation at the daily close: a sale's money counts in the drawer only once the Admin confirms it.
// Self-contained: seeds its own device, runs on the real open day of the DB under test.
describe('Sale confirmation (e2e)', () => {
  let app: INestApplication<App>;
  let prisma: PrismaService;
  let users: SeededUsers;
  let modelId = 0;
  let itemId = 0;
  let saleId = 0;
  let staff: Agent;
  let admin: Agent;
  let before: Current;
  let sold: Summary;

  beforeAll(async () => {
    app = await createTestApp();
    prisma = app.get(PrismaService);
    users = await seedUsers(prisma);
    const own = await prisma.investor.findUniqueOrThrow({ where: { code: 'OWN' } });
    const iphone = await prisma.category.findUniqueOrThrow({ where: { name: 'iPhone' } });
    const location = await prisma.location.findFirstOrThrow({ where: { isActive: true } });
    modelId = (await prisma.productModel.create({ data: { categoryId: iphone.id, name: `E2E-Confirm-Model-${Date.now()}` } })).id;
    itemId = (
      await prisma.item.create({
        data: { productModelId: modelId, investorId: own.id, locationId: location.id, attributes: {}, purchasePrice: '900', salePrice: '1100' },
        select: { id: true },
      })
    ).id;
    staff = await loginAs(app, users.staffPhone);
    admin = await loginAs(app, users.adminPhone);
    // The shared sale: a Staff cash sale of 1100, made after the drawer snapshot `before`.
    before = await current();
    const res = await staff
      .post('/api/sales')
      .send({ locationId: location.id, lines: [{ itemId, unitPrice: '1100' }], payment: { amount: '1100', method: 'CASH' } })
      .expect(201);
    sold = res.body as Summary;
    saleId = sold.id;
  });

  afterAll(async () => {
    if (saleId) {
      await prisma.salePayment.deleteMany({ where: { saleId } });
      await prisma.saleItem.deleteMany({ where: { saleId } });
      await prisma.sale.deleteMany({ where: { id: saleId } });
    }
    await prisma.item.deleteMany({ where: { id: itemId } });
    await prisma.productModel.deleteMany({ where: { id: modelId } });
    await cleanupUsers(prisma, [users.staffPhone, users.adminPhone]);
    await app.close();
  });

  type SaleRow = { id: number; confirmedAt: string | null; confirmedBy: { id: number } | null; paidCash?: string; party?: string | null };
  type Current = {
    expectedCash: string;
    breakdown: Record<'paymentsCash' | 'paymentsCard' | 'pendingSalesCash' | 'pendingSalesCard', string>;
    sales: SaleRow[];
    pendingSales: SaleRow[];
    pendingSalesCount: number;
    events: { id: string; kind: string; cash: string | null; card: string | null }[];
  };
  type Summary = { id: number; confirmedAt: string | null; confirmedBy: { id: number; name: string } | null; canUndo: boolean };
  const current = async () => (await admin.get('/api/business-day/current').expect(200)).body as Current;
  const delta = (a: string, b: string) => Number(a) - Number(b);

  it('an unconfirmed Staff cash sale waits: the drawer is unchanged, the money shows as pending', async () => {
    expect(sold).toMatchObject({ confirmedAt: null, confirmedBy: null, canUndo: false });
    const waiting = await current();
    expect(waiting.expectedCash).toBe(before.expectedCash);
    expect(waiting.breakdown.paymentsCard).toMatch(/^-?\d+\.\d{2}$/);
    expect(waiting.breakdown.paymentsCard).toBe(before.breakdown.paymentsCard);
    expect(delta(waiting.breakdown.pendingSalesCash, before.breakdown.pendingSalesCash)).toBeCloseTo(1100, 2);
    expect(waiting.breakdown.pendingSalesCard).toBe(before.breakdown.pendingSalesCard);
    expect(waiting.pendingSalesCount).toBe(before.pendingSalesCount + 1);
    expect(waiting.pendingSales).toContainEqual(expect.objectContaining({ id: saleId, paidCash: '1100.00', confirmedAt: null }));
    expect(waiting.sales.find((s) => s.id === saleId)).toMatchObject({ confirmedAt: null, confirmedBy: null });
    expect(waiting.events.find((e) => e.kind === 'PAYMENT' && e.cash === null)).toBeDefined();

    const pendingList = (await admin.get('/api/sales?confirmed=false&pageSize=100').expect(200)).body as { items: Summary[] };
    expect(pendingList.items.some((s) => s.id === saleId)).toBe(true);
  });

  it('confirm moves the money into the drawer; repeats are no-ops or 409', async () => {
    await admin.patch('/api/sales/confirm').send({ ids: [] }).expect(400);
    expect((await admin.patch('/api/sales/confirm').send({ ids: [saleId, saleId] }).expect(200)).body).toEqual({ confirmed: 1 });
    expect((await admin.patch('/api/sales/confirm').send({ ids: [saleId] }).expect(200)).body).toEqual({ confirmed: 0 });
    await admin.patch(`/api/sales/${saleId}/confirm`).expect(409);

    const confirmed = await current();
    expect(delta(confirmed.expectedCash, before.expectedCash)).toBeCloseTo(1100, 2);
    expect(delta(confirmed.breakdown.paymentsCash, before.breakdown.paymentsCash)).toBeCloseTo(1100, 2);
    expect(confirmed.breakdown.paymentsCard).toBe(before.breakdown.paymentsCard);
    expect(confirmed.breakdown.pendingSalesCash).toBe(before.breakdown.pendingSalesCash);
    expect(confirmed.pendingSales.some((s) => s.id === saleId)).toBe(false);
    expect(confirmed.events.find((e) => e.id === `SALE_CONFIRMED:${saleId}`)).toMatchObject({ cash: '+1100.00', card: null });
    const detail = (await admin.get(`/api/sales/${saleId}`).expect(200)).body as Summary;
    expect(detail).toMatchObject({ confirmedBy: { name: 'E2E-Admin' }, canUndo: true });
    expect(detail.confirmedAt).not.toBeNull();
  });

  it('undo inside the open day restores the drawer and is audited', async () => {
    const undone = (await admin.patch(`/api/sales/${saleId}/unconfirm`).expect(200)).body as Summary;
    expect(undone).toMatchObject({ confirmedAt: null, confirmedBy: null, canUndo: false });
    await admin.patch(`/api/sales/${saleId}/unconfirm`).expect(409);
    const restored = await current();
    expect(restored.expectedCash).toBe(before.expectedCash);
    expect(restored.events.some((e) => e.id === `SALE_CONFIRMED:${saleId}`)).toBe(false);

    const audits = await prisma.auditLog.count({ where: { entity: 'Sale', entityId: saleId, action: 'update' } });
    expect(audits).toBe(2); // confirm + unconfirm; the no-op confirm-many writes nothing
  });

  it('Staff gets 403 on every confirmation route; unknown ids are 404', async () => {
    await staff.patch('/api/sales/confirm').send({ ids: [saleId] }).expect(403);
    await staff.patch(`/api/sales/${saleId}/confirm`).expect(403);
    await staff.patch(`/api/sales/${saleId}/unconfirm`).expect(403);
    await admin.patch('/api/sales/999999999/confirm').expect(404);
    await admin.patch('/api/sales/confirm').send({ ids: [saleId, 999999999] }).expect(404);
  });
});
