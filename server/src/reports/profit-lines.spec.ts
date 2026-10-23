import { Prisma, ReturnResult, SaleStatus, ShareType } from '@prisma/client';
import { buildLinesForSale, ProfitLine, ReportSaleRow, sumLines } from './profit-lines';

const d = (v: string | number) => new Prisma.Decimal(v);
const LOCATION = { id: 1, name: 'Shop' };
const CATEGORY = { id: 2, name: 'iPhone' };

type ItemOpts = {
  id?: number;
  quantity?: number;
  unitPrice?: string;
  unitCost?: string;
  shareType?: ShareType;
  shareValue?: string;
  investor?: { id: number; name: string; isOwn: boolean | null } | null;
  isDevice?: boolean;
};

/** One sale item in report-select shape; defaults to an OWN device, price 1500, cost 1000. */
function item(o: ItemOpts = {}) {
  return {
    id: o.id ?? 10,
    quantity: o.quantity ?? 1,
    unitPrice: d(o.unitPrice ?? '1500'),
    unitCost: d(o.unitCost ?? '1000'),
    shareType: o.shareType ?? ShareType.NONE,
    shareValue: d(o.shareValue ?? '0'),
    investor: o.investor === undefined ? { id: 9, name: 'Own', isOwn: true } : o.investor,
    item: (o.isDevice ?? true) ? { id: 100, identifiers: [{ type: 'SYSTEM_CODE' as const, value: 'C1' }] } : null,
    productModel: { id: 3, name: 'iPhone 15', category: CATEGORY },
  };
}

type SaleOpts = {
  status?: SaleStatus;
  total?: string;
  payments?: { amount: string; date: Date }[];
  createdAt?: Date;
  items?: ReturnType<typeof item>[];
  returns?: { id: number; saleItemId: number; quantity: number; refundAmount: string; result: ReturnResult; date: Date }[];
};

function sale(o: SaleOpts = {}): ReportSaleRow {
  return {
    id: 1,
    status: o.status ?? SaleStatus.PAID,
    createdAt: o.createdAt ?? new Date('2026-01-10'),
    total: d(o.total ?? '1500'),
    location: LOCATION,
    payments: (o.payments ?? [{ amount: '1500', date: new Date('2026-01-10') }]).map((p) => ({
      amount: d(p.amount),
      date: p.date,
    })),
    items: o.items ?? [item()],
    returns: (o.returns ?? []).map((r) => ({
      id: r.id,
      saleItemId: r.saleItemId,
      quantity: r.quantity,
      refundAmount: d(r.refundAmount),
      result: r.result,
      date: r.date,
    })),
  } as unknown as ReportSaleRow;
}

function pick(lines: ProfitLine[], kind: 'SALE' | 'RETURN'): ProfitLine {
  const line = lines.find((l) => l.kind === kind);
  if (!line) throw new Error(`no ${kind} line`);
  return line;
}
const saleLine = (lines: ProfitLine[]) => pick(lines, 'SALE');
const returnLine = (lines: ProfitLine[]) => pick(lines, 'RETURN');

