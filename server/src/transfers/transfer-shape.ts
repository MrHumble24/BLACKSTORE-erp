import { Prisma } from '@prisma/client';
import { itemBriefSelect } from '../common/item-brief';

const userBrief = { select: { id: true, name: true } };
const locationBrief = { select: { id: true, name: true } };

/** List row: enough for TransferSummary (counts come from the loaded lines). */
export const transferSummarySelect = {
  id: true,
  date: true,
  note: true,
  fromLocation: locationBrief,
  toLocation: locationBrief,
  user: userBrief,
  _count: { select: { items: true } },
  accessories: { select: { quantity: true } },
} satisfies Prisma.TransferSelect;

/** Detail row: adds the full item briefs and accessory models. */
export const transferDetailSelect = {
  id: true,
  date: true,
  note: true,
  fromLocation: locationBrief,
  toLocation: locationBrief,
  user: userBrief,
  items: { select: { item: { select: itemBriefSelect } } },
  accessories: { select: { quantity: true, productModel: { select: { id: true, name: true } } } },
} satisfies Prisma.TransferSelect;

type SummaryRow = Prisma.TransferGetPayload<{ select: typeof transferSummarySelect }>;
type DetailRow = Prisma.TransferGetPayload<{ select: typeof transferDetailSelect }>;

const sumUnits = (lines: { quantity: number }[]) => lines.reduce((n, l) => n + l.quantity, 0);

/** The 7 fields both transfer shapes share (itemCount is derived differently and added by each). */
function sharedFields(row: SummaryRow | DetailRow) {
  return {
    id: row.id,
    date: row.date,
    fromLocation: row.fromLocation,
    toLocation: row.toLocation,
    user: row.user,
    accessoryUnits: sumUnits(row.accessories),
    note: row.note,
  };
}

/** Maps a list row to TransferSummary. */
export function toTransferSummary(row: SummaryRow) {
  const { _count } = row;
  return { ...sharedFields(row), itemCount: _count.items };
}

/** Maps a detail row to Transfer (summary plus the moved items and accessories). */
export function toTransfer(row: DetailRow) {
  return {
    ...sharedFields(row),
    itemCount: row.items.length,
    items: row.items.map((i) => i.item),
    accessories: row.accessories.map((a) => ({ productModel: a.productModel, quantity: a.quantity })),
  };
}
