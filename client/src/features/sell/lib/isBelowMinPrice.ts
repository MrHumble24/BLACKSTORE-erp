import type { SellCartLine } from '../model/types';

/** Checks if a device cart line is priced strictly below its minimum selling price. */
export function isBelowMinPrice(line: SellCartLine): boolean {
  return (
    line.type === 'device' &&
    Boolean(line.minSalePrice) &&
    line.unitPrice !== '' &&
    Number(line.unitPrice) < Number(line.minSalePrice)
  );
}