describe('buildLinesForSale', () => {
  describe('SALE lines (BR-1, BR-2)', () => {
    it('own investor: profit = sale − cost, investor share 0, business keeps it all', () => {
      const [line] = buildLinesForSale(sale());
      expect(line.salePrice.toString()).toBe('1500');
      expect(line.cost.toString()).toBe('1000');
      expect(line.profit.toString()).toBe('500');
      expect(line.investorShare.toString()).toBe('0');
      expect(line.businessShare.toString()).toBe('500');
    });

    it('BR-3 PERCENT: investor gets profit × share%', () => {
      const line = saleLine(
        buildLinesForSale(
          sale({ items: [item({ shareType: ShareType.PERCENT, shareValue: '30', investor: { id: 5, name: 'Sardor', isOwn: null } })] }),
        ),
      );
      expect(line.investorShare.toString()).toBe('150'); // 500 × 30%
      expect(line.businessShare.toString()).toBe('350');
    });

    it('NONE investor type: investor gets all the profit, business 0 (client-confirmed)', () => {
      const line = saleLine(
        buildLinesForSale(sale({ items: [item({ shareType: ShareType.NONE, investor: { id: 5, name: 'R', isOwn: null } })] })),
      );
      expect(line.investorShare.toString()).toBe('500');
      expect(line.businessShare.toString()).toBe('0');
    });

    it('BR-4 FIXED_PER_ITEM: business keeps the fixed amount per item', () => {
      const line = saleLine(
        buildLinesForSale(
          sale({ items: [item({ quantity: 1, shareType: ShareType.FIXED_PER_ITEM, shareValue: '100', investor: { id: 5, name: 'R', isOwn: null } })] }),
        ),
      );
      expect(line.investorShare.toString()).toBe('400'); // 500 − 100
      expect(line.businessShare.toString()).toBe('100');
    });

    it('BR-4 literal: investor share goes negative when profit < the fixed amount', () => {
      const line = saleLine(
        buildLinesForSale(
          sale({
            total: '1050',
            payments: [{ amount: '1050', date: new Date('2026-01-10') }],
            items: [item({ unitPrice: '1050', unitCost: '1000', shareType: ShareType.FIXED_PER_ITEM, shareValue: '100', investor: { id: 5, name: 'R', isOwn: null } })],
          }),
        ),
      );
      expect(line.profit.toString()).toBe('50');
      expect(line.investorShare.toString()).toBe('-50'); // 50 − 100
      expect(line.businessShare.toString()).toBe('100');
    });

    it('accessory line (null investor) is counted in the business row', () => {
      const line = saleLine(
        buildLinesForSale(sale({ items: [item({ investor: null, isDevice: false, unitPrice: '20', unitCost: '10', quantity: 2 })] })),
      );
      expect(line.investor).toBeNull();
      expect(line.item).toBeNull();
      expect(line.profit.toString()).toBe('20'); // (20−10)×2
      expect(line.investorShare.toString()).toBe('0');
      expect(line.businessShare.toString()).toBe('20');
    });

    it('profitDate is the last payment date, or the sale date when there are no payments', () => {
      const paid = saleLine(buildLinesForSale(sale({ payments: [{ amount: '1500', date: new Date('2026-02-20') }] })));
      expect(paid.profitDate.toISOString()).toBe(new Date('2026-02-20').toISOString());
    });
  });

  describe('RETURN lines (FR-23)', () => {
    const paidSale = (result: ReturnResult) =>
      sale({
        status: SaleStatus.RETURNED,
        returns: [{ id: 7, saleItemId: 10, quantity: 1, refundAmount: '1500', result, date: new Date('2026-02-05') }],
      });

    it('BACK_TO_STOCK gives the cost back; the refund is the loss', () => {
      const line = returnLine(buildLinesForSale(paidSale(ReturnResult.BACK_TO_STOCK)));
      expect(line.refunded.toString()).toBe('1500');
      expect(line.cost.toString()).toBe('-1000'); // cost comes back
      expect(line.profit.toString()).toBe('-500'); // −1500 − (−1000)
      expect(line.profitDate.toISOString()).toBe(new Date('2026-02-05').toISOString());
    });

    it('DEFECTIVE does not give the cost back', () => {
      const line = returnLine(buildLinesForSale(paidSale(ReturnResult.DEFECTIVE)));
      expect(line.cost.toString()).toBe('0');
      expect(line.profit.toString()).toBe('-1500'); // −1500 − 0
    });

    it('FIXED_PER_ITEM is not taken twice: a RETURN line gives the investor the whole reversed profit', () => {
      const lines = buildLinesForSale(
        sale({
          status: SaleStatus.RETURNED,
          items: [item({ shareType: ShareType.FIXED_PER_ITEM, shareValue: '100', investor: { id: 5, name: 'R', isOwn: null } })],
          returns: [{ id: 7, saleItemId: 10, quantity: 1, refundAmount: '1500', result: ReturnResult.BACK_TO_STOCK, date: new Date('2026-02-05') }],
        }),
      );
      const ret = returnLine(lines);
      expect(ret.investorShare.toString()).toBe('-500'); // = profit, fixed not re-applied
      expect(ret.businessShare.toString()).toBe('0');
    });
  });

  describe('BR-6 gate (status only)', () => {
    it('a DEBT sale emits no line', () => {
      expect(buildLinesForSale(sale({ status: SaleStatus.DEBT, payments: [] }))).toEqual([]);
    });

    it('a partly paid debt cleared by a refund (RETURNED) counts: SALE + RETURN net to the money kept', () => {
      const lines = buildLinesForSale(
        sale({
          status: SaleStatus.RETURNED,
          total: '1500',
          payments: [{ amount: '600', date: new Date('2026-01-10') }],
          // RETURNED needs paid + refunded = total, so the refund writes off the other 900
          returns: [{ id: 7, saleItemId: 10, quantity: 1, refundAmount: '900', result: ReturnResult.BACK_TO_STOCK, date: new Date('2026-02-05') }],
        }),
      );
      expect(lines).toHaveLength(2);
      // SALE +500 (1500 − 1000), RETURN −900 + 1000 cost back = +100; net 600 = the cash kept, item back in stock
      expect(sumLines(lines).profit.toString()).toBe('600');
    });
  });

  it('a PAID-then-returned sale emits a SALE and a RETURN line that net to zero', () => {
    const lines = buildLinesForSale(
      sale({
        status: SaleStatus.RETURNED,
        returns: [{ id: 7, saleItemId: 10, quantity: 1, refundAmount: '1500', result: ReturnResult.BACK_TO_STOCK, date: new Date('2026-02-05') }],
      }),
    );
    const totals = sumLines(lines);
    expect(totals.profit.toString()).toBe('0');
    expect(totals.investorShare.toString()).toBe('0');
    expect(totals.businessShare.toString()).toBe('0');
    // the SALE line is dated in January, the RETURN line in February
    expect(saleLine(lines).profitDate.getMonth()).toBe(0);
    expect(returnLine(lines).profitDate.getMonth()).toBe(1);
  });
});
