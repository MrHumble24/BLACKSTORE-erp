import { INestApplication } from '@nestjs/common';
import { App } from 'supertest/types';
import { PrismaService } from './../src/prisma/prisma.service';
import { cleanupUsers, createTestApp, loginAs, seedUsers } from './e2e-setup';

// F04 buying flow: suppliers, batches, batch pricing/extra-cost split and walk-in purchases.
// Needs a reachable DATABASE_URL with migrations applied and the seed run.
describe('Buying (e2e)', () => {
  let app: INestApplication<App>;
  let prisma: PrismaService;
  let phone = '';
  let adminPhone = '';
  const modelName = `E2E-Buy-Model-${Date.now()}`;
  const supplierName = `E2E-Supplier-${Date.now()}`;
  const batchImei = `77${Date.now()}`.slice(0, 15);
  const walkImei = `66${Date.now()}`.slice(0, 15);
  const walkSellerPhone = `+99890${Date.now() % 10_000_000}`;
  let modelId = 0;
  let supplierId = 0;
  let batchId = 0;
  let batchItemId = 0;
  let batchLineId = 0;
  let walkInItemId = 0;

  beforeAll(async () => {
    app = await createTestApp();
    prisma = app.get(PrismaService);
    ({ staffPhone: phone, adminPhone } = await seedUsers(prisma));
    const iphone = await prisma.category.findUniqueOrThrow({ where: { name: 'iPhone' } });
    const model = await prisma.productModel.create({ data: { categoryId: iphone.id, name: modelName } });
    modelId = model.id;
  });

  afterAll(async () => {
    if (supplierId) await prisma.supplierPayment.deleteMany({ where: { supplierId } });
    await prisma.purchaseLine.deleteMany({
      where: { OR: [{ productModelId: modelId }, { item: { productModelId: modelId } }] },
    });
    const itemIds = [batchItemId, walkInItemId].filter((id) => id > 0);
    if (itemIds.length) await prisma.item.deleteMany({ where: { id: { in: itemIds } } });
    await prisma.walkInSeller.deleteMany({ where: { phone: walkSellerPhone } });
    if (batchId) await prisma.batch.deleteMany({ where: { id: batchId } });
    if (supplierId) await prisma.supplier.deleteMany({ where: { id: supplierId } });
    await prisma.productModel.deleteMany({ where: { id: modelId } });
    await cleanupUsers(prisma, [phone, adminPhone]);
    await app.close();
  });

  // Memoized agents so repeated logins stay under the rate limit (10/min).
  let adminCache: Awaited<ReturnType<typeof loginAs>> | undefined;
  let staffCache: Awaited<ReturnType<typeof loginAs>> | undefined;
  const adminAgent = async () => (adminCache ??= await loginAs(app, adminPhone));
  const staffAgent = async () => (staffCache ??= await loginAs(app, phone));

  it('Admin opens a supplier and a batch; duplicate supplier name is 409', async () => {
    const agent = await adminAgent();
    const own = await prisma.investor.findUniqueOrThrow({ where: { code: 'OWN' } });
    const sklad = await prisma.location.findFirstOrThrow({ where: { isActive: true } });

    const supplier = await agent.post('/api/suppliers').send({ name: supplierName }).expect(201);
    supplierId = (supplier.body as { id: number }).id;
    await agent.post('/api/suppliers').send({ name: supplierName }).expect(409);

    const batch = await agent
      .post('/api/batches')
      .send({ supplierId, investorId: own.id, locationId: sklad.id })
      .expect(201);
    batchId = (batch.body as { id: number }).id;
  });

  it('Staff adds a device (no price); GET batch as Staff hides unitPrice', async () => {
    const staff = await staffAgent();
    const created = await staff
      .post(`/api/batches/${batchId}/items`)
      .send({
        productModelId: modelId,
        attributes: { storage: '128GB', color: 'Black' },
        identifiers: [{ type: 'IMEI', value: batchImei }],
      })
      .expect(201);
    batchItemId = (created.body as { id: number }).id;

    const view = await staff.get(`/api/batches/${batchId}`).expect(200);
    const lines = (view.body as { lines: Array<Record<string, unknown>> }).lines;
    expect(lines.length).toBe(1);
    for (const line of lines) expect(line).not.toHaveProperty('unitPrice');
  });

  it('Admin prices the line and extra costs (EQUAL); item cost = price + share', async () => {
    const agent = await adminAgent();
    const batch = await agent.get(`/api/batches/${batchId}`).expect(200);
    const line = (batch.body as { lines: Array<{ id: number; item: { id: number } | null }> }).lines.find(
      (l) => l.item?.id === batchItemId,
    );
    batchLineId = (line as { id: number }).id;

    await agent
      .patch(`/api/batches/${batchId}/lines/${batchLineId}`)
      .send({ unitPrice: '1000' })
      .expect(200);
    await agent
      .patch(`/api/batches/${batchId}`)
      .send({ extraCostTotal: '50', costSplitMethod: 'EQUAL' })
      .expect(200);

    const item = await agent.get(`/api/items/${batchItemId}`).expect(200);
    const body = item.body as { purchasePrice: string; extraCost: string; cost: string };
    expect(body.purchasePrice).toBe('1000.00');
    expect(body.extraCost).toBe('50.00');
    expect(body.cost).toBe('1050.00');
  });

  it('Admin records a payment; supplier balance = line cost − payment', async () => {
    const agent = await adminAgent();
    await agent.post(`/api/suppliers/${supplierId}/payments`).send({ amount: '400' }).expect(201);

    const supplier = await agent.get(`/api/suppliers/${supplierId}`).expect(200);
    expect((supplier.body as { balance: string }).balance).toBe('600.00'); // 1000 − 400
  });

  it('Staff walk-in purchase of a new IMEI → 201, same IMEI again → 409 (IN_STOCK)', async () => {
    const staff = await staffAgent();
    const locationId = (await prisma.location.findFirstOrThrow({ where: { isActive: true } })).id;
    const created = await staff
      .post('/api/walk-in-purchases')
      .send({
        seller: { name: 'Walk Seller', phone: walkSellerPhone },
        productModelId: modelId,
        locationId,
        identifiers: [{ type: 'IMEI', value: walkImei }],
        condition: 'USED',
        attributes: { storage: '256GB', color: 'White' },
        pricePaid: '500',
      })
      .expect(201);
    walkInItemId = (created.body as { id: number }).id;
    // Staff handed over the cash but never see the price back.
    expect(created.body as Record<string, unknown>).not.toHaveProperty('purchasePrice');

    const dup = await staff
      .post('/api/walk-in-purchases')
      .send({
        seller: { name: 'Walk Seller', phone: walkSellerPhone },
        productModelId: modelId,
        locationId,
        identifiers: [{ type: 'IMEI', value: walkImei }],
        condition: 'USED',
        pricePaid: '500',
      })
      .expect(409);
    expect((dup.body as { message: string }).message).toContain('(IN_STOCK)');
  });
});
