import { Prisma } from '@prisma/client';
import { balanceOf, sumPaid, sumRefunded } from './sale-totals';

// ── Selects ──────────────────────────────────────────────

/** Summary select: only the amounts the list totals need (no full payment/return rows → no N+1). */
export const saleSummarySelect = {
  id: true,
  createdAt: true,
  status: true,
  dueDate: true,
  total: true,
  customer: { select: { id: true, name: true, phone: true } },
  location: { select: { id: true, name: true } },
  seller: { select: { id: true, name: true } },
  items: { select: { quantity: true } },
  payments: { select: { amount: true } },
  returns: { select: { refundAmount: true } },
} satisfies Prisma.SaleSelect;

/** Detail select: full lines, payments and returns for the single-sale response. */
export const saleDetailSelect = {
  id: true,
  createdAt: true,
  status: true,
  dueDate: true,
  total: true,
  // telegramChatId drives the receipt-send + invite-link decision; stripped from the response in toSale.
  customer: { select: { id: true, name: true, phone: true, telegramChatId: true } },
  location: { select: { id: true, name: true } },
  seller: { select: { id: true, name: true } },
  items: {
    orderBy: { id: 'asc' },
    select: {
      id: true,
      quantity: true,
      unitPrice: true,
      warrantyUntil: true,
      unitCost: true,
      shareType: true,
      shareValue: true,
      item: {
        select: { id: true, status: true, identifiers: { select: { id: true, type: true, value: true } } },
      },
      productModel: { select: { id: true, name: true, category: { select: { id: true, name: true } } } },
      investor: { select: { id: true, name: true, code: true } },
      returns: { select: { quantity: true } },
    },
  },
  payments: {
    orderBy: { id: 'asc' },
    select: {
      id: true,
      amount: true,
      method: true,
      date: true,
      receiver: { select: { id: true, name: true } },
    },
  },
  returns: {
    orderBy: { id: 'asc' },
    select: {
      id: true,
      saleItemId: true,
      quantity: true,
      refundAmount: true,
      cashRefund: true,
      result: true,
      reason: true,
      date: true,
      user: { select: { id: true, name: true } },
    },
  },
} satisfies Prisma.SaleSelect;

export type SaleSummaryRow = Prisma.SaleGetPayload<{ select: typeof saleSummarySelect }>;
export type SaleDetailRow = Prisma.SaleGetPayload<{ select: typeof saleDetailSelect }>;
type SaleItemRow = SaleDetailRow['items'][number];

// ── Mappers ──────────────────────────────────────────────

/** Money totals + itemCount shared by both response shapes. */
function money(row: { total: Prisma.Decimal; payments: { amount: Prisma.Decimal }[]; returns: { refundAmount: Prisma.Decimal }[] }) {
  const paid = sumPaid(row.payments);
  const refunded = sumRefunded(row.returns);
  return {
    total: row.total.toFixed(2),
    paid: paid.toFixed(2),
    refunded: refunded.toFixed(2),
    balance: balanceOf(row.total, paid, refunded).toFixed(2),
  };
}

/** SaleSummary for the list: totals from loaded amounts, itemCount = Σ line quantity. */
export function toSaleSummary(row: SaleSummaryRow) {
  return {
    id: row.id,
    createdAt: row.createdAt.toISOString(),
    status: row.status,
    customer: row.customer,
    location: row.location,
    seller: row.seller,
    ...money(row),
    dueDate: row.dueDate?.toISOString() ?? null,
    itemCount: row.items.reduce((sum, i) => sum + i.quantity, 0),
  };
}

/** One sale line; cost/share keys (unitCost, investor, shareType, shareValue) only with view_cost. */
function toSaleItem(line: SaleItemRow, canViewCost: boolean) {
  const base = {
    id: line.id,
    item: line.item ? { id: line.item.id, identifiers: line.item.identifiers, status: line.item.status } : null,
    productModel: line.productModel,
    quantity: line.quantity,
    unitPrice: line.unitPrice.toFixed(2),
    warrantyUntil: line.warrantyUntil?.toISOString() ?? null,
    returnedQuantity: line.returns.reduce((sum, r) => sum + r.quantity, 0),
  };
  if (!canViewCost) return base;
  return {
    ...base,
    unitCost: line.unitCost.toFixed(2),
    investor: line.investor,
    shareType: line.shareType,
    shareValue: line.shareValue.toFixed(2),
  };
}

/**
 * Full Sale: the summary shape plus the full items, payments and returns. `telegramInviteLink` is the
 * customer's deep link for the receipt page (null for walk-ins/linked customers); the caller mints it.
 * The customer's telegramChatId is used internally (receipt/link decision) but never returned.
 */
export function toSale(row: SaleDetailRow, canViewCost: boolean, telegramInviteLink: string | null = null) {
  const c = row.customer;
  return {
    ...toSaleSummary(row),
    customer: c ? { id: c.id, name: c.name, phone: c.phone } : null, // never leak telegramChatId
    telegramInviteLink,
    items: row.items.map((line) => toSaleItem(line, canViewCost)),
    payments: row.payments.map((p) => ({
      id: p.id,
      amount: p.amount.toFixed(2),
      method: p.method,
      date: p.date.toISOString(),
      receivedBy: p.receiver,
    })),
    returns: row.returns.map((r) => ({
      id: r.id,
      saleItemId: r.saleItemId,
      quantity: r.quantity,
      refundAmount: r.refundAmount.toFixed(2),
      cashRefund: r.cashRefund.toFixed(2),
      result: r.result,
      reason: r.reason,
      date: r.date.toISOString(),
      user: r.user,
    })),
  };
}
