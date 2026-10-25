import { ExpenseStatus, LedgerType, PaymentMethod, Prisma } from '@prisma/client';
import { computeExpected } from './business-day.reconcile';
import { canUndoConfirmation, saleMoney, splitSaleMoney } from './business-day.sale-gate';

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
        { amount: dec('300'), type: LedgerType.INCOME, inCash: true, status: ExpenseStatus.CONFIRMED }, // cash income raises expected cash
        { amount: dec('150'), type: LedgerType.EXPENSE, inCash: true, status: ExpenseStatus.CONFIRMED }, // cash expense reduces it
        { amount: dec('999'), type: LedgerType.EXPENSE, inCash: false, status: ExpenseStatus.CONFIRMED }, // bank expense excluded from cash
        { amount: dec('999'), type: LedgerType.INCOME, inCash: false, status: ExpenseStatus.CONFIRMED }, // bank income excluded from cash
      ],
      walkInPayouts: [],
      pendingWalkIn: [],
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
      walkInPayouts: [],
      pendingWalkIn: [],
    });
    expect(result.expectedCash.toFixed(2)).toBe('500.00');
  });

  it('a bank expense is excluded from expected cash', () => {
    const result = computeExpected({
      payments: [{ amount: dec('500'), method: PaymentMethod.CASH }],
      ledger: [{ amount: dec('200'), type: LedgerType.EXPENSE, inCash: false, status: ExpenseStatus.CONFIRMED }],
      returns: [],
      walkInPayouts: [],
      pendingWalkIn: [],
    });
    expect(result.expectedCash.toFixed(2)).toBe('500.00');
  });

  it('a PENDING or EXCLUDED cash expense does not reduce expected cash (F27)', () => {
    const result = computeExpected({
      payments: [{ amount: dec('500'), method: PaymentMethod.CASH }],
      ledger: [
        { amount: dec('200'), type: LedgerType.EXPENSE, inCash: true, status: ExpenseStatus.PENDING },
        { amount: dec('100'), type: LedgerType.EXPENSE, inCash: true, status: ExpenseStatus.EXCLUDED },
      ],
      returns: [],
      walkInPayouts: [],
      pendingWalkIn: [],
    });
    expect(result.expectedCash.toFixed(2)).toBe('500.00');
  });

  it('is zero across the board with no activity', () => {
    const result = computeExpected({ payments: [], ledger: [], returns: [], walkInPayouts: [], pendingWalkIn: [] });
    expect(result.expectedCash.toFixed(2)).toBe('0.00');
    expect(result.expectedCard.toFixed(2)).toBe('0.00');
  });

  it('confirmed walk-in payouts (incl. a buy-back) leave the drawer; the breakdown adds up to expectedCash (F30, F32)', () => {
    const result = computeExpected({
      payments: [{ amount: dec('1000'), method: PaymentMethod.CASH }],
      ledger: [
        { amount: dec('50'), type: LedgerType.INCOME, inCash: true, status: ExpenseStatus.CONFIRMED },
        { amount: dec('20'), type: LedgerType.EXPENSE, inCash: true, status: ExpenseStatus.CONFIRMED },
      ],
      returns: [{ cashRefund: dec('10') }],
      walkInPayouts: [
        { unitPrice: dec('150.00'), quantity: 1 }, // a new walk-in device, paid out today
        { unitPrice: dec('80.00'), quantity: 1 }, // a buy-back of a device we once sold, paid out today
      ],
      pendingWalkIn: [],
    });
    expect(result.walkInPurchases.toFixed(2)).toBe('230.00');
    // 1000 + 50 − 20 − 10 − 230 = 790
    expect(result.expectedCash.toFixed(2)).toBe('790.00');
    const rebuilt = result.paymentsCash
      .plus(result.cashIncome)
      .minus(result.cashExpense)
      .minus(result.cashRefunds)
      .minus(result.walkInPurchases);
    expect(rebuilt.toFixed(2)).toBe(result.expectedCash.toFixed(2));
  });

  it('an unconfirmed walk-in line never reduces expected cash; it shows in pendingWalkInPurchases (F32)', () => {
    const result = computeExpected({
      payments: [{ amount: dec('1000'), method: PaymentMethod.CASH }],
      ledger: [],
      returns: [],
      walkInPayouts: [{ unitPrice: dec('100'), quantity: 1 }], // confirmed in this window
      pendingWalkIn: [{ unitPrice: dec('150'), quantity: 2 }], // waiting, any day
    });
    expect(result.expectedCash.toFixed(2)).toBe('900.00');
    expect(result.walkInPurchases.toFixed(2)).toBe('100.00');
    expect(result.pendingWalkInPurchases.toFixed(2)).toBe('300.00');
  });
});

