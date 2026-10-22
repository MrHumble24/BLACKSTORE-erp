import { Prisma } from '@prisma/client';
import { AuditService } from '../audit/audit.service';
import { PrismaService } from '../prisma/prisma.service';
import { CustomersService } from './customers.service';

describe('CustomersService.findOne debt (BR-8)', () => {
  const customer = { findUnique: jest.fn() };
  const sale = { findMany: jest.fn() };
  const prisma = { customer, sale } as unknown as PrismaService;
  const audit = { log: jest.fn() } as unknown as AuditService;
  const service = new CustomersService(prisma, audit);

  beforeEach(() => jest.clearAllMocks());

  it('= Σ (total − paid − refunded) over the customer DEBT sales', async () => {
    customer.findUnique.mockResolvedValue({
      id: 2,
      name: 'A',
      phone: '+99890',
      note: null,
      createdAt: new Date(),
    });
    sale.findMany.mockResolvedValue([
      // 1000 − 400 paid = 600 owed
      { total: new Prisma.Decimal('1000'), payments: [{ amount: new Prisma.Decimal('400') }], returns: [] },
      // 500 − 100 refunded = 400 owed
      { total: new Prisma.Decimal('500'), payments: [], returns: [{ refundAmount: new Prisma.Decimal('100') }] },
    ]);
    const result = (await service.findOne(2)) as { debt: string };
    expect(result.debt).toBe('1000.00'); // 600 + 400
  });

  it('404 when the customer is missing', async () => {
    customer.findUnique.mockResolvedValue(null);
    await expect(service.findOne(99)).rejects.toThrow('not found');
  });
});
