import { INestApplication } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import * as bcrypt from 'bcrypt';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from './../src/app.module';
import { configureApp } from './../src/app.setup';
import { PrismaService } from './../src/prisma/prisma.service';

// F06 Operations flows: transfers, stock counts, ledger, audit log.
// Bootstrap + login are copied from app.e2e-spec.ts for now; the merge will switch to test/e2e-setup.ts.
// Needs a reachable DATABASE_URL with migrations applied and the seed run.
describe('Operations (e2e)', () => {
  let app: INestApplication<App>;
  let prisma: PrismaService;
  const staffPhone = `+99891${Date.now() % 10_000_000}`;
  const adminPhone = `+99890${Date.now() % 10_000_000}`;
  const deviceModelName = `E2E-Op-Phone-${Date.now()}`;
  const accModelName = `E2E-Op-Acc-${Date.now()}`;
  const secondLocationName = `E2E-Op-Loc2-${Date.now()}`;
  const walkImei = `55${Date.now()}`.slice(0, 15);

  // Prerequisite rows, created in beforeAll and cleaned up in afterAll.
  let skladId = 0;
  let deviceModelId = 0;
  let accModelId = 0;
  let transferItemId = 0; // moved by the transfer test
  let missingItemId = 0; // IN_STOCK at sklad, never scanned → "missing"
  let foundItemId = 0; // IN_STOCK at sklad, carries walkImei → "found"
  // Filled in by the tests.
  let secondLocationId = 0;
  let transferId = 0;
  const stockCountIds: number[] = [];
  let ledgerEntryId = 0;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = moduleFixture.createNestApplication();
    configureApp(app);
    await app.init();
    prisma = app.get(PrismaService);

    const [staff, admin] = await Promise.all([
      prisma.role.findUniqueOrThrow({ where: { name: 'Staff' } }),
      prisma.role.findUniqueOrThrow({ where: { name: 'Admin' } }),
    ]);
    const hash = await bcrypt.hash('pass12345', 4);
    await prisma.user.createMany({
      data: [
        { name: 'E2E-Op-Staff', phone: staffPhone, passwordHash: hash, roleId: staff.id },
        { name: 'E2E-Op-Admin', phone: adminPhone, passwordHash: hash, roleId: admin.id },
      ],
    });

    // Prerequisite master data from the seed.
    const [iphone, accessory, own, sklad] = await Promise.all([
      prisma.category.findUniqueOrThrow({ where: { name: 'iPhone' } }),
      prisma.category.findUniqueOrThrow({ where: { name: 'Accessory' } }),
      prisma.investor.findUniqueOrThrow({ where: { code: 'OWN' } }),
      prisma.location.findFirstOrThrow({ where: { isActive: true } }),
    ]);
    skladId = sklad.id;

    const deviceModel = await prisma.productModel.create({
      data: { categoryId: iphone.id, name: deviceModelName },
    });
    deviceModelId = deviceModel.id;
    const accModel = await prisma.productModel.create({
      data: { categoryId: accessory.id, name: accModelName },
    });
    accModelId = accModel.id;

    // Three serialized devices IN_STOCK at the source; foundItem carries the IMEI we scan.
    const device = (extra: object = {}) => ({
      productModelId: deviceModelId,
      investorId: own.id,
      locationId: skladId,
      attributes: {},
      purchasePrice: '1000',
      ...extra,
    });
    const [transferItem, missingItem, foundItem] = await Promise.all([
      prisma.item.create({ data: device() }),
      prisma.item.create({ data: device() }),
      prisma.item.create({
        data: device({ identifiers: { create: { type: 'IMEI', value: walkImei } } }),
      }),
    ]);
    transferItemId = transferItem.id;
    missingItemId = missingItem.id;
    foundItemId = foundItem.id;

    // Accessory stock: 8 units at the source, so the transfer can move 2 and leave 6.
    await prisma.accessoryStock.create({
      data: { productModelId: accModelId, locationId: skladId, quantity: 8, avgCost: '10' },
    });
  });

  afterAll(async () => {
    // Children first (FKs), then the rows this suite created.
    if (transferId) {
      await prisma.transferAccessory.deleteMany({ where: { transferId } });
      await prisma.transferItem.deleteMany({ where: { transferId } });
      await prisma.transfer.deleteMany({ where: { id: transferId } });
    }
    if (stockCountIds.length) {
      await prisma.stockCountScan.deleteMany({ where: { stockCountId: { in: stockCountIds } } });
      await prisma.stockCount.deleteMany({ where: { id: { in: stockCountIds } } });
    }
    if (ledgerEntryId) await prisma.ledgerEntry.deleteMany({ where: { id: ledgerEntryId } });

    const itemIds = [transferItemId, missingItemId, foundItemId].filter((id) => id > 0);
    if (itemIds.length) await prisma.item.deleteMany({ where: { id: { in: itemIds } } });
    const modelIds = [deviceModelId, accModelId].filter((id) => id > 0);
    if (accModelId) await prisma.accessoryStock.deleteMany({ where: { productModelId: accModelId } });
    if (modelIds.length) await prisma.productModel.deleteMany({ where: { id: { in: modelIds } } });
    await prisma.location.deleteMany({ where: { name: secondLocationName } });

    const users = await prisma.user.findMany({
      where: { phone: { in: [staffPhone, adminPhone] } },
      select: { id: true },
    });
    await prisma.auditLog.deleteMany({ where: { userId: { in: users.map((u) => u.id) } } });
    await prisma.user.deleteMany({ where: { phone: { in: [staffPhone, adminPhone] } } });
    await app.close();
  });

  const login = async (p: string) => {
    const agent = request.agent(app.getHttpServer());
    await agent.post('/api/auth/login').send({ phone: p, password: 'pass12345' }).expect(200);
    return agent;
  };
  // Memoized agents so logins stay under the rate limit (10/min).
  let adminCached: Awaited<ReturnType<typeof login>> | undefined;
  let staffCached: Awaited<ReturnType<typeof login>> | undefined;
  const adminAgent = async () => (adminCached ??= await login(adminPhone));
  const staffAgent = async () => (staffCached ??= await login(staffPhone));

  it('Admin creates a second location; Staff transfers an item + 2 accessory units', async () => {
    const admin = await adminAgent();
    const staff = await staffAgent();

    const loc = await admin.post('/api/locations').send({ name: secondLocationName, type: 'SHOP' }).expect(201);
    secondLocationId = (loc.body as { id: number }).id;

    const transfer = await staff
      .post('/api/transfers')
      .send({
        fromLocationId: skladId,
        toLocationId: secondLocationId,
        itemIds: [transferItemId],
        accessories: [{ productModelId: accModelId, quantity: 2 }],
      })
      .expect(201);
    const body = transfer.body as { id: number; itemCount: number; accessoryUnits: number };
    transferId = body.id;
    expect(body.itemCount).toBe(1);
    expect(body.accessoryUnits).toBe(2);

    // The device now lives at the new location.
    const item = await staff.get(`/api/items/${transferItemId}`).expect(200);
    expect((item.body as { location: { id: number } }).location.id).toBe(secondLocationId);

    // The transfer is findable by the moved item.
    const list = await staff.get(`/api/transfers?itemId=${transferItemId}`).expect(200);
    expect((list.body as { items: Array<{ id: number }> }).items.map((t) => t.id)).toContain(transferId);

    // Accessory quantities moved: 2 at the new location, source reduced to 6 (was 8).
    const atNew = await staff.get(`/api/accessory-stock?locationId=${secondLocationId}`).expect(200);
    const movedRow = (atNew.body as { items: Array<{ productModel: { id: number }; quantity: number }> }).items.find(
      (r) => r.productModel.id === accModelId,
    );
    expect(movedRow?.quantity).toBe(2);
    const atSklad = await staff.get(`/api/accessory-stock?locationId=${skladId}`).expect(200);
    const srcRow = (atSklad.body as { items: Array<{ productModel: { id: number }; quantity: number }> }).items.find(
      (r) => r.productModel.id === accModelId,
    );
    expect(srcRow?.quantity).toBe(6);
  });

  it('Staff runs a stock count at the source: FOUND, UNKNOWN, DUPLICATE, then finishes', async () => {
    const staff = await staffAgent();

    const started = await staff.post('/api/stock-counts').send({ locationId: skladId }).expect(201);
    const countId = (started.body as { id: number }).id;
    stockCountIds.push(countId);

    // A second start while one is open → 409.
    await staff.post('/api/stock-counts').send({ locationId: skladId }).expect(409);

    // walkImei belongs to foundItem, still IN_STOCK at the source → FOUND.
    const found = await staff.post(`/api/stock-counts/${countId}/scans`).send({ code: walkImei }).expect(201);
    expect((found.body as { status: string }).status).toBe('FOUND');

    const unknown = await staff.post(`/api/stock-counts/${countId}/scans`).send({ code: 'NOPE-123' }).expect(201);
    expect((unknown.body as { status: string; item: unknown }).status).toBe('UNKNOWN');
    expect((unknown.body as { item: unknown }).item).toBeNull();

    // Same code again → DUPLICATE with HTTP 200 (not a new row).
    const dup = await staff.post(`/api/stock-counts/${countId}/scans`).send({ code: walkImei }).expect(200);
    expect((dup.body as { status: string }).status).toBe('DUPLICATE');

    // missingItem is also IN_STOCK at the source but was not scanned → missing; only foundItem was found.
    const read = await staff.get(`/api/stock-counts/${countId}`).expect(200);
    const result = (read.body as { result: { missing: Array<{ id: number }>; found: number } }).result;
    expect(result.missing.map((i) => i.id)).toContain(missingItemId);
    expect(result.found).toBe(1);

    await staff.post(`/api/stock-counts/${countId}/finish`).expect(200);
    // A second start for the same location now succeeds (the first is finished).
    const restart = await staff.post('/api/stock-counts').send({ locationId: skladId }).expect(201);
    const restartId = (restart.body as { id: number }).id;
    stockCountIds.push(restartId);
    await staff.post(`/api/stock-counts/${restartId}/finish`).expect(200);
  });

  it('Admin posts an expense and reads totals; countsInProfit is forced false', async () => {
    const admin = await adminAgent();
    const entry = await admin
      .post('/api/ledger')
      .send({ type: 'EXPENSE', category: 'Rent', amount: '500', countsInProfit: true })
      .expect(201);
    const body = entry.body as { id: number; countsInProfit: boolean };
    ledgerEntryId = body.id;
    expect(body.countsInProfit).toBe(false);

    const page = await admin.get('/api/ledger?type=EXPENSE').expect(200);
    const totals = (page.body as { totals: { expense: string } }).totals;
    expect(Number(totals.expense)).toBeGreaterThanOrEqual(500);
  });

  it('Audit log: Staff is 403, Admin sees the transfer row', async () => {
    const staff = await staffAgent();
    const admin = await adminAgent();

    await staff.get('/api/audit-log').expect(403);

    const log = await admin.get(`/api/audit-log?entity=Transfer&entityId=${transferId}`).expect(200);
    const rows = (log.body as { items: Array<{ entity: string; entityId: number; action: string }> }).items;
    expect(rows.some((r) => r.entity === 'Transfer' && r.entityId === transferId && r.action === 'create')).toBe(true);
  });
});
