import type { CreateSaleLine } from '@/entities/sale';
import type { SellCartLine } from '../model/types';

/** Maps client cart rows to CreateSale API payload line shapes. */
export function buildSaleLines(lines: SellCartLine[]): CreateSaleLine[] {
  return lines.map((l) => {
    if (l.type === 'device') {
      return {
        itemId: l.itemId,
        unitPrice: l.unitPrice,
        warrantyUntil: l.warrantyUntil || undefined,
      };
    }
    return {
      productModelId: l.productModelId,
      quantity: l.quantity,
      unitPrice: l.unitPrice,
    };
  });
}