describe('sale confirmation gate (F33)', () => {
  const openedAt = new Date('2026-10-25T06:00:00Z');
  const closedAt = new Date('2026-10-25T20:00:00Z');
  const at = (hh: number) => new Date(`2026-10-25T${String(hh).padStart(2, '0')}:00:00Z`);
  const yesterday = new Date('2026-10-24T12:00:00Z');
  const u = { id: 1, name: 'Ali' };
  const saleItem = { productModel: null, item: null };
  const pay = (id: number, amount: string, createdAt: Date, confirmedAt: Date | null, method: PaymentMethod = PaymentMethod.CASH) =>
    ({ id, amount: dec(amount), method, saleId: 7, createdAt, receiver: u, sale: { confirmedAt } });
  const ret = (id: number, cashRefund: string, createdAt: Date, confirmedAt: Date | null) =>
    ({ id, saleId: 7, refundAmount: dec(cashRefund), cashRefund: dec(cashRefund), reason: null, createdAt, user: u, saleItem, sale: { confirmedAt } });
  // Drawer rows through the gate, then the drawer math.
  const expected = (payments: ReturnType<typeof pay>[], returns: ReturnType<typeof ret>[] = []) =>
    computeExpected({ ...splitSaleMoney({ payments, returns }, openedAt, closedAt), ledger: [], walkInPayouts: [] });

  it("an unconfirmed sale's payments are not in the drawer; saleMoney shows them as waiting money", () => {
    const p = pay(1, '1100', at(9), null);
    const card = pay(2, '200', at(9), null, PaymentMethod.CARD);
    const e = expected([p, card]);
    expect(e.paymentsCash.toFixed(2)).toBe('0.00');
    expect(e.expectedCash.toFixed(2)).toBe('0.00');
    expect(e.expectedCard.toFixed(2)).toBe('0.00');
    const pending = saleMoney([p, card], []);
    expect(pending.cash.toFixed(2)).toBe('1100.00');
    expect(pending.card.toFixed(2)).toBe('200.00');
  });

  it('a payment made before confirmation counts at confirmedAt (yesterday payment, confirmed today)', () => {
    expect(expected([pay(1, '1100', yesterday, at(10))]).paymentsCash.toFixed(2)).toBe('1100.00');
    // Confirmed after this window closed: it lands in the next day, not this one.
    expect(expected([pay(1, '1100', at(9), at(21))]).paymentsCash.toFixed(2)).toBe('0.00');
  });

  it('a payment after confirmation counts at its own time', () => {
    expect(expected([pay(1, '500', at(9), yesterday)]).paymentsCash.toFixed(2)).toBe('500.00');
    // Recorded yesterday on a sale confirmed yesterday: yesterday's money, not today's.
    expect(expected([pay(1, '500', yesterday, yesterday)]).paymentsCash.toFixed(2)).toBe('0.00');
  });

  it('a sale paid 1100 cash and fully refunded before confirmation contributes 0 to expected cash and to pending', () => {
    const p = pay(1, '1100', at(9), null);
    const r = ret(2, '1100', at(10), null);
    expect(expected([p], [r]).expectedCash.toFixed(2)).toBe('0.00');
    expect(saleMoney([p], [r]).cash.toFixed(2)).toBe('0.00');
    // Once confirmed, both rows land at confirmedAt and still net to zero.
    const done = expected([pay(1, '1100', at(9), at(11))], [ret(2, '1100', at(10), at(11))]);
    expect(done.expectedCash.toFixed(2)).toBe('0.00');
    expect(done.cashRefunds.toFixed(2)).toBe('1100.00');
  });

  it('the createdAt === confirmedAt tie counts as after confirmation (at its own time)', () => {
    expect(expected([pay(1, '300', at(9), at(9))]).paymentsCash.toFixed(2)).toBe('300.00');
    // A tie exactly at closedAt is outside the half-open window.
    expect(expected([pay(1, '300', closedAt, closedAt)]).paymentsCash.toFixed(2)).toBe('0.00');
  });

  it('canUndoConfirmation: only a confirmation inside the open day can be undone', () => {
    expect(canUndoConfirmation(at(9), openedAt)).toBe(true);
    expect(canUndoConfirmation(openedAt, openedAt)).toBe(true);
    expect(canUndoConfirmation(yesterday, openedAt)).toBe(false);
    expect(canUndoConfirmation(null, openedAt)).toBe(false);
    expect(canUndoConfirmation(at(9), null)).toBe(false);
  });
});
