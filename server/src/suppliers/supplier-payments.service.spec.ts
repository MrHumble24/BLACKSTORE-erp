import { BadRequestException, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { AuditService } from '../audit/audit.service';
import { PrismaService } from '../prisma/prisma.service';
import { SupplierPaymentsService } from './supplier-payments.service';

describe('SupplierPaymentsService (F25 investor money)', () => {
  const supplierPayment = { create: jest.fn(), findMany: jest.fn(), count: jest.fn() };
  const supplier = { count: jest.fn(), findUnique: jest.fn() };
  const investor = { findUnique: jest.fn(), count: jest.fn() };
  const prisma = {
    supplierPayment,
    supplier,
    investor,
    // $transaction([...]) resolves each thenable; $transaction(cb) runs cb with the same mocks.
    $transaction: (arg: unknown) =>
      Array.isArray(arg) ? Promise.all(arg) : (arg as (tx: unknown) => unknown)({ supplierPayment, supplier }),
  } as unknown as PrismaService;
  const audit = { log: jest.fn() } as unknown as AuditService;
  const service = new SupplierPaymentsService(prisma, audit);

  const stored = (over: object = {}) => ({
    id: 9, supplierId: 2, amount: new Prisma.Decimal('1000'), fee: new Prisma.Decimal('10'),
    date: new Date('2026-10-20T00:00:00Z'), note: null, investorId: 4, feePaidBy: 'INVESTOR',
    investor: { id: 4, name: 'A' }, ...over,
  });
  const createData = () => (supplierPayment.create.mock.calls[0] as [{ data: Record<string, unknown> }])[0].data;

  beforeEach(() => {
    jest.clearAllMocks();
    supplier.count.mockResolvedValue(1);
    supplier.findUnique.mockResolvedValue({ investor: { id: 4 } });
    investor.findUnique.mockResolvedValue({ isOwn: null, isActive: true });
    investor.count.mockResolvedValue(1);
    supplierPayment.create.mockResolvedValue(stored());
  });

  it('stores the investor and fee payer and returns them', async () => {
    const result = await service.create(2, { amount: '1000', fee: '10', investorId: 4, feePaidBy: 'INVESTOR' }, 1);
    expect(createData()).toMatchObject({ investorId: 4, feePaidBy: 'INVESTOR' });
    expect(result).toMatchObject({ investor: { id: 4, name: 'A' }, feePaidBy: 'INVESTOR', fee: '10.00' });
  });

  it('defaults feePaidBy to BUSINESS with no investor', async () => {
    supplierPayment.create.mockResolvedValue(stored({ investorId: null, investor: null, feePaidBy: 'BUSINESS' }));
    await service.create(2, { amount: '1000' }, 1);
    expect(createData()).toMatchObject({ investorId: undefined, feePaidBy: 'BUSINESS' });
    expect(investor.findUnique).not.toHaveBeenCalled();
  });

  it('400 for feePaidBy INVESTOR without an investor on an unlinked supplier', async () => {
    supplier.findUnique.mockResolvedValue({ investor: null });
    await expect(service.create(2, { amount: '1000', feePaidBy: 'INVESTOR' }, 1)).rejects.toThrow(BadRequestException);
    expect(supplier.findUnique).toHaveBeenCalledWith({ where: { id: 2 }, select: { investor: { select: { id: true } } } });
    expect(supplierPayment.create).not.toHaveBeenCalled();
  });

  it('404 for an unknown supplier', async () => {
    supplier.findUnique.mockResolvedValue(null);
    await expect(service.create(2, { amount: '1000' }, 1)).rejects.toThrow(new NotFoundException('Supplier not found'));
    expect(supplierPayment.create).not.toHaveBeenCalled();
  });

  it('stores feePaidBy INVESTOR without an investor on a linked supplier (F26)', async () => {
    supplierPayment.create.mockResolvedValue(stored({ investorId: null, investor: null }));
    await service.create(2, { amount: '1000', fee: '50', feePaidBy: 'INVESTOR' }, 1);
    expect(createData()).toMatchObject({ investorId: undefined, feePaidBy: 'INVESTOR' });
  });

  it('404 for an unknown investor', async () => {
    investor.findUnique.mockResolvedValue(null);
    await expect(service.create(2, { amount: '1000', investorId: 99 }, 1)).rejects.toThrow(
      new NotFoundException('Investor not found'),
    );
  });

  it.each([
    ['the OWN investor', { isOwn: true, isActive: true }, "Use no investor for the business's own money"],
    ['an inactive investor', { isOwn: null, isActive: false }, 'Inactive investor'],
  ])('400 for %s', async (_label, row, message) => {
    investor.findUnique.mockResolvedValue(row);
    await expect(service.create(2, { amount: '1000', investorId: 4 }, 1)).rejects.toThrow(
      new BadRequestException(message),
    );
    expect(supplierPayment.create).not.toHaveBeenCalled();
  });

  it('400 for a negative fee on a positive amount', async () => {
    await expect(service.create(2, { amount: '1000', fee: '-10' }, 1)).rejects.toThrow(
      new BadRequestException('A negative fee is only allowed on a correcting entry'),
    );
  });

  it('400 for a fee correction larger than the corrected amount', async () => {
    await expect(service.create(2, { amount: '-10', fee: '-11' }, 1)).rejects.toThrow(
      new BadRequestException('A fee correction cannot exceed the corrected amount'),
    );
    expect(supplierPayment.create).not.toHaveBeenCalled();
  });

  it('stores a negative fee on a correcting entry', async () => {
    await service.create(2, { amount: '-1000', fee: '-10', investorId: 4, feePaidBy: 'INVESTOR' }, 1);
    const data = createData() as { amount: Prisma.Decimal; fee: Prisma.Decimal };
    expect(data.amount.toFixed(2)).toBe('-1000.00');
    expect(data.fee.toFixed(2)).toBe('-10.00');
  });

  it('findAllForInvestor filters by investor and includes the supplier name', async () => {
    supplierPayment.findMany.mockResolvedValue([stored({ supplier: { id: 2, name: 'Dubai' } })]);
    supplierPayment.count.mockResolvedValue(1);
    const result = await service.findAllForInvestor(4, { page: 2, pageSize: 10 });
    expect(supplierPayment.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { investorId: 4 },
        include: { supplier: { select: { id: true, name: true } } },
        skip: 10,
        take: 10,
      }),
    );
    expect(supplierPayment.count).toHaveBeenCalledWith({ where: { investorId: 4 } });
    expect(result).toEqual({
      items: [{
        id: 9, date: '2026-10-20T00:00:00.000Z', amount: '1000.00', fee: '10.00',
        feePaidBy: 'INVESTOR', note: null, supplier: { id: 2, name: 'Dubai' },
      }],
      total: 1, page: 2, pageSize: 10,
    });
  });

  it('findAllForInvestor 404s for an unknown investor', async () => {
    investor.count.mockResolvedValue(0);
    await expect(service.findAllForInvestor(99, { page: 1, pageSize: 10 })).rejects.toThrow(
      new NotFoundException('Investor not found'),
    );
    expect(supplierPayment.findMany).not.toHaveBeenCalled();
  });
});
