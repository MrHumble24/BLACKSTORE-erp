export interface AccessoryStock {
  id: number;
  productModel: {
    id: number;
    name: string;
    category: {
      id: number;
      name: string;
    };
  };
  location: {
    id: number;
    name: string;
  };
  quantity: number;
  avgCost?: string;
  /** Per-model low-stock threshold; null means no alert configured. */
  lowStockThreshold: number | null;
}

/** Stock-level filter values accepted by GET /accessory-stock. */
export type StockLevel = 'ALL' | 'IN_STOCK' | 'LOW_STOCK' | 'OUT_OF_STOCK';

export interface AddAccessoryStockPayload {
  productModelId: number;
  locationId: number;
  quantity: number;
  unitCost?: string;
}

export interface AccessoryStockFilters {
  locationId?: number;
  categoryId?: number;
  stockLevel?: StockLevel;
}
