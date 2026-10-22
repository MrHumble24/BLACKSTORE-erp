import { CostSplitMethod, Prisma } from '@prisma/client';
import { runSequential } from '../common/sequential';

type Tx = Prisma.TransactionClient;

export interface SplitLine {
  id: number;
  unitPrice: Prisma.Decimal;
}

export interface SplitInput {
  total: Prisma.Decimal;
  method: CostSplitMethod;
  lines: SplitLine[]; // device lines only; accessories carry no share (FR-18)
}

/**
 * Splits a batch's extra cost over its device lines (FR-18, BR-1), pure and unit-tested.
 * EQUAL: total / deviceCount. BY_PRICE: total × unitPrice / Σ unitPrice (Σ 0 → EQUAL).
 * NONE or no lines: every line gets 0. Each share is rounded to 2 decimals and the
 * rounding remainder goes to the last line so the parts sum exactly to the total.
 */
export function splitExtraCost(input: SplitInput): Map<number, Prisma.Decimal> {
  const { total, method, lines } = input;
  const zero = new Prisma.Decimal(0);
  const result = new Map<number, Prisma.Decimal>();
  if (method === CostSplitMethod.NONE || lines.length === 0) {
    for (const line of lines) result.set(line.id, zero);
    return result;
  }

  let shares: Prisma.Decimal[];
  if (method === CostSplitMethod.BY_PRICE) {
    const sum = lines.reduce((s, l) => s.plus(l.unitPrice), zero);
    if (sum.isZero()) return splitExtraCost({ total, method: CostSplitMethod.EQUAL, lines });
    shares = lines.map((l) => total.times(l.unitPrice).div(sum));
  } else {
    const per = total.div(lines.length);
    shares = lines.map(() => per);
  }

  let allocated = zero;
  lines.forEach((line, i) => {
    if (i < lines.length - 1) {
      const rounded = new Prisma.Decimal(shares[i].toFixed(2));
      result.set(line.id, rounded);
      allocated = allocated.plus(rounded);
    } else {
      // Last line absorbs the rounding remainder so Σ shares === total.
      result.set(line.id, new Prisma.Decimal(total.minus(allocated).toFixed(2)));
    }
  });
  return result;
}

/**
 * Recomputes the split from the batch's current extraCostTotal/method and writes it to
 * every device PurchaseLine.extraCost and its Item.extraCost. Runs inside the caller's
 * transaction after a device line, extraCostTotal or method changes. Past sales are not
 * touched because sold items snapshot their cost at sale time (BR-7).
 */
export async function applyResplit(tx: Tx, batchId: number): Promise<void> {
  const batch = await tx.batch.findUniqueOrThrow({
    where: { id: batchId },
    select: { extraCostTotal: true, costSplitMethod: true },
  });
  const deviceLines = await tx.purchaseLine.findMany({
    where: { batchId, itemId: { not: null } },
    select: { id: true, itemId: true, unitPrice: true },
    orderBy: { id: 'asc' },
  });
  const shares = splitExtraCost({
    total: batch.extraCostTotal,
    method: batch.costSplitMethod,
    lines: deviceLines.map((l) => ({ id: l.id, unitPrice: l.unitPrice })),
  });
  const writes: Prisma.PrismaPromise<unknown>[] = [];
  for (const line of deviceLines) {
    const share = shares.get(line.id) ?? new Prisma.Decimal(0);
    writes.push(tx.purchaseLine.update({ where: { id: line.id }, data: { extraCost: share } }));
    if (line.itemId) {
      writes.push(tx.item.update({ where: { id: line.itemId }, data: { extraCost: share } }));
    }
  }
  await runSequential(writes);
}
