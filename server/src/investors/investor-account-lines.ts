import { FeePayer, InvestorTxType, Prisma } from '@prisma/client';
import type { ProfitLine } from '../reports/profit-lines';

/**
 * Pure builders for the investor account (F26): every money event between the shop and a linked
 * investor becomes one line whose signed amount is its effect on `owedToInvestor`
 * (+ the shop owes more, − the shop owes less). Balance is the sum of lines (BR-8).
 */

export type AccountLineKind = 'GOODS' | 'SENT' | 'FEE' | 'SHARE' | 'RETURN' | 'CASH_IN' | 'CASH_OUT';

/** One account line in Decimal/Date form; `sortId` breaks ties between lines on the same date. */
export interface AccountLine {
  date: Date;
  sortId: number;
  kind: AccountLineKind;
  amount: Prisma.Decimal;
  params: { count?: number; model?: string; supplierName?: string };
  ref: { kind: 'batch' | 'sale' | 'supplier' | 'transaction'; id: number } | null;
}

const ZERO = new Prisma.Decimal(0);

/** GOODS: one line per batch, + Σ unitPrice × quantity (extra cost excluded, as in FR-17). */
export function goodsLines(
  batches: { id: number; arrivalDate: Date; lines: { unitPrice: Prisma.Decimal; quantity: number }[] }[],
): AccountLine[] {
  return batches.map((b) => ({
    date: b.arrivalDate,
    sortId: b.id,
    kind: 'GOODS',
    amount: b.lines.reduce((sum, l) => sum.plus(l.unitPrice.times(l.quantity)), ZERO),
    params: { count: b.lines.reduce((n, l) => n + l.quantity, 0) },
    ref: { kind: 'batch', id: b.id },
  }));
}

/**
 * SENT: − amount per supplier payment; plus FEE − fee when the investor bears a non-zero fee and the
 * payment is theirs (investorId null or = this investor), so a fee charged to another investor Q
 * never also lands on this account.
 */
export function paymentLines(
  supplier: { id: number; name: string },
  payments: {
    id: number;
    date: Date;
    amount: Prisma.Decimal;
    fee: Prisma.Decimal;
    feePaidBy: FeePayer;
    investorId: number | null;
  }[],
  investorId: number,
): AccountLine[] {
  const ref = { kind: 'supplier', id: supplier.id } as const;
  const params = { supplierName: supplier.name };
  return payments.flatMap((p) => {
    const sent: AccountLine = { date: p.date, sortId: p.id, kind: 'SENT', amount: p.amount.negated(), params, ref };
    const ours = p.investorId === null || p.investorId === investorId;
    if (!ours || p.feePaidBy !== FeePayer.INVESTOR || p.fee.isZero()) return [sent];
    return [sent, { date: p.date, sortId: p.id, kind: 'FEE', amount: p.fee.negated(), params, ref }];
  });
}

/**
 * SHARE / RETURN: + investorShare of the profit lines whose sale line belongs to the investor (BR-7
 * snapshot). RETURN shares are already negative (on a DEFECTIVE return, the share of the loss).
 */
export function shareLines(lines: ProfitLine[], investorId: number): AccountLine[] {
  return lines
    .filter((l) => l.investor?.id === investorId)
    .map((l) => ({
      date: l.profitDate,
      sortId: l.returnId ?? l.saleItemId,
      kind: l.kind === 'SALE' ? 'SHARE' : 'RETURN',
      amount: l.investorShare,
      params: { model: l.productModel },
      ref: { kind: 'sale', id: l.saleId },
    }));
}

/** CASH_IN: + DEPOSIT (cash the investor handed over); CASH_OUT: − PAYOUT (cash handed to them). */
export function cashLines(
  transactions: { id: number; date: Date; type: InvestorTxType; amount: Prisma.Decimal }[],
): AccountLine[] {
  return transactions.map((t) => {
    const isIn = t.type === InvestorTxType.DEPOSIT;
    return {
      date: t.date,
      sortId: t.id,
      kind: isIn ? 'CASH_IN' : 'CASH_OUT',
      amount: isIn ? t.amount : t.amount.negated(),
      params: {},
      ref: { kind: 'transaction', id: t.id },
    };
  });
}

/** Sorts newest first, sums every line into `owedToInvestor`, then returns one page as strings. */
export function buildAccount(lines: AccountLine[], page: number, pageSize: number) {
  const sorted = [...lines].sort((a, b) => b.date.getTime() - a.date.getTime() || b.sortId - a.sortId);
  const owed = lines.reduce((sum, l) => sum.plus(l.amount), ZERO);
  return {
    owedToInvestor: owed.toFixed(2),
    lines: sorted.slice((page - 1) * pageSize, page * pageSize).map((l) => ({
      id: `${l.kind}-${l.sortId}`, // unique: sortId is unique per kind (SENT and FEE differ by kind)
      date: l.date.toISOString(),
      kind: l.kind,
      amount: l.amount.toFixed(2),
      params: l.params,
      ref: l.ref,
    })),
    total: sorted.length,
    page,
    pageSize,
  };
}
