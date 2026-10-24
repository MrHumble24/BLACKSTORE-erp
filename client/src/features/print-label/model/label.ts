interface ItemWithIdentifiers {
  identifiers: { type: string; value: string }[];
}

/** Finds the item's BS-XXXXXX system code, or undefined when it is not generated yet. */
export function getSystemCode(
  item: ItemWithIdentifiers | null | undefined,
): string | undefined {
  return item?.identifiers.find((identifier) => identifier.type === 'SYSTEM_CODE')?.value;
}

