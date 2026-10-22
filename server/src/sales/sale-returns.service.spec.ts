import { ItemStatus, Prisma, SaleStatus } from '@prisma/client';
import { AuditService } from '../audit/audit.service';
import type { PublicUser } from '../common/auth-user';
import { ItemsService } from '../items/items.service';
import { PrismaService } from '../prisma/prisma.service';
import { CreateReturnDto } from './dto/create-return.dto';
import { SaleReturnsService } from './sale-returns.service';

const actor = { id: 5, role: { permissions: ['sell'] } } as unknown as PublicUser;

const detailRow = {
  id: 1,
  createdAt: new Date(),
  status: 'RETURNED',
  dueDate: null,
  total: new Prisma.Decimal('1500'),
  customer: null,
  location: { id: 1, name: 'Shop' },
  seller: { id: 5, name: 'E2E' },
  items: [],
  payments: [],
  returns: [],
};

// A PAID sale with one device line (id 10) paid in full.
function saleWith(items: unknown[], payments = [{ amount: new Prisma.Decimal('1500') }]) {
  return {
    status: SaleStatus.PAID,
    total: new Prisma.Decimal('1500'),
    locationId: 1,
    payments,
    returns: [],
    items,
  };
}

function build(sale: unknown) {
  const changeStatus = jest.fn();
  const tx = {
    sale: {
      findUnique: jest.fn().mockResolvedValue(sale),
      findUniqueOrThrow: jest.fn().mockResolvedValue(detailRow),
      update: jest.fn(),
    },
    return: { create: jest.fn() },
    item: { update: jest.fn(), findMany: jest.fn().mockResolvedValue([]) },
    accessoryStock: { update: jest.fn() },
  };
  const prisma = { $transaction: (cb: (t: unknown) => unknown) => cb(tx) } as unknown as PrismaService;
  const audit = { log: jest.fn() } as unknown as AuditService;
  const items = { changeStatus } as unknown as ItemsService;
  return { service: new SaleReturnsService(prisma, audit, items), tx, changeStatus };
}

const deviceLine = { id: 10, itemId: 7, productModelId: 3, quantity: 1, unitPrice: new Prisma.Decimal('1500') };
const accessoryLine = { id: 11, itemId: null, productModelId: 3, quantity: 5, unitPrice: new Prisma.Decimal('10') };

describe('SaleReturnsService.create', () => {
  it('rejects a refund above the line cap (unitPrice × quantity)', async () => {
    const { service } = build(saleWith([deviceLine]));
    const dto: CreateReturnDto = { saleItemId: 10, refundAmount: '2000', result: 'BACK_TO_STOCK' };
    await expect(service.create(1, dto, actor)).rejects.toThrow('refund cap');
  });

  it('rejects returning more than was sold', async () => {
    const { service } = build(saleWith([accessoryLine], []));
    const dto: CreateReturnDto = { saleItemId: 11, quantity: 6, refundAmount: '0', result: 'BACK_TO_STOCK' };
    await expect(service.create(1, dto, actor)).rejects.toThrow('exceeds what was sold');
  });

  it('caps the refund at the goods actually returned (unitPrice × returned − refundedSoFar)', async () => {
    // One unit already returned+refunded 1500; returning a 2nd of a 3-qty line leaves a 1500 cap.
    const line = { id: 12, itemId: null, productModelId: 3, quantity: 3, unitPrice: new Prisma.Decimal('1500') };
    const sale = { ...saleWith([line], []), returns: [{ saleItemId: 12, quantity: 1, refundAmount: new Prisma.Decimal('1500') }] };
    const { service } = build(sale);
    const dto: CreateReturnDto = { saleItemId: 12, quantity: 1, refundAmount: '1600', result: 'BACK_TO_STOCK' };
    await expect(service.create(1, dto, actor)).rejects.toThrow('refund cap');
  });

  it('a full device return BACK_TO_STOCK moves RETURNED → IN_STOCK and closes the sale (BR-9)', async () => {
    const { service, tx, changeStatus } = build(saleWith([deviceLine]));
    const dto: CreateReturnDto = { saleItemId: 10, refundAmount: '1500', result: 'BACK_TO_STOCK' };
    await service.create(1, dto, actor);
    expect(changeStatus).toHaveBeenNthCalledWith(1, expect.anything(), 7, ItemStatus.RETURNED);
    expect(changeStatus).toHaveBeenNthCalledWith(2, expect.anything(), 7, ItemStatus.IN_STOCK);
    expect(tx.sale.update).toHaveBeenCalledWith({ where: { id: 1 }, data: { status: SaleStatus.RETURNED } });
  });

  it('on debt close only the still-DEBT items go SOLD; a returned item is never re-sold', async () => {
    // Debt sale: item 7 (1000) + item 8 (500), 1000 already paid. Returning item 8 for 500 clears the balance.
    const debtSale = {
      status: SaleStatus.DEBT,
      total: new Prisma.Decimal('1500'),
      locationId: 1,
      payments: [{ amount: new Prisma.Decimal('1000') }],
      returns: [],
      items: [
        { id: 20, itemId: 7, productModelId: 3, quantity: 1, unitPrice: new Prisma.Decimal('1000') },
        { id: 21, itemId: 8, productModelId: 3, quantity: 1, unitPrice: new Prisma.Decimal('500') },
      ],
    };
    const { service, tx, changeStatus } = build(debtSale);
    // Only item 7 is still DEBT when the debt closes (item 8 is being returned → DEFECTIVE).
    (tx.item.findMany as jest.Mock).mockResolvedValue([{ id: 7 }]);
    const dto: CreateReturnDto = { saleItemId: 21, refundAmount: '500', result: 'DEFECTIVE' };
    await service.create(1, dto, actor);
    expect(tx.sale.update).toHaveBeenCalledWith({ where: { id: 1 }, data: { status: SaleStatus.PAID } });
    expect(changeStatus).toHaveBeenCalledWith(expect.anything(), 7, ItemStatus.SOLD);
    expect(changeStatus).not.toHaveBeenCalledWith(expect.anything(), 8, ItemStatus.SOLD);
  });
});
