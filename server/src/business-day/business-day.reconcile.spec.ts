import { LedgerType, PaymentMethod, Prisma } from '@prisma/client';
import { computeExpected } from './business-day.reconcile';

const dec = (v: string) => new Prisma.Decimal(v);

describe('computeExpected (F13 drawer math)', () => {
  it('cash = cash payments + cash income − cash expenses − cash refunds; card = card payments', () => {
    const result = computeExpected({
      payments: [
        { amount: dec('1000'), method: PaymentMethod.CASH },
        { amount: dec('500'), method: PaymentMethod.CARD },
        { amount: dec('200'), method: PaymentMethod.CASH },
      ],
      ledger: [
        { amount: dec('300'), type: LedgerType.INCOME, inCash: true }, // cash income raises expected cash
        { amount: dec('150'), type: LedgerType.EXPENSE, inCash: true }, // cash expense reduces it
        { amount: dec('999'), type: LedgerType.EXPENSE, inCash: false }, // bank expense excluded from cash
        { amount: dec('999'), type: LedgerType.INCOME, inCash: false }, // bank income excluded from cash
      ],
      returns: [{ cashRefund: dec('100') }], // only the cash portion of refunds leaves the drawer
    });
    // 1200 cash payments + 300 income − 150 expense − 100 refund = 1250
    expect(result.expectedCash.toFixed(2)).toBe('1250.00');
    expect(result.expectedCard.toFixed(2)).toBe('500.00');
    expect(result.paymentsCash.toFixed(2)).toBe('1200.00');
    expect(result.paymentsCard.toFixed(2)).toBe('500.00');
  });

  it('a debt-cancel return (cashRefund 0) does not reduce expected cash', () => {
    const result = computeExpected({
      payments: [{ amount: dec('500'), method: PaymentMethod.CASH }],
      ledger: [],
      returns: [{ cashRefund: dec('0') }],
    });
    expect(result.expectedCash.toFixed(2)).toBe('500.00');
  });

  it('a bank expense is excluded from expected cash', () => {
    const result = computeExpected({
      payments: [{ amount: dec('500'), method: PaymentMethod.CASH }],
      ledger: [{ amount: dec('200'), type: LedgerType.EXPENSE, inCash: false }],
      returns: [],
    });
    expect(result.expectedCash.toFixed(2)).toBe('500.00');
  });

  it('is zero across the board with no activity', () => {
    const result = computeExpected({ payments: [], ledger: [], returns: [] });
    expect(result.expectedCash.toFixed(2)).toBe('0.00');
    expect(result.expectedCard.toFixed(2)).toBe('0.00');
  });
});
