import { LedgerType, PaymentMethod, Prisma } from '@prisma/client';

/** Pure drawer math for the daily close (F13), over rows already loaded by the window query. */

export interface ReconcileInput {
  payments: { amount: Prisma.Decimal; method: PaymentMethod }[];
  ledger: { amount: Prisma.Decimal; type: LedgerType; inCash: boolean }[];
  returns: { cashRefund: Prisma.Decimal }[];
}

export interface Expected {
  expectedCash: Prisma.Decimal;
  expectedCard: Prisma.Decimal;
  paymentsCash: Prisma.Decimal;
  paymentsCard: Prisma.Decimal;
}

/**
 * expectedCash = Σ cash payments + Σ cash income − Σ cash expenses − Σ cash refunds.
 * expectedCard = Σ card payments (no card-refund path in v1). Bank/card ledger rows are excluded from cash.
 */
export function computeExpected(input: ReconcileInput): Expected {
  const paymentsCash = sumIf(input.payments, (p) => p.method === PaymentMethod.CASH, (p) => p.amount);
  const paymentsCard = sumIf(input.payments, (p) => p.method === PaymentMethod.CARD, (p) => p.amount);
  const cashIncome = sumIf(input.ledger, (l) => l.inCash && l.type === LedgerType.INCOME, (l) => l.amount);
  const cashExpense = sumIf(input.ledger, (l) => l.inCash && l.type === LedgerType.EXPENSE, (l) => l.amount);
  const cashRefunds = input.returns.reduce((s, r) => s.plus(r.cashRefund), new Prisma.Decimal(0));
  return {
    expectedCash: paymentsCash.plus(cashIncome).minus(cashExpense).minus(cashRefunds),
    expectedCard: paymentsCard,
    paymentsCash,
    paymentsCard,
  };
}

/** Σ value(row) over rows matching keep; zero when none match. */
function sumIf<T>(rows: T[], keep: (r: T) => boolean, value: (r: T) => Prisma.Decimal): Prisma.Decimal {
  return rows.reduce((s, r) => (keep(r) ? s.plus(value(r)) : s), new Prisma.Decimal(0));
}
