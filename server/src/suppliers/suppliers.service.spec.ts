import { Prisma } from '@prisma/client';
import { AuditService } from '../audit/audit.service';
import type { PublicUser } from '../common/auth-user';
import { PrismaService } from '../prisma/prisma.service';
import { SuppliersService } from './suppliers.service';

const user = (permissions: string[]): PublicUser =>
  ({ id: 1, role: { permissions } }) as unknown as PublicUser;

describe('SuppliersService balance (BR-8)', () => {
  const supplier = { findUnique: jest.fn() };
  const purchaseLine = { findMany: jest.fn() };
  const supplierPayment = { aggregate: jest.fn() };
  const prisma = {
    supplier,
    purchaseLine,
    supplierPayment,
    // $transaction([...]) resolves each thenable in the array.
    $transaction: (arg: unknown) => (Array.isArray(arg) ? Promise.all(arg) : (arg as () => unknown)()),
  } as unknown as PrismaService;
  const audit = { log: jest.fn() } as unknown as AuditService;
  const service = new SuppliersService(prisma, audit);

  beforeEach(() => jest.clearAllMocks());

  it('= Σ(unitPrice × quantity) − Σ payments, fee excluded', async () => {
    supplier.findUnique.mockResolvedValue({ id: 3, name: 'A', country: null, isActive: true, phone: null, note: null });
    // 1000×1 + 10×5 = 1050 owed
    purchaseLine.findMany.mockResolvedValue([
      { unitPrice: new Prisma.Decimal('1000'), quantity: 1 },
      { unitPrice: new Prisma.Decimal('10'), quantity: 5 },
    ]);
    supplierPayment.aggregate.mockResolvedValue({ _sum: { amount: new Prisma.Decimal('400') } });

    const result = (await service.findOne(3, user(['view_cost']))) as { balance: string };
    expect(result.balance).toBe('650.00'); // 1050 − 400
  });

  it('hides the balance key without view_cost', async () => {
    supplier.findUnique.mockResolvedValue({ id: 3, name: 'A', country: null, isActive: true, phone: null, note: null });
    const result = await service.findOne(3, user(['manage_suppliers']));
    expect(result).not.toHaveProperty('balance');
    expect(purchaseLine.findMany).not.toHaveBeenCalled();
  });
});
