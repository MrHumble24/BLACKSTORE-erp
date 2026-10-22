import { INestApplication } from '@nestjs/common';
import { App } from 'supertest/types';
import request from 'supertest';
import { PrismaService } from './../src/prisma/prisma.service';
import { cleanupUsers, createTestApp, loginAs, seedUsers } from './e2e-setup';

// F01–F03: auth, roles, master data, items and accessory stock.
// Needs a reachable DATABASE_URL with migrations applied and the seed run.
describe('App (e2e)', () => {
  let app: INestApplication<App>;
  let prisma: PrismaService;
  let phone = '';
  let adminPhone = '';
  const createdLocationName = `E2E-Loc-${Date.now()}`;
  const createdCategoryName = `E2E-Cat-${Date.now()}`;
  const modelName = `E2E-Model-${Date.now()}`;
  const accModelName = `E2E-Acc-${Date.now()}`;
  const imei1 = `99${Date.now()}`.slice(0, 15);
  const imei2 = `88${Date.now()}`.slice(0, 15);
  // Filled in by the item/accessory tests, cleaned up in afterAll.
  let createdItemId = 0;
  let createdModelId = 0;
  let accModelId = 0;

  beforeAll(async () => {
    app = await createTestApp();
    prisma = app.get(PrismaService);
    ({ staffPhone: phone, adminPhone } = await seedUsers(prisma));
  });

  afterAll(async () => {
    const modelIds = [createdModelId, accModelId].filter((id) => id > 0);
    if (modelIds.length) {
      await prisma.purchaseLine.deleteMany({
        where: { OR: [{ productModelId: { in: modelIds } }, { item: { productModelId: { in: modelIds } } }] },
      });
    }
    if (createdItemId) await prisma.item.deleteMany({ where: { id: createdItemId } });
    if (accModelId) await prisma.accessoryStock.deleteMany({ where: { productModelId: accModelId } });
    if (modelIds.length) await prisma.productModel.deleteMany({ where: { id: { in: modelIds } } });

    const category = await prisma.category.findUnique({ where: { name: createdCategoryName } });
    if (category) {
      await prisma.categoryAttribute.deleteMany({ where: { categoryId: category.id } });
      await prisma.category.delete({ where: { id: category.id } });
    }
    await prisma.location.deleteMany({ where: { name: createdLocationName } });
    await cleanupUsers(prisma, [phone, adminPhone]);
    await app.close();
  });

  const login = (p: string) => loginAs(app, p);

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

  it('POST /items/:id/system-code twice returns the same BS- code', async () => {
    const agent = await login(adminPhone);
    const first = await agent.post(`/api/items/${createdItemId}/system-code`).expect(201);
    const code = (first.body as { value: string }).value;
    expect(code).toBe(`BS-${String(createdItemId).padStart(6, '0')}`);

    const second = await agent.post(`/api/items/${createdItemId}/system-code`).expect(200);
    expect((second.body as { value: string }).value).toBe(code);
  });
});
