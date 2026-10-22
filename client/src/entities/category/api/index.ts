import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/shared/api';
import type {
  Category,
  CategoryAttribute,
  CreateCategoryPayload,
  UpdateCategoryPayload,
  CreateAttributePayload,
  UpdateAttributePayload,
} from '../model/types';

export const categoryKeys = {
  all: ['categories'] as const,
  list: (all?: boolean) => [...categoryKeys.all, 'list', { all }] as const,
};

/**
 * Fetch categories list. Defaults to active only; pass `all = true` to get inactive as well.
 */
export function useCategories(all = false) {
  return useQuery({
    queryKey: categoryKeys.list(all),
    queryFn: async () => {
      const { data } = await api.get<Category[]>('/categories', {
        params: all ? { all: 'true' } : undefined,
      });
      return data;
    },
  });
}

/** Creates a category and invalidates the categories list. */
export function useCreateCategory() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (payload: CreateCategoryPayload) => {
      const { data } = await api.post<Category>('/categories', payload);
      return data;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: categoryKeys.all });
    },
  });
}

/** Updates a category (name, isSerialized or isActive) and invalidates the categories list. */
export function useUpdateCategory() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, payload }: { id: number; payload: UpdateCategoryPayload }) => {
      const { data } = await api.patch<Category>(`/categories/${id}`, payload);
      return data;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: categoryKeys.all });
    },
  });
}

/** Adds an attribute to a category and invalidates all category queries. */
export function useCreateAttribute() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      categoryId,
      payload,
    }: {
      categoryId: number;
      payload: CreateAttributePayload;
    }) => {
      const { data } = await api.post<CategoryAttribute>(
        `/categories/${categoryId}/attributes`,
        payload,
      );
      return data;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: categoryKeys.all });
    },
  });
}

/** Updates one attribute of a category; key and type cannot change (contract). */
export function useUpdateAttribute() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      categoryId,
      attributeId,
      payload,
    }: {
      categoryId: number;
      attributeId: number;
      payload: UpdateAttributePayload;
    }) => {
      const { data } = await api.patch<CategoryAttribute>(
        `/categories/${categoryId}/attributes/${attributeId}`,
        payload,
      );
      return data;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: categoryKeys.all });
    },
  });
}
