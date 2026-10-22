import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/shared/api';
import type {
  ProductModel,
  CreateProductModelPayload,
  UpdateProductModelPayload,
} from '../model/types';

export const productModelKeys = {
  all: ['product-models'] as const,
  list: (categoryId?: number, all?: boolean) =>
    [...productModelKeys.all, 'list', { categoryId, all }] as const,
};

/**
 * Fetch product models. Optionally filtered by categoryId. Pass `all = true` for inactive items.
 */
export function useProductModels(categoryId?: number, all = false) {
  return useQuery({
    queryKey: productModelKeys.list(categoryId, all),
    queryFn: async () => {
      const { data } = await api.get<ProductModel[]>('/product-models', {
        params: {
          ...(categoryId ? { categoryId: String(categoryId) } : {}),
          ...(all ? { all: 'true' } : {}),
        },
      });
      return data;
    },
  });
}

/** Creates a product model and invalidates the product-model lists. */
export function useCreateProductModel() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (payload: CreateProductModelPayload) => {
      const { data } = await api.post<ProductModel>('/product-models', payload);
      return data;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: productModelKeys.all });
    },
  });
}

/** Updates a product model (name or isActive); the category cannot change (contract). */
export function useUpdateProductModel() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      id,
      payload,
    }: {
      id: number;
      payload: UpdateProductModelPayload;
    }) => {
      const { data } = await api.patch<ProductModel>(`/product-models/${id}`, payload);
      return data;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: productModelKeys.all });
    },
  });
}
