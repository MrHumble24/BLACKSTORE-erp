import { INestApplication } from '@nestjs/common';
import { App } from 'supertest/types';
import { PrismaService } from './../src/prisma/prisma.service';
import { cleanupUsers, createTestApp, loginAs, seedUsers } from './e2e-setup';

// F07 part 1 consignment + reports flow (PRD FR-26, FR-28, FR-11, W4). Seeds its own catalog.
describe('Partners & reports (e2e)', () => {
  let app: INestApplication<App>;
  let prisma: PrismaService;
  let staffPhone = '';
  let adminPhone = '';

  const modelName = `E2E-Partner-Model-${Date.now()}`;
  const locationName = `E2E-Partner-Loc-${Date.now()}`;
  let modelId = 0;
  let locationId = 0;
  let itemId = 0;
  let partnerId = 0;
  let consignmentId = 0;
  let consignmentItemId = 0;
  let saleId = 0;

  const now = new Date();
  const month = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  const from = `${month}-01`;
  const to = now.toISOString().slice(0, 10);

  beforeAll(async () => {
    app = await createTestApp();
    prisma = app.get(PrismaService);
    ({ staffPhone, adminPhone } = await seedUsers(prisma));

    const own = await prisma.investor.findUniqueOrThrow({ where: { code: 'OWN' } });
    const iphone = await prisma.category.findUniqueOrThrow({ where: { name: 'iPhone' } });
    const location = await prisma.location.create({ data: { name: locationName, type: 'SHOP' } });
    locationId = location.id;
    const model = await prisma.productModel.create({ data: { categoryId: iphone.id, name: modelName } });
    modelId = model.id;
    const item = await prisma.item.create({
      data: { productModelId: modelId, investorId: own.id, locationId, attributes: {}, purchasePrice: '1000' },
      select: { id: true },
    });
    itemId = item.id;
  });

  afterAll(async () => {
    if (saleId) {
      await prisma.salePayment.deleteMany({ where: { saleId } });
      await prisma.saleItem.deleteMany({ where: { saleId } });
    }
    if (consignmentId) await prisma.consignmentItem.deleteMany({ where: { consignmentId } });
    if (saleId) await prisma.sale.deleteMany({ where: { id: saleId } });
    if (consignmentId) await prisma.consignment.deleteMany({ where: { id: consignmentId } });
    if (partnerId) await prisma.partner.deleteMany({ where: { id: partnerId } });
    await prisma.item.deleteMany({ where: { id: itemId } });
    await prisma.productModel.deleteMany({ where: { id: modelId } });
    await prisma.location.deleteMany({ where: { id: locationId } });
    await cleanupUsers(prisma, [staffPhone, adminPhone]);
    await app.close();
  });

  let staffCache: Awaited<ReturnType<typeof loginAs>> | undefined;
  let adminCache: Awaited<ReturnType<typeof loginAs>> | undefined;
  const staff = async () => (staffCache ??= await loginAs(app, staffPhone));
  const admin = async () => (adminCache ??= await loginAs(app, adminPhone));

  it('Staff creates a partner and hands over one item → item AT_PARTNER, report held 1', async () => {
    const agent = await staff();
    const partner = await agent.post('/api/partners').send({ name: 'Bozor', phone: '+998900000000' }).expect(201);
    partnerId = (partner.body as { id: number }).id;

    const handover = await agent
      .post('/api/consignments')
      .send({ partnerId, items: [{ itemId, minPrice: '1500' }] })
      .expect(201);
    const body = handover.body as { id: number; items: Array<{ id: number; status: string; item: { status: string } }> };
    consignmentId = body.id;
    consignmentItemId = body.items[0].id;
    expect(body.items[0].status).toBe('AT_PARTNER');
    expect(body.items[0].item.status).toBe('AT_PARTNER');

    const report = await agent.get(`/api/partners/${partnerId}`).expect(200);
    expect((report.body as { held: number }).held).toBe(1);
  });

  it('Staff edits the minimum price', async () => {
    const agent = await staff();
    const res = await agent
      .patch(`/api/consignments/${consignmentId}/items/${consignmentItemId}`)
      .send({ minPrice: '1600' })
      .expect(200);
    expect((res.body as { minPrice: string }).minPrice).toBe('1600.00');
  });

  it('Staff reports the sale unpaid → sale DEBT, item DEBT, report soldUnpaid 1 and totalOwed', async () => {
    const agent = await staff();
    const res = await agent
      .post(`/api/consignments/${consignmentId}/items/${consignmentItemId}/sell`)
      .send({ paid: false })
      .expect(201);
    const sold = (res.body as { items: Array<{ status: string; saleId: number }> }).items[0];
    saleId = sold.saleId;
    expect(sold.status).toBe('SOLD');

    const sale = await agent.get(`/api/sales/${saleId}`).expect(200);
    const saleBody = sale.body as { status: string; items: Array<{ item: { status: string } }> };
    expect(saleBody.status).toBe('DEBT');
    expect(saleBody.items[0].item.status).toBe('DEBT');

    const report = await agent.get(`/api/partners/${partnerId}`).expect(200);
    const r = report.body as { soldUnpaid: number; totalOwed: string };
    expect(r.soldUnpaid).toBe(1);
    expect(r.totalOwed).toBe('1600.00');
  });

  it('Staff collects the debt → item SOLD', async () => {
    const agent = await staff();
    const res = await agent.post(`/api/sales/${saleId}/payments`).send({ amount: '1600', method: 'CASH' }).expect(200);
    const body = res.body as { status: string; items: Array<{ item: { status: string } }> };
    expect(body.status).toBe('PAID');
    expect(body.items[0].item.status).toBe('SOLD');
  });

  it('Admin reads the profit report for this month → the line is there with the right profit', async () => {
    const agent = await admin();
    const res = await agent.get(`/api/reports/profit?from=${from}&to=${to}&locationId=${locationId}`).expect(200);
    const body = res.body as {
      totals: { profit: string };
      lines: { items: Array<{ saleId: number; kind: string; profit: string }> };
    };
    const line = body.lines.items.find((l) => l.saleId === saleId && l.kind === 'SALE');
    expect(line?.profit).toBe('600.00'); // 1600 − 1000
    expect(body.totals.profit).toBe('600.00'); // this location has only our sale
  });

  it('Admin downloads the investor report as .xlsx', async () => {
    const agent = await admin();
    const res = await agent.get(`/api/reports/investors.xlsx?month=${month}`).expect(200);
    expect(res.headers['content-type']).toContain('spreadsheetml');
  });

  it('Staff cannot read the profit report (403)', async () => {
    const agent = await staff();
    await agent.get(`/api/reports/profit?from=${from}&to=${to}`).expect(403);
  });
});
