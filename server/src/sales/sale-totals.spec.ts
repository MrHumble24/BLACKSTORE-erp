import { Prisma, SaleStatus } from '@prisma/client';
import {
  balanceOf,
  saleStatusAfterPayment,
  saleStatusAfterReturn,
  sumPaid,
  sumRefunded,
} from './sale-totals';

const dec = (v: string) => new Prisma.Decimal(v);

describe('sale-totals (BR-8)', () => {
  it('sums payments and refunds', () => {
    expect(sumPaid([{ amount: dec('100') }, { amount: dec('50.50') }]).toFixed(2)).toBe('150.50');
    expect(sumRefunded([{ refundAmount: dec('20') }]).toFixed(2)).toBe('20.00');
    expect(sumPaid([]).toFixed(2)).toBe('0.00');
  });

  it('balance = total − paid − refunded, never below 0', () => {
    expect(balanceOf(dec('100'), dec('30'), dec('20')).toFixed(2)).toBe('50.00');
    // Over-collection/refund can't drive the balance negative.
    expect(balanceOf(dec('100'), dec('80'), dec('40')).toFixed(2)).toBe('0.00');
  });

  it('status after a payment: PAID only at a zero balance', () => {
    expect(saleStatusAfterPayment(dec('0'))).toBe(SaleStatus.PAID);
    expect(saleStatusAfterPayment(dec('10'))).toBe(SaleStatus.DEBT);
  });

  it('status after a return follows the contract', () => {
    // Everything back and nothing owed → RETURNED.
    expect(saleStatusAfterReturn(true, dec('0'))).toBe(SaleStatus.RETURNED);
    // Balance cleared but not every unit returned → PAID.
    expect(saleStatusAfterReturn(false, dec('0'))).toBe(SaleStatus.PAID);
    // A fully returned DEBT sale with only a partial refund still owes money → stays DEBT.
    expect(saleStatusAfterReturn(true, dec('30'))).toBe(SaleStatus.DEBT);
  });
});
