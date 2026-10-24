import { Prisma } from '@prisma/client';
import type { ProfitLine } from '../reports/profit-lines';
import { buildAccount, cashLines, goodsLines, paymentLines, shareLines } from './investor-account-lines';

const D = (v: string) => new Prisma.Decimal(v);
const day = (d: number) => new Date(Date.UTC(2026, 9, d));
const sardor = { id: 7, name: 'Sardor' };

/** A profit line with only the fields the account reads. */
const profit = (over: Partial<ProfitLine>): ProfitLine =>
  ({
    kind: 'SALE', saleId: 30, saleItemId: 31, returnId: null, profitDate: day(5),
    productModel: 'iPhone 15', investor: { id: 4, name: 'Sardor' }, investorShare: D('140'), ...over,
  }) as ProfitLine;

describe('investor account lines (F26)', () => {
  it('GOODS: + Σ unitPrice × quantity per batch, count = Σ quantity', () => {
    const [line] = goodsLines([
      { id: 2, arrivalDate: day(1), lines: [{ unitPrice: D('1000'), quantity: 2 }, { unitPrice: D('5'), quantity: 10 }] },
    ]);
    expect(line).toMatchObject({ kind: 'GOODS', params: { count: 12 }, ref: { kind: 'batch', id: 2 } });
    expect(line.amount.toFixed(2)).toBe('2050.00');
  });

  it('SENT: − amount; FEE: − fee only when the investor bears a non-zero fee', () => {
    const lines = paymentLines(sardor, [
      { id: 1, date: day(2), amount: D('1500'), fee: D('20'), feePaidBy: 'BUSINESS', investorId: null },
      { id: 2, date: day(3), amount: D('1000'), fee: D('50'), feePaidBy: 'INVESTOR', investorId: null },
      { id: 3, date: day(4), amount: D('100'), fee: D('0'), feePaidBy: 'INVESTOR', investorId: null },
    ], 4);
    expect(lines.map((l) => [l.kind, l.amount.toFixed(2)])).toEqual([
      ['SENT', '-1500.00'], ['SENT', '-1000.00'], ['FEE', '-50.00'], ['SENT', '-100.00'],
    ]);
    expect(lines[0]).toMatchObject({ params: { supplierName: 'Sardor' }, ref: { kind: 'supplier', id: 7 } });
  });

  it("FEE: a payment to S with another investor Q's money adds no FEE line to P's account", () => {
    const lines = paymentLines(sardor, [
      { id: 1, date: day(2), amount: D('1000'), fee: D('50'), feePaidBy: 'INVESTOR', investorId: 9 },
      { id: 2, date: day(3), amount: D('1000'), fee: D('30'), feePaidBy: 'INVESTOR', investorId: 4 },
    ], 4);
    expect(lines.map((l) => [l.kind, l.amount.toFixed(2)])).toEqual([
      ['SENT', '-1000.00'], ['SENT', '-1000.00'], ['FEE', '-30.00'],
    ]);
  });

  it('SHARE / RETURN: the investor share of their own sale lines only, signs kept', () => {
    const lines = shareLines(
      [
        profit({}),
        profit({ kind: 'RETURN', returnId: 8, investorShare: D('-140'), profitDate: day(6) }),
        profit({ investor: { id: 9, name: 'Other' } }),
        profit({ investor: null }),
      ],
      4,
    );
    expect(lines.map((l) => [l.kind, l.amount.toFixed(2)])).toEqual([['SHARE', '140.00'], ['RETURN', '-140.00']]);
    expect(lines[0]).toMatchObject({ params: { model: 'iPhone 15' }, ref: { kind: 'sale', id: 30 }, date: day(5) });
  });

  it('CASH_IN: + deposit; CASH_OUT: − payout', () => {
    const lines = cashLines([
      { id: 1, date: day(1), type: 'DEPOSIT', amount: D('300') },
      { id: 2, date: day(2), type: 'PAYOUT', amount: D('100') },
    ]);
    expect(lines.map((l) => [l.kind, l.amount.toFixed(2)])).toEqual([['CASH_IN', '300.00'], ['CASH_OUT', '-100.00']]);
    expect(lines[0].ref).toEqual({ kind: 'transaction', id: 1 });
  });

  it('owedToInvestor follows the formula on the handoff walkthrough (2000 + 140 − 1500 − 1000 − 50 = −410)', () => {
    const lines = [
      ...goodsLines([{ id: 1, arrivalDate: day(1), lines: [{ unitPrice: D('1000'), quantity: 2 }] }]),
      ...shareLines([profit({})], 4),
      ...paymentLines(sardor, [
        { id: 1, date: day(6), amount: D('1500'), fee: D('0'), feePaidBy: 'BUSINESS', investorId: null },
        { id: 2, date: day(7), amount: D('1000'), fee: D('50'), feePaidBy: 'INVESTOR', investorId: null },
      ], 4),
      ...cashLines([
        { id: 1, date: day(8), type: 'DEPOSIT', amount: D('500') },
        { id: 2, date: day(9), type: 'PAYOUT', amount: D('500') },
      ]),
    ];
    expect(buildAccount(lines, 1, 20).owedToInvestor).toBe('-410.00');
  });

  it('sorts newest first (id desc on ties), totals all lines, pages the rest', () => {
    const lines = cashLines([
      { id: 1, date: day(1), type: 'DEPOSIT', amount: D('1') },
      { id: 2, date: day(3), type: 'DEPOSIT', amount: D('2') },
      { id: 3, date: day(3), type: 'DEPOSIT', amount: D('3') },
    ]);
    const first = buildAccount(lines, 1, 2);
    expect(first.lines.map((l) => l.amount)).toEqual(['3.00', '2.00']);
    expect(first).toMatchObject({ owedToInvestor: '6.00', total: 3, page: 1, pageSize: 2 });
    expect(first.lines[0]).toMatchObject({ id: 'CASH_IN-3', date: day(3).toISOString() });
    expect(buildAccount(lines, 2, 2).lines.map((l) => l.amount)).toEqual(['1.00']);
  });

  it('goods only → the full goods value is owed', () => {
    const goods = goodsLines([{ id: 1, arrivalDate: day(1), lines: [{ unitPrice: D('1000'), quantity: 2 }] }]);
    expect(buildAccount(goods, 1, 20).owedToInvestor).toBe('2000.00');
  });

  it('paid in advance, goods not yet arrived → negative (the investor owes the shop)', () => {
    const sent = paymentLines(
      sardor,
      [{ id: 1, date: day(1), amount: D('3000'), fee: D('0'), feePaidBy: 'BUSINESS', investorId: null }],
      4,
    );
    expect(buildAccount(sent, 1, 20).owedToInvestor).toBe('-3000.00');
  });
});
