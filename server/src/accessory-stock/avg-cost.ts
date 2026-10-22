import { Prisma } from '@prisma/client';

/**
 * Weighted-average unit cost after adding stock:
 * (oldQty·oldAvg + addQty·unitCost) / (oldQty + addQty), rounded to 2 decimals.
 * Shared by restock (unitCost = paid price) and transfer (unitCost = source avgCost).
 */
export function blendAvgCost(
  oldQty: number,
  oldAvg: Prisma.Decimal,
  addQty: number,
  unitCost: Prisma.Decimal,
): Prisma.Decimal {
  const totalQty = oldQty + addQty;
  if (totalQty === 0) return new Prisma.Decimal(0);
  const blended = oldAvg.times(oldQty).plus(unitCost.times(addQty)).div(totalQty);
  return new Prisma.Decimal(blended.toFixed(2));
}
