import { INestApplication } from '@nestjs/common';
import { App } from 'supertest/types';
import { PrismaService } from './../src/prisma/prisma.service';
import { cleanupUsers, createTestApp, loginAs, seedUsers } from './e2e-setup';

// F05 selling flow (PRD FR-19–FR-23, W2/W3). Self-contained: seeds its own catalog via Prisma.
// Needs a reachable DATABASE_URL with migrations applied and the seed run.
describe('Sales (e2e)', () => {
  let app: INestApplication<App>;
  let prisma: PrismaService;
  let staffPhone = '';
  let adminPhone = '';

  // Seeded catalog.
  const modelName = `E2E-Sale-Model-${Date.now()}`;
  const accModelName = `E2E-Sale-Acc-${Date.now()}`;
  const customerPhone = `+99895${Date.now() % 10_000_000}`;
  let modelId = 0;
  let accModelId = 0;
  let locationId = 0;
  let itemA = 0; // sold for cash then returned
  let itemB = 0; // sold on debt then collected
  let customerId = 0;
  const saleIds: number[] = [];
  let paidSaleId = 0;
  let paidSaleItemId = 0;

  beforeAll(async () => {
    app = await createTestApp();
    prisma = app.get(PrismaService);
    ({ staffPhone, adminPhone } = await seedUsers(prisma));

    const own = await prisma.investor.findUniqueOrThrow({ where: { code: 'OWN' } });
    const iphone = await prisma.category.findUniqueOrThrow({ where: { name: 'iPhone' } });
    const accessory = await prisma.category.findUniqueOrThrow({ where: { name: 'Accessory' } });
    const location = await prisma.location.findFirstOrThrow({ where: { isActive: true } });
    locationId = location.id;

    const model = await prisma.productModel.create({ data: { categoryId: iphone.id, name: modelName } });
    modelId = model.id;
    const makeItem = (minSalePrice: string | null) =>
      prisma.item.create({
        data: {
          productModelId: modelId,
          investorId: own.id,
          locationId,
          attributes: {},
          purchasePrice: '1000',
          salePrice: '1500',
          minSalePrice,
        },
        select: { id: true },
      });
    itemA = (await makeItem('1400')).id; // has a floor: used for the minimum-price test
    itemB = (await makeItem(null)).id; // no floor: sold on debt at 1200 by Staff

    const accModel = await prisma.productModel.create({ data: { categoryId: accessory.id, name: accModelName } });
    accModelId = accModel.id;
    await prisma.accessoryStock.create({
      data: { productModelId: accModelId, locationId, quantity: 8, avgCost: '10' },
    });
  });

  afterAll(async () => {
    if (saleIds.length) {
      await prisma.return.deleteMany({ where: { saleId: { in: saleIds } } });
      await prisma.salePayment.deleteMany({ where: { saleId: { in: saleIds } } });
      await prisma.saleItem.deleteMany({ where: { saleId: { in: saleIds } } });
      await prisma.sale.deleteMany({ where: { id: { in: saleIds } } });
    }
    if (customerId) await prisma.customer.deleteMany({ where: { id: customerId } });
    await prisma.item.deleteMany({ where: { id: { in: [itemA, itemB] } } });
    await prisma.accessoryStock.deleteMany({ where: { productModelId: accModelId } });
    await prisma.productModel.deleteMany({ where: { id: { in: [modelId, accModelId] } } });
    await cleanupUsers(prisma, [staffPhone, adminPhone]);
    await app.close();
  });

  // Memoized agents so repeated logins stay under the rate limit (10/min).
  let staffCache: Awaited<ReturnType<typeof loginAs>> | undefined;
  let adminCache: Awaited<ReturnType<typeof loginAs>> | undefined;
  const staff = async () => (staffCache ??= await loginAs(app, staffPhone));
  const admin = async () => (adminCache ??= await loginAs(app, adminPhone));

  it('Staff cannot sell a device below its minimum price', async () => {
    const agent = await staff();
    const res = await agent
      .post('/api/sales')
      .send({
        locationId,
        lines: [{ itemId: itemA, unitPrice: '1000' }], // floor is 1400
        payment: { amount: '1000', method: 'CASH' },
      })
      .expect(400);
    expect((res.body as { message: string }).message).toBe('Below minimum price');
  });

  it('Staff sells the device at min price for cash → PAID, SOLD, no cost', async () => {
    const agent = await staff();
    const sale = await agent
      .post('/api/sales')
      .send({
        locationId,
        lines: [{ itemId: itemA, unitPrice: '1400', warrantyUntil: '2030-01-01' }],
        payment: { amount: '1400', method: 'CASH' },
      })
      .expect(201);
    const body = sale.body as {
      id: number;
      status: string;
      items: Array<{ id: number; item: { status: string }; unitCost?: string }>;
    };
    paidSaleId = body.id;
    paidSaleItemId = body.items[0].id;
    saleIds.push(body.id);
    expect(body.status).toBe('PAID');
    expect(body.items[0].item.status).toBe('SOLD');
    expect(body.items[0]).not.toHaveProperty('unitCost'); // Staff has no view_cost
  });

  it('Admin sets the receipt header and Staff reads it', async () => {
    const adminAgent = await admin();
    await adminAgent
      .patch('/api/settings/receipt')
      .send({ shopName: 'BlackStore', phone: '+99890001122' })
      .expect(200);
    const staffAgent = await staff();
    const res = await staffAgent.get('/api/settings/receipt').expect(200);
    const body = res.body as { shopName: string; address: string };
    expect(body.shopName).toBe('BlackStore');
    expect(body.address).toBe(''); // unset fields read as empty strings
  });

  it('Staff creates a customer and sells an accessory on debt → DEBT, stock down', async () => {
    const agent = await staff();
    const customer = await agent
      .post('/api/customers')
      .send({ name: 'E2E Customer', phone: customerPhone })
      .expect(201);
    customerId = (customer.body as { id: number }).id;

    type StockPage = { items: Array<{ productModel: { id: number }; quantity: number }> };
    const qtyOf = (page: StockPage) =>
      page.items.find((s) => s.productModel.id === accModelId)?.quantity ?? 0;

    const before = await agent.get('/api/accessory-stock').expect(200);
    const beforeQty = qtyOf(before.body as StockPage);

    const sale = await agent
      .post('/api/sales')
      .send({ locationId, lines: [{ productModelId: accModelId, quantity: 2, unitPrice: '20' }], customerId })
      .expect(201);
    const body = sale.body as { id: number; status: string; balance: string };
    saleIds.push(body.id);
    expect(body.status).toBe('DEBT');
    expect(body.balance).toBe('40.00');

    const after = await agent.get('/api/accessory-stock').expect(200);
    expect(qtyOf(after.body as StockPage)).toBe(beforeQty - 2);
  });

  it('Staff sells a device on debt then collects the rest → PAID + SOLD', async () => {
    const agent = await staff();
    const sale = await agent
      .post('/api/sales')
      .send({ locationId, lines: [{ itemId: itemB, unitPrice: '1200' }], customerId })
      .expect(201);
    const created = sale.body as { id: number; status: string; balance: string };
    saleIds.push(created.id);
    expect(created.status).toBe('DEBT');
    expect(created.balance).toBe('1200.00');

    const paid = await agent
      .post(`/api/sales/${created.id}/payments`)
      .send({ amount: '1200', method: 'CARD' })
      .expect(200);
    const body = paid.body as { status: string; items: Array<{ item: { status: string } }> };
    expect(body.status).toBe('PAID');
    expect(body.items[0].item.status).toBe('SOLD');
  });

  it('Staff returns the paid device BACK_TO_STOCK → item IN_STOCK, sale RETURNED', async () => {
    const agent = await staff();
    const res = await agent
      .post(`/api/sales/${paidSaleId}/returns`)
      .send({ saleItemId: paidSaleItemId, refundAmount: '1400', result: 'BACK_TO_STOCK' })
      .expect(201);
    const body = res.body as { status: string; items: Array<{ item: { status: string }; returnedQuantity: number }> };
    expect(body.status).toBe('RETURNED');
    expect(body.items[0].item.status).toBe('IN_STOCK');
    expect(body.items[0].returnedQuantity).toBe(1);
  });
});
