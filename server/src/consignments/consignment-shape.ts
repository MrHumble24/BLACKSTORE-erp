import { ConsignmentItemStatus, Prisma } from '@prisma/client';
import { startOfToday } from '../common/dates';
import { itemBriefSelect } from '../common/item-brief';

// ── Selects ──────────────────────────────────────────────

/** One consignment item with the Staff-safe item brief (no cost fields). */
export const consignmentItemSelect = {
  id: true,
  minPrice: true,
  status: true,
  soldAt: true,
  returnedAt: true,
  saleItem: { select: { saleId: true } }, // resolve the owning Sale id for the client (BR-7)
  item: { select: itemBriefSelect },
} satisfies Prisma.ConsignmentItemSelect;

/** Summary select: itemCount via _count, heldCount via the ids of AT_PARTNER items only. */
export const consignmentSummarySelect = {
  id: true,
  date: true,
  dueDate: true,
  note: true,
  partner: { select: { id: true, name: true } },
  handedBy: { select: { id: true, name: true } },
  _count: { select: { items: true } },
  items: { where: { status: ConsignmentItemStatus.AT_PARTNER }, select: { id: true } },
} satisfies Prisma.ConsignmentSelect;

/** Detail select: the full item list for the single-consignment response. */
export const consignmentDetailSelect = {
  id: true,
  date: true,
  dueDate: true,
  note: true,
  partner: { select: { id: true, name: true } },
  handedBy: { select: { id: true, name: true } },
  items: { select: consignmentItemSelect, orderBy: { id: 'asc' } },
} satisfies Prisma.ConsignmentSelect;

export type ConsignmentSummaryRow = Prisma.ConsignmentGetPayload<{ select: typeof consignmentSummarySelect }>;
export type ConsignmentDetailRow = Prisma.ConsignmentGetPayload<{ select: typeof consignmentDetailSelect }>;
type ConsignmentItemRow = Prisma.ConsignmentItemGetPayload<{ select: typeof consignmentItemSelect }>;

// ── Mappers ──────────────────────────────────────────────

/** ConsignmentSummary: itemCount = all items, heldCount = items still AT_PARTNER. */
export function toConsignmentSummary(row: ConsignmentSummaryRow) {
  const { _count: count } = row;
  return {
    id: row.id,
    date: row.date.toISOString(),
    partner: row.partner,
    handedBy: row.handedBy,
    dueDate: row.dueDate?.toISOString() ?? null,
    note: row.note,
    itemCount: count.items,
    heldCount: row.items.length,
  };
}

/** One ConsignmentItem; overdue = held past a set due date. */
export function toConsignmentItem(item: ConsignmentItemRow, dueDate: Date | null, today: Date) {
  const overdue =
    item.status === ConsignmentItemStatus.AT_PARTNER && dueDate != null && dueDate < today;
  return {
    id: item.id,
    item: item.item,
    minPrice: item.minPrice.toFixed(2),
    status: item.status,
    soldAt: item.soldAt?.toISOString() ?? null,
    saleId: item.saleItem?.saleId ?? null, // the Sale created at sale time (BR-7)
    returnedAt: item.returnedAt?.toISOString() ?? null,
    overdue,
  };
}

/** Full Consignment: the summary fields plus every item. */
export function toConsignment(row: ConsignmentDetailRow) {
  const today = startOfToday();
  const heldIds = row.items.filter((i) => i.status === ConsignmentItemStatus.AT_PARTNER).map((i) => ({ id: i.id }));
  const summary = toConsignmentSummary({ ...row, _count: { items: row.items.length }, items: heldIds });
  return { ...summary, items: row.items.map((i) => toConsignmentItem(i, row.dueDate, today)) };
}
