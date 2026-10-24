import { Prisma, SaleStatus } from '@prisma/client';

/** Pure money helpers over already-loaded rows, so no mapper or service runs extra queries. */

/** Σ of every payment amount on a sale. */
export function sumPaid(payments: { amount: Prisma.Decimal }[]): Prisma.Decimal {
  return payments.reduce((sum, p) => sum.plus(p.amount), new Prisma.Decimal(0));
}

/** Σ of every refund made against a sale. */
export function sumRefunded(returns: { refundAmount: Prisma.Decimal }[]): Prisma.Decimal {
  return returns.reduce((sum, r) => sum.plus(r.refundAmount), new Prisma.Decimal(0));
}

/** balance = total − paid − refunded, never below 0 (BR-8). */
export function balanceOf(
  total: Prisma.Decimal,
  paid: Prisma.Decimal,
  refunded: Prisma.Decimal,
): Prisma.Decimal {
  const balance = total.minus(paid).minus(refunded);
  return balance.isNegative() ? new Prisma.Decimal(0) : balance;
}

/** Select shape for computing a DEBT sale's outstanding balance (BR-8), loaded in one query. */
export const debtSaleSelect = {
  total: true,
  payments: { select: { amount: true } },
  returns: { select: { refundAmount: true } },
} satisfies Prisma.SaleSelect;

/** Per-sale outstanding balance from a `debtSaleSelect` row: balanceOf(total, paid, refunded). */
export function debtBalanceOf(sale: {
  total: Prisma.Decimal;
  payments: { amount: Prisma.Decimal }[];
  returns: { refundAmount: Prisma.Decimal }[];
}): Prisma.Decimal {
  return balanceOf(sale.total, sumPaid(sale.payments), sumRefunded(sale.returns));
}

/**
 * Sale status once a payment lands: PAID when the balance reaches 0, otherwise it
 * stays a DEBT sale.
 */
export function saleStatusAfterPayment(balance: Prisma.Decimal): SaleStatus {
  return balance.isZero() ? SaleStatus.PAID : SaleStatus.DEBT;
}

/**
 * Sale status once a return is recorded (contract): RETURNED only when every sold
 * quantity is back and nothing is owed; PAID when the balance is 0; otherwise the
 * sale stays DEBT so the remaining debt never silently disappears.
 */
export function saleStatusAfterReturn(allReturned: boolean, balance: Prisma.Decimal): SaleStatus {
  if (allReturned && balance.isZero()) return SaleStatus.RETURNED;
  if (balance.isZero()) return SaleStatus.PAID;
  return SaleStatus.DEBT;
}
