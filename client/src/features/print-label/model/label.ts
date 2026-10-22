import type { Item } from '@/entities/item';

/** Finds the item's BS-XXXXXX system code, or undefined when it is not generated yet. */
export function getSystemCode(item: Item | undefined): string | undefined {
  return item?.identifiers.find((identifier) => identifier.type === 'SYSTEM_CODE')?.value;
}
