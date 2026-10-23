import { ConsignmentItemStatus, ItemStatus, Prisma, SaleStatus, ShareType } from '@prisma/client';
import { AuditService } from '../audit/audit.service';
import { ItemsService } from '../items/items.service';
import { PrismaService } from '../prisma/prisma.service';
import { ConsignmentSellService } from './consignment-sell.service';

const d = (v: string) => new Prisma.Decimal(v);

// A device held at partner (location 1), owned by the business, min price 1200.
const device = {
  id: 100,
  status: ItemStatus.AT_PARTNER,
  locationId: 1,
  productModelId: 3,
  purchasePrice: d('1000'),
  extraCost: d('0'),
  minSalePrice: null,
  investorId: 9,
  investor: { id: 9, name: 'Own', code: 'OWN', shareType: ShareType.NONE, shareValue: d('0') },
};

const detailRow = {
  id: 1,
  date: new Date('2026-01-10'),
  dueDate: null,
  note: null,
  partner: { id: 3, name: 'Bozor' },
  handedBy: { id: 2, name: 'Staff' },
  items: [],
};

/** A transaction client whose consignment item is AT_PARTNER unless overridden. */
function makeTx(status: ConsignmentItemStatus = ConsignmentItemStatus.AT_PARTNER) {
  return {
    consignmentItem: {
      findFirst: jest.fn().mockResolvedValue({
        status,
        minPrice: d('1200'),
        consignment: { partnerId: 3 },
        item: { id: 100, locationId: 1 },
      }),
      update: jest.fn().mockResolvedValue({}),
    },
    item: { findUnique: jest.fn().mockResolvedValue(device) },
    sale: { create: jest.fn().mockResolvedValue({ id: 50 }) },
    saleItem: { create: jest.fn().mockResolvedValue({ id: 60 }) },
    salePayment: { create: jest.fn().mockResolvedValue({}) },
    consignment: { findUniqueOrThrow: jest.fn().mockResolvedValue(detailRow) },
  };
}

function makeService(tx: ReturnType<typeof makeTx>) {
  const changeStatus = jest.fn().mockResolvedValue(undefined);
  const prisma = { $transaction: (cb: (t: unknown) => unknown) => cb(tx) } as unknown as PrismaService;
  const items = { changeStatus } as unknown as ItemsService;
  const audit = { log: jest.fn().mockResolvedValue(undefined) } as unknown as AuditService;
  return { service: new ConsignmentSellService(prisma, audit, items), changeStatus };
}

describe('ConsignmentSellService.sell', () => {
  it('sells at the item minPrice: the sale total and line price both equal minPrice', async () => {
    const tx = makeTx();
    const { service } = makeService(tx);
    await service.sell(1, 5, { paid: true }, 2);
    const saleArg = tx.sale.create.mock.calls[0][0] as { data: { total: Prisma.Decimal } };
    const lineArg = tx.saleItem.create.mock.calls[0][0] as { data: { unitPrice: Prisma.Decimal; unitCost: Prisma.Decimal } };
    expect(saleArg.data.total.toString()).toBe('1200');
    expect(lineArg.data.unitPrice.toString()).toBe('1200');
    expect(lineArg.data.unitCost.toString()).toBe('1000'); // BR-7 snapshot, as a normal sale
  });

  it('paid → PAID sale, full payment, item SOLD, consignment item SOLD', async () => {
    const tx = makeTx();
    const { service, changeStatus } = makeService(tx);
    await service.sell(1, 5, { paid: true }, 2);
    const saleArg = tx.sale.create.mock.calls[0][0] as { data: { status: SaleStatus; partnerId: number } };
    expect(saleArg.data.status).toBe(SaleStatus.PAID);
    expect(saleArg.data.partnerId).toBe(3);
    expect(tx.salePayment.create).toHaveBeenCalledTimes(1);
    expect(changeStatus).toHaveBeenCalledWith(tx, 100, ItemStatus.SOLD);
    expect(tx.consignmentItem.update.mock.calls[0][0]).toMatchObject({
      data: { status: ConsignmentItemStatus.SOLD, saleItemId: 60 },
    });
  });

  it('unpaid → DEBT sale, no payment, item DEBT', async () => {
    const tx = makeTx();
    const { service, changeStatus } = makeService(tx);
    await service.sell(1, 5, { paid: false }, 2);
    const saleArg = tx.sale.create.mock.calls[0][0] as { data: { status: SaleStatus } };
    expect(saleArg.data.status).toBe(SaleStatus.DEBT);
    expect(tx.salePayment.create).not.toHaveBeenCalled();
    expect(changeStatus).toHaveBeenCalledWith(tx, 100, ItemStatus.DEBT);
  });

  it('rejects selling an item that is not AT_PARTNER', async () => {
    const tx = makeTx(ConsignmentItemStatus.SOLD);
    const { service } = makeService(tx);
    await expect(service.sell(1, 5, { paid: true }, 2)).rejects.toThrow('AT_PARTNER');
  });
});
