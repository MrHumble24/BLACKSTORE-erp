import { ExpenseStatus, LedgerType, PaymentMethod, Prisma } from '@prisma/client';
import { lineTotal } from '../common/money';

/** Pure drawer math for the daily close (F13), over rows already loaded by the window query. */

export interface ReconcileInput {
  payments: { amount: Prisma.Decimal; method: PaymentMethod }[];
  ledger: { amount: Prisma.Decimal; type: LedgerType; inCash: boolean; status: ExpenseStatus }[];
  returns: { cashRefund: Prisma.Decimal }[];
  walkInPayouts: { unitPrice: Prisma.Decimal; quantity: number }[]; // walk-in payouts confirmed in the window (W5, F32)
  pendingWalkIn?: { unitPrice: Prisma.Decimal; quantity: number }[]; // unconfirmed walk-in lines: shown, never subtracted; close() omits it
}

export interface Expected {
  expectedCash: Prisma.Decimal;
  expectedCard: Prisma.Decimal;
  paymentsCash: Prisma.Decimal;
  paymentsCard: Prisma.Decimal;
  cashIncome: Prisma.Decimal;
  cashExpense: Prisma.Decimal;
  cashRefunds: Prisma.Decimal;
  walkInPurchases: Prisma.Decimal;
  pendingWalkInPurchases: Prisma.Decimal;
}

/**
 * Payments and cash refunds arrive already gated by sale confirmation (F33): only rows whose effective time
 * max(createdAt, sale.confirmedAt) is in the window. Unconfirmed sales' money is summed in the database
 * (loadPendingSales) for display only and never enters this math.
 * expectedCash = Σ cash payments + Σ cash income − Σ confirmed cash expenses − Σ cash refunds
 *                − Σ walk-in payouts confirmed in the window (unitPrice × quantity, keyed on paidAt; W5, F32).
 * Unconfirmed walk-in lines are summed into pendingWalkInPurchases for display only, like F27's pending expenses.
 * expectedCard = Σ card payments (no card-refund path in v1). Bank/card ledger rows are excluded from cash.
 */
export function computeExpected(input: ReconcileInput): Expected {
  const paymentsCash = sumIf(input.payments, (p) => p.method === PaymentMethod.CASH, (p) => p.amount);
  const paymentsCard = sumIf(input.payments, (p) => p.method === PaymentMethod.CARD, (p) => p.amount);
  const cashIncome = sumIf(input.ledger, (l) => l.inCash && l.type === LedgerType.INCOME, (l) => l.amount);
  // Only CONFIRMED expenses are expected gone from the drawer; undecided money is not (F27).
  const cashExpense = sumIf(
    input.ledger,
    (l) => l.inCash && l.type === LedgerType.EXPENSE && l.status === ExpenseStatus.CONFIRMED,
    (l) => l.amount,
  );
  const cashRefunds = sumIf(input.returns, () => true, (r) => r.cashRefund);
  const walkInPurchases = sumIf(input.walkInPayouts, () => true, lineTotal);
  const pendingWalkInPurchases = sumIf(input.pendingWalkIn ?? [], () => true, lineTotal);
  return {
    expectedCash: paymentsCash.plus(cashIncome).minus(cashExpense).minus(cashRefunds).minus(walkInPurchases),
    expectedCard: paymentsCard,
    paymentsCash,
    paymentsCard,
    cashIncome,
    cashExpense,
    cashRefunds,
    walkInPurchases,
    pendingWalkInPurchases,
  };
}

/** Σ value(row) over rows matching keep; zero when none match. */
function sumIf<T>(rows: T[], keep: (r: T) => boolean, value: (r: T) => Prisma.Decimal): Prisma.Decimal {
  return rows.reduce((s, r) => (keep(r) ? s.plus(value(r)) : s), new Prisma.Decimal(0));
}
