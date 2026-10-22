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
}

export interface AddAccessoryStockPayload {
  productModelId: number;
  locationId: number;
  quantity: number;
  unitCost?: string;
}

export interface AccessoryStockFilters {
  locationId?: number;
  categoryId?: number;
}
