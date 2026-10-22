import { INestApplication } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import * as bcrypt from 'bcrypt';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from './../src/app.module';
import { configureApp } from './../src/app.setup';
import { PrismaService } from './../src/prisma/prisma.service';

// Needs a reachable DATABASE_URL with migrations applied and the seed run.
describe('Auth (e2e)', () => {
  let app: INestApplication<App>;
  let prisma: PrismaService;
  const phone = `+99899${Date.now() % 10_000_000}`;
  const adminPhone = `+99897${Date.now() % 10_000_000}`;
  const createdLocationName = `E2E-Loc-${Date.now()}`;
  const createdCategoryName = `E2E-Cat-${Date.now()}`;
  const modelName = `E2E-Model-${Date.now()}`;
  const accModelName = `E2E-Acc-${Date.now()}`;
  const imei1 = `99${Date.now()}`.slice(0, 15);
  const imei2 = `88${Date.now()}`.slice(0, 15);
  const batchImei = `77${Date.now()}`.slice(0, 15);
  const walkImei = `66${Date.now()}`.slice(0, 15);
  const supplierName = `E2E-Supplier-${Date.now()}`;
  // Filled in by the item tests, cleaned up in afterAll.
  let createdItemId = 0;
  let createdModelId = 0;
  let accModelId = 0;
  // Filled in by the buying (F04) tests.
  let supplierId = 0;
  let batchId = 0;
  let batchItemId = 0;
  let batchLineId = 0;
  let walkInItemId = 0;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();
    app = moduleFixture.createNestApplication();
    configureApp(app);
    await app.init();
    prisma = app.get(PrismaService);
    const staff = await prisma.role.findUniqueOrThrow({
      where: { name: 'Staff' },
    });
    const admin = await prisma.role.findUniqueOrThrow({
      where: { name: 'Admin' },
    });
    await prisma.user.create({
      data: {
        name: 'E2E',
        phone,
        passwordHash: await bcrypt.hash('pass12345', 4),
        roleId: staff.id,
      },
    });
    await prisma.user.create({
      data: {
        name: 'E2E-Admin',
        phone: adminPhone,
        passwordHash: await bcrypt.hash('pass12345', 4),
        roleId: admin.id,
      },
    });
  });

  afterAll(async () => {
    // Remove the items/stock this suite created, children (FKs) first.
    const modelIds = [createdModelId, accModelId].filter((id) => id > 0);
    if (supplierId) await prisma.supplierPayment.deleteMany({ where: { supplierId } });
    if (modelIds.length) {
      await prisma.purchaseLine.deleteMany({
        where: { OR: [{ productModelId: { in: modelIds } }, { item: { productModelId: { in: modelIds } } }] },
      });
    }
    const itemIds = [createdItemId, batchItemId, walkInItemId].filter((id) => id > 0);
    if (itemIds.length) await prisma.item.deleteMany({ where: { id: { in: itemIds } } });
    await prisma.walkInSeller.deleteMany({ where: { phone: '+998901234567' } });
    if (batchId) await prisma.batch.deleteMany({ where: { id: batchId } });
    if (supplierId) await prisma.supplier.deleteMany({ where: { id: supplierId } });
    if (accModelId) await prisma.accessoryStock.deleteMany({ where: { productModelId: accModelId } });
    if (modelIds.length) await prisma.productModel.deleteMany({ where: { id: { in: modelIds } } });

    // Remove the data this suite created, children first.
    const category = await prisma.category.findUnique({
      where: { name: createdCategoryName },
    });
    if (category) {
      await prisma.categoryAttribute.deleteMany({
        where: { categoryId: category.id },
      });
      await prisma.category.delete({ where: { id: category.id } });
    }
    await prisma.location.deleteMany({ where: { name: createdLocationName } });
    const users = await prisma.user.findMany({
      where: { phone: { in: [phone, adminPhone] } },
      select: { id: true },
    });
    await prisma.auditLog.deleteMany({
      where: { userId: { in: users.map((u) => u.id) } },
    });
    await prisma.user.deleteMany({ where: { phone: { in: [phone, adminPhone] } } });
    await app.close();
  });

  const login = async (p: string) => {
    const agent = request.agent(app.getHttpServer());
    await agent.post('/api/auth/login').send({ phone: p, password: 'pass12345' }).expect(200);
    return agent;
  };

  // Shared, memoized agents for the F04 tests so login stays under the rate limit (10/min).
  let f04Admin: Awaited<ReturnType<typeof login>> | undefined;
  let f04Staff: Awaited<ReturnType<typeof login>> | undefined;
  const adminAgent = async () => (f04Admin ??= await login(adminPhone));
  const staffAgent = async () => (f04Staff ??= await login(phone));

  it('GET /api/health/live is public', () =>
    request(app.getHttpServer()).get('/api/health/live').expect(200));

  it('GET /api/auth/me without a cookie is 401', () =>
    request(app.getHttpServer()).get('/api/auth/me').expect(401));

  it('POST /api/auth/login with a wrong password is 401', () =>
    request(app.getHttpServer())
      .post('/api/auth/login')
      .send({ phone, password: 'wrong-pass' })
      .expect(401));

  it('Staff: login, see self, and lack manage_users', async () => {
    const agent = await login(phone);
    const me = await agent.get('/api/auth/me').expect(200);
    const body = me.body as { user: { phone: string; passwordHash?: string } };
    expect(body.user.phone).toBe(phone);
    expect(body.user.passwordHash).toBeUndefined();

    await agent.get('/api/users').expect(403);
    await agent.post('/api/auth/logout').expect(204);
  });

  it('Staff sees InvestorSummary only (no shareValue) and cannot create a location', async () => {
    const agent = await login(phone);

    const investors = await agent.get('/api/investors').expect(200);
    const list = investors.body as Array<Record<string, unknown>>;
    expect(Array.isArray(list)).toBe(true);
    for (const inv of list) {
      expect(inv).not.toHaveProperty('shareValue');
      expect(inv).not.toHaveProperty('shareType');
      expect(inv).not.toHaveProperty('balance');
    }

    await agent
      .post('/api/locations')
      .send({ name: createdLocationName, type: 'SHOP' })
      .expect(403);
  });

  it('Admin manages locations, categories and attributes', async () => {
    const agent = await login(adminPhone);

    const created = await agent
      .post('/api/locations')
      .send({ name: createdLocationName, type: 'SHOP' })
      .expect(201);
    const locationId = (created.body as { id: number }).id;

    // Deactivate it: it disappears from the default list but stays with ?all=true.
    await agent.patch(`/api/locations/${locationId}`).send({ isActive: false }).expect(200);
    const active = await agent.get('/api/locations').expect(200);
    const all = await agent.get('/api/locations?all=true').expect(200);
    const activeIds = (active.body as Array<{ id: number }>).map((l) => l.id);
    const allIds = (all.body as Array<{ id: number }>).map((l) => l.id);
    expect(activeIds).not.toContain(locationId);
    expect(allIds).toContain(locationId);

    const category = await agent
      .post('/api/categories')
      .send({ name: createdCategoryName })
      .expect(201);
    const categoryId = (category.body as { id: number }).id;

    const attr = await agent
      .post(`/api/categories/${categoryId}/attributes`)
      .send({ key: 'storage', label: 'Storage', type: 'SELECT', options: ['128GB', '256GB'] })
      .expect(201);
    expect((attr.body as { key: string }).key).toBe('storage');
  });

  it('Admin receives a serialized item, rejects a duplicate IMEI, adds a second', async () => {
    const agent = await login(adminPhone);
    const iphone = await prisma.category.findUniqueOrThrow({ where: { name: 'iPhone' } });
    const own = await prisma.investor.findUniqueOrThrow({ where: { code: 'OWN' } });
    const sklad = await prisma.location.findFirstOrThrow({ where: { isActive: true } });

    const model = await agent
      .post('/api/product-models')
      .send({ categoryId: iphone.id, name: modelName })
      .expect(201);
    createdModelId = (model.body as { id: number }).id;

    const created = await agent
      .post('/api/items')
      .send({
        productModelId: createdModelId,
        investorId: own.id,
        locationId: sklad.id,
        attributes: { storage: '128GB', color: 'Black' },
        identifiers: [{ type: 'IMEI', value: imei1 }],
        purchasePrice: '1000',
        salePrice: '1500',
        minSalePrice: '1400',
      })
      .expect(201);
    const body = created.body as { id: number; purchasePrice: string; cost: string };
    createdItemId = body.id;
    expect(body.purchasePrice).toBe('1000.00'); // Admin has view_cost
    expect(body.cost).toBe('1000.00');

    // Same IMEI again → 409 naming the owning item.
    const dup = await agent
      .post('/api/items')
      .send({
        productModelId: createdModelId,
        investorId: own.id,
        locationId: sklad.id,
        attributes: { storage: '128GB' },
        identifiers: [{ type: 'IMEI', value: imei1 }],
      })
      .expect(409);
    expect((dup.body as { message: string }).message).toContain(`#${createdItemId}`);

    // A second, different IMEI on the same item → 201.
    await agent
      .post(`/api/items/${createdItemId}/identifiers`)
      .send({ type: 'IMEI', value: imei2 })
      .expect(201);

    // Scan lookup finds it.
    const scan = await agent.get(`/api/items/by-code/${imei1}`).expect(200);
    expect((scan.body as { id: number }).id).toBe(createdItemId);
    await agent.get('/api/items/by-code/NO-SUCH-CODE').expect(404);
  });

  it('Staff sees no cost on items and cannot set prices', async () => {
    const agent = await login(phone);
    const list = await agent.get('/api/items').expect(200);
    const page = list.body as { items: Array<Record<string, unknown>> };
    for (const item of page.items) {
      expect(item).not.toHaveProperty('purchasePrice');
      expect(item).not.toHaveProperty('cost');
    }
    await agent
      .patch(`/api/items/${createdItemId}/prices`)
      .send({ salePrice: '2000' })
      .expect(403);
  });

  it('POST /accessory-stock twice adds quantities', async () => {
    const agent = await login(adminPhone);
    const accessory = await prisma.category.findUniqueOrThrow({ where: { name: 'Accessory' } });
    const sklad = await prisma.location.findFirstOrThrow({ where: { isActive: true } });

    const model = await agent
      .post('/api/product-models')
      .send({ categoryId: accessory.id, name: accModelName })
      .expect(201);
    accModelId = (model.body as { id: number }).id;

    const first = await agent
      .post('/api/accessory-stock')
      .send({ productModelId: accModelId, locationId: sklad.id, quantity: 5, unitCost: '10' })
      .expect(201);
    expect((first.body as { quantity: number }).quantity).toBe(5);

    const second = await agent
      .post('/api/accessory-stock')
      .send({ productModelId: accModelId, locationId: sklad.id, quantity: 3 })
      .expect(201);
    expect((second.body as { quantity: number }).quantity).toBe(8);
  });

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
        productModelId: createdModelId,
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
    const created = await staff
      .post('/api/walk-in-purchases')
      .send({
        seller: { name: 'Walk Seller', phone: '+998901234567' },
        productModelId: createdModelId,
        locationId: (await prisma.location.findFirstOrThrow({ where: { isActive: true } })).id,
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
        seller: { name: 'Walk Seller', phone: '+998901234567' },
        productModelId: createdModelId,
        locationId: (await prisma.location.findFirstOrThrow({ where: { isActive: true } })).id,
        identifiers: [{ type: 'IMEI', value: walkImei }],
        condition: 'USED',
        pricePaid: '500',
      })
      .expect(409);
    expect((dup.body as { message: string }).message).toContain('(IN_STOCK)');
  });

  it('POST /items/:id/system-code twice returns the same BS- code', async () => {
    const agent = await adminAgent();
    const first = await agent.post(`/api/items/${createdItemId}/system-code`).expect(201);
    const code = (first.body as { value: string }).value;
    expect(code).toBe(`BS-${String(createdItemId).padStart(6, '0')}`);

    const second = await agent.post(`/api/items/${createdItemId}/system-code`).expect(200);
    expect((second.body as { value: string }).value).toBe(code);
  });
});
