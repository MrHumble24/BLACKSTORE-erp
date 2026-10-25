import { Prisma } from '@prisma/client';
import { AuditService } from '../audit/audit.service';
import { PrismaService } from '../prisma/prisma.service';
import { PartnersService } from './partners.service';

const d = (v: string) => new Prisma.Decimal(v);

describe('PartnersService report numbers', () => {
  it('computes held, overdue, soldUnpaid and totalOwed from records (BR-8)', async () => {
    const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const prisma = {
      partner: {
        findUnique: jest.fn().mockResolvedValue({ id: 1, name: 'Bozor', phone: '+99890', marketLocation: null, note: null }),
      },
      consignmentItem: {
        findMany: jest.fn().mockResolvedValue([
          { consignment: { partnerId: 1, dueDate: yesterday } }, // held + overdue
          { consignment: { partnerId: 1, dueDate: null } }, // held, no due date
        ]),
      },
      sale: {
        findMany: jest.fn().mockResolvedValue([
          { partnerId: 1, total: d('1000'), payments: [{ amount: d('200') }], returns: [] }, // balance 800
          { partnerId: 1, total: d('500'), payments: [], returns: [] }, // balance 500
        ]),
      },
    } as unknown as PrismaService;
    const service = new PartnersService(prisma, {} as AuditService);

    const report = await service.findOne(1);

    expect(report.held).toBe(2);
    expect(report.overdue).toBe(1);
    expect(report.soldUnpaid).toBe(2);
    expect(report.totalOwed).toBe('1300.00'); // 800 + 500
  });

  it('stores a missing phone as null on create, and a blank phone clears it on update', async () => {
    const row = { id: 2, name: 'Bozor', phone: null, marketLocation: null, note: null };
    const tx = {
      partner: {
        create: jest.fn().mockResolvedValue(row),
        findUnique: jest.fn().mockResolvedValue({ ...row, phone: '+99890' }),
        update: jest.fn().mockResolvedValue(row),
      },
    };
    const prisma = { $transaction: (fn: (t: typeof tx) => unknown) => fn(tx) } as unknown as PrismaService;
    const audit = { log: jest.fn() } as unknown as AuditService;
    const service = new PartnersService(prisma, audit);

    const created = await service.create({ name: ' Bozor ' }, 1);
    await service.update(2, { phone: '  ' }, 1);
    await service.update(2, { name: 'X' }, 1);

    expect(created.phone).toBeNull();
    expect(tx.partner.create.mock.calls[0][0].data.phone).toBeNull();
    expect(tx.partner.update.mock.calls[0][0].data.phone).toBeNull(); // blank clears (iOS sends "")
    expect(tx.partner.update.mock.calls[1][0].data.phone).toBeUndefined(); // omitted leaves it
  });
});
