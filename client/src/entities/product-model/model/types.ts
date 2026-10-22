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
  createdAt: string;
  updatedAt: string;
}

export interface CreateProductModelPayload {
  categoryId: number;
  name: string;
}

export interface UpdateProductModelPayload {
  name?: string;
  isActive?: boolean;
}
