export interface ProductModel {
  id: number;
  name: string;
  categoryId: number;
  category?: {
    id: number;
    name: string;
    isSerialized?: boolean;
  };
  isActive: boolean;
  /** Low-stock alert threshold for accessories; null means no alert. */
  lowStockThreshold: number | null;
  createdAt: string;
  updatedAt: string;
}

export interface CreateProductModelPayload {
  categoryId: number;
  name: string;
  lowStockThreshold?: number | null;
}

export interface UpdateProductModelPayload {
  name?: string;
  isActive?: boolean;
  lowStockThreshold?: number | null;
}
