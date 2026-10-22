/** One accessory line being drafted in the transfer panel; `key` is a stable client-only id. */
export interface AccessoryDraft {
  key: number;
  categoryId: number;
  productModelId: number;
  quantity: string;
}

let counter = 0;

/** A fresh, empty accessory draft row with a unique key for React lists. */
export function newAccessoryDraft(): AccessoryDraft {
  counter += 1;
  return { key: counter, categoryId: 0, productModelId: 0, quantity: '1' };
}
