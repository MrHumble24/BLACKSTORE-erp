import { BadRequestException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { PartnerTransactionsService } from './partner-transactions.service';

const d = (v: string) => new Prisma.Decimal(v);
const partner = { id: 1, name: 'Bozor' };
const ali = { id: 7, name: 'Ali' };
const at = (h: number) => new Date(`2026-10-25T${String(h).padStart(2, '0')}:00:00.000Z`);
const phone = { productModel: { name: 'iPhone 15' }, identifiers: [{ value: 'IMEI1' }] };

/** Mocked Prisma returning one row of each kind; consignmentItem.findMany answers sold first, then returned. */
function makeService() {
  const prisma = {
    consignment: {
      findMany: jest.fn().mockResolvedValue([
        { id: 3, date: at(9), partner, handedBy: ali, items: [{ minPrice: d('100') }, { minPrice: d('50.5') }] },
      ]),
    },
    consignmentItem: {
      findMany: jest
        .fn()
        .mockResolvedValueOnce([
          {
            id: 11,
            minPrice: d('100'),
            soldAt: at(12),
            consignment: { id: 3, partner },
            item: phone,
            saleItem: { unitPrice: d('120'), sale: { id: 40, seller: ali } },
          },
        ])
        .mockResolvedValueOnce([
          { id: 12, minPrice: d('50.5'), returnedAt: at(11), consignment: { id: 3, partner }, item: { productModel: null, identifiers: [] } },
        ]),
    },
    salePayment: {
      findMany: jest.fn().mockResolvedValue([
        { id: 5, amount: d('70'), method: 'CASH', date: at(13), receiver: ali, sale: { id: 40, partner } },
      ]),
    },
    return: {
      findMany: jest.fn().mockResolvedValue([
        {
          id: 6,
          refundAmount: d('20'),
          date: at(10),
          user: ali,
          sale: { id: 40, partner },
          saleItem: { productModel: null, item: { identifiers: [{ value: 'IMEI9' }] } },
        },
      ]),
    },
  } as unknown as PrismaService;
  return new PartnerTransactionsService(prisma);
}

const range = { from: '2026-10-25T00:00:00.000Z', to: '2026-10-25T23:59:59.999Z' };

describe('PartnerTransactionsService', () => {
  it('maps the five kinds to the contract shape, newest first', async () => {
    const page = await makeService().findAll({ ...range, page: 1, pageSize: 20 });

    expect(page.items.map((t) => t.id)).toEqual(['PAYMENT:5', 'SOLD:11', 'RETURNED:12', 'REFUND:6', 'HANDOVER:3']);
    const byKind = Object.fromEntries(page.items.map((t) => [t.kind, t]));
    expect(byKind.HANDOVER).toMatchObject({ amount: '150.50', count: 2, user: ali, item: null, consignmentId: 3, saleId: null });
    expect(byKind.SOLD).toMatchObject({ amount: '120.00', item: 'iPhone 15', user: ali, saleId: 40, consignmentId: 3 }); // unitPrice, not minPrice
    expect(byKind.RETURNED).toMatchObject({ amount: '50.50', item: 'Device', user: null, consignmentId: 3 });
    expect(byKind.PAYMENT).toMatchObject({ amount: '70.00', method: 'CASH', saleId: 40, item: null, consignmentId: null });
    expect(byKind.REFUND).toMatchObject({ amount: '20.00', item: 'IMEI9', user: ali, saleId: 40, method: null });
    expect(byKind.PAYMENT.date).toBe(at(13).toISOString());
    expect(byKind.PAYMENT.partner).toEqual(partner);
  });

  it('computes totals over the whole range, not just the page', async () => {
    const page = await makeService().findAll({ ...range, page: 2, pageSize: 2 });

    expect(page.items.map((t) => t.id)).toEqual(['RETURNED:12', 'REFUND:6']);
    expect(page.total).toBe(5);
    expect(page.totals).toEqual({ handedOver: '150.50', sold: '120.00', returned: '50.50', paid: '70.00', refunded: '20.00' });
  });

  it('rejects from > to and invalid dates with 400', async () => {
    const service = makeService();
    await expect(service.findAll({ from: range.to, to: range.from, page: 1, pageSize: 20 })).rejects.toBeInstanceOf(BadRequestException);
    await expect(service.findAll({ from: 'nope', to: range.to, page: 1, pageSize: 20 })).rejects.toBeInstanceOf(BadRequestException);
  });

  it('rejects a range longer than 366 days with 400', async () => {
    const query = { from: '2025-01-01T00:00:00.000Z', to: '2026-01-03T00:00:00.000Z', page: 1, pageSize: 20 };
    await expect(makeService().findAll(query)).rejects.toThrow(new BadRequestException('Range too long'));
  });
});
