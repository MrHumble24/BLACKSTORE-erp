import { INestApplication } from '@nestjs/common';
import { App } from 'supertest/types';
import * as ExcelJS from 'exceljs';
import { PrismaService } from './../src/prisma/prisma.service';
import { cleanupUsers, createTestApp, loginAs, seedUsers } from './e2e-setup';

// FR-7 stock import: template download and row-by-row item creation.
// Needs a reachable DATABASE_URL with migrations applied and the seed run.
describe('Items import (e2e)', () => {
  let app: INestApplication<App>;
  let prisma: PrismaService;
  let staffPhone = '';
  let adminPhone = '';
  const catName = `E2E-Imp-Cat-${Date.now()}`;
  const modelName = `E2E-Imp-Model-${Date.now()}`;
  const imei1 = `11${Date.now()}`.slice(0, 15);
  const imei2 = `22${Date.now()}`.slice(0, 15);
  let catId = 0;
  let modelId = 0;

  beforeAll(async () => {
    app = await createTestApp();
    prisma = app.get(PrismaService);
    ({ staffPhone, adminPhone } = await seedUsers(prisma));
    const cat = await prisma.category.create({ data: { name: catName, isSerialized: true } });
    catId = cat.id;
    const model = await prisma.productModel.create({ data: { categoryId: catId, name: modelName } });
    modelId = model.id;
  });

  afterAll(async () => {
    const idents = await prisma.itemIdentifier.findMany({
      where: { value: { in: [imei1, imei2] } },
      select: { itemId: true },
    });
    const itemIds = idents.map((i) => i.itemId);
    if (itemIds.length) {
      await prisma.purchaseLine.deleteMany({ where: { itemId: { in: itemIds } } });
      await prisma.auditLog.deleteMany({ where: { entity: 'Item', entityId: { in: itemIds } } });
      await prisma.itemIdentifier.deleteMany({ where: { itemId: { in: itemIds } } });
      await prisma.item.deleteMany({ where: { id: { in: itemIds } } });
    }
    await prisma.productModel.deleteMany({ where: { id: modelId } });
    await prisma.category.deleteMany({ where: { id: catId } });
    await cleanupUsers(prisma, [staffPhone, adminPhone]);
    await app.close();
  });

  let adminCache: Awaited<ReturnType<typeof loginAs>> | undefined;
  let staffCache: Awaited<ReturnType<typeof loginAs>> | undefined;
  const adminAgent = async () => (adminCache ??= await loginAs(app, adminPhone));
  const staffAgent = async () => (staffCache ??= await loginAs(app, staffPhone));

  /** Builds an .xlsx with the five required columns and the given data rows. */
  async function buildFile(rows: string[][]): Promise<Buffer> {
    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet('items');
    sheet.addRow(['category', 'model', 'identifier', 'owner_code', 'location']);
    rows.forEach((r) => sheet.addRow(r));
    return Buffer.from(await workbook.xlsx.writeBuffer());
  }

  it('Admin downloads the .xlsx template', async () => {
    const admin = await adminAgent();
    const res = await admin.get('/api/items/import/template').responseType('blob').expect(200);
    expect(res.headers['content-disposition']).toMatch(/attachment/);
    expect((res.body as Buffer).length).toBeGreaterThan(0);
  });

  it('Admin imports 2 good rows and 1 bad row: created 2, one error on row 4', async () => {
    const admin = await adminAgent();
    const sklad = await prisma.location.findFirstOrThrow({ where: { isActive: true } });
    const file = await buildFile([
      [catName, modelName, imei1, 'OWN', sklad.name],
      [catName, modelName, imei2, 'OWN', sklad.name],
      [catName, modelName, 'SERIAL-X', 'NOPE', sklad.name], // unknown owner → fails
    ]);
    const res = await admin.post('/api/items/import').attach('file', file, 'import.xlsx').expect(200);
    const body = res.body as { created: number; errors: { row: number; message: string }[] };
    expect(body.created).toBe(2);
    expect(body.errors).toHaveLength(1);
    expect(body.errors[0].row).toBe(4);
    expect(body.errors[0].message).toMatch(/owner/i);

    const idents = await prisma.itemIdentifier.findMany({ where: { value: { in: [imei1, imei2] } } });
    expect(idents).toHaveLength(2);
  });

  it('Staff cannot import (403)', async () => {
    const staff = await staffAgent();
    const file = await buildFile([[catName, modelName, `33${Date.now()}`.slice(0, 15), 'OWN', 'Sklad']]);
    await staff.post('/api/items/import').attach('file', file, 'import.xlsx').expect(403);
  });
});
