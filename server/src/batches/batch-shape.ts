import { Prisma } from '@prisma/client';
import { isPastBatch } from './batch-lock';

/** Lines loaded with just the fields the summary counts need (no per-batch second query). */
const summaryLineSelect = {
  quantity: true,
  itemId: true,
  unitPrice: true,
} satisfies Prisma.PurchaseLineSelect;

/** Full line select for detail and single-line responses (device + accessory). */
export const batchLineSelect = {
  id: true,
  quantity: true,
  unitPrice: true,
  extraCost: true,
  productModel: { select: { id: true, name: true, category: { select: { id: true, name: true } } } },
  item: {
    select: {
      id: true,
      status: true,
      identifiers: { select: { id: true, type: true, value: true }, orderBy: { id: 'asc' } },
      productModel: { select: { id: true, name: true, category: { select: { id: true, name: true } } } },
    },
  },
} satisfies Prisma.PurchaseLineSelect;

const headerSelect = {
  id: true,
  arrivalDate: true,
  note: true,
  costSplitMethod: true,
  extraCostTotal: true,
  supplier: { select: { id: true, name: true } },
  investor: { select: { id: true, name: true, code: true, isOwn: true } },
  location: { select: { id: true, name: true } },
} satisfies Prisma.BatchSelect;

export const batchSummarySelect = {
  ...headerSelect,
  lines: { select: summaryLineSelect },
} satisfies Prisma.BatchSelect;

export const batchDetailSelect = {
  ...headerSelect,
  lines: { select: batchLineSelect, orderBy: { id: 'asc' } },
} satisfies Prisma.BatchSelect;

type SummaryRow = Prisma.BatchGetPayload<{ select: typeof batchSummarySelect }>;
type DetailRow = Prisma.BatchGetPayload<{ select: typeof batchDetailSelect }>;
type LineRow = Prisma.PurchaseLineGetPayload<{ select: typeof batchLineSelect }>;

function header(row: SummaryRow | DetailRow) {
  return {
    id: row.id,
    supplier: row.supplier,
    investor: { ...row.investor, isOwn: row.investor.isOwn ?? false },
    location: row.location,
    arrivalDate: row.arrivalDate.toISOString(),
    note: row.note,
    costSplitMethod: row.costSplitMethod,
    isLocked: isPastBatch(row),
  };
}

/** itemsCost = Σ unitPrice × quantity over every line; a cost key (view_cost only). */
function itemsCost(lines: { unitPrice: Prisma.Decimal; quantity: number }[]) {
  return lines
    .reduce((sum, l) => sum.plus(l.unitPrice.times(l.quantity)), new Prisma.Decimal(0))
    .toFixed(2);
}

/** Lines still waiting for a price (unitPrice 0); a cost key (view_cost only). */
function unpricedLines(lines: { unitPrice: Prisma.Decimal }[]) {
  return lines.filter((l) => l.unitPrice.isZero()).length;
}

/** BatchSummary; cost keys (extraCostTotal, itemsCost) present only with view_cost. */
export function toBatchSummary(row: SummaryRow, canViewCost: boolean) {
  const base = {
    ...header(row),
    deviceCount: row.lines.filter((l) => l.itemId !== null).length,
    accessoryUnits: row.lines
      .filter((l) => l.itemId === null)
      .reduce((sum, l) => sum + l.quantity, 0),
  };
  if (!canViewCost) return base;
  return {
    ...base,
    extraCostTotal: row.extraCostTotal.toFixed(2),
    itemsCost: itemsCost(row.lines),
    unpricedLines: unpricedLines(row.lines),
  };
}

/** One BatchLine; device lines take their model from the item, accessories from the line. */
export function toBatchLine(line: LineRow, canViewCost: boolean) {
  // A line is either a device (model via its item) or an accessory (model on the line itself).
  const model = line.item?.productModel ?? line.productModel;
  if (!model) throw new Error(`Purchase line ${line.id} has no product model`);
  const base = {
    id: line.id,
    quantity: line.quantity,
    item: line.item
      ? { id: line.item.id, status: line.item.status, identifiers: line.item.identifiers }
      : null,
    productModel: { id: model.id, name: model.name, category: model.category },
  };
  if (!canViewCost) return base;
  return { ...base, unitPrice: line.unitPrice.toFixed(2), extraCost: line.extraCost.toFixed(2) };
}

/** Full Batch: summary fields plus ordered lines. */
export function toBatch(row: DetailRow, canViewCost: boolean) {
  const base = {
    ...header(row),
    deviceCount: row.lines.filter((l) => l.item !== null).length,
    accessoryUnits: row.lines
      .filter((l) => l.item === null)
      .reduce((sum, l) => sum + l.quantity, 0),
    lines: row.lines.map((l) => toBatchLine(l, canViewCost)),
  };
  if (!canViewCost) return base;
  return {
    ...base,
    extraCostTotal: row.extraCostTotal.toFixed(2),
    itemsCost: itemsCost(row.lines),
    unpricedLines: unpricedLines(row.lines),
  };
}
