import type { Item } from '@/entities/item';

/** One device on the handover form, with the minimum price the partner must sell it for. */
export interface HandoverLine {
  item: Item;
  minPrice: string;
}
