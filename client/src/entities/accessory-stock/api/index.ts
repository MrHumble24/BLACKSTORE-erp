import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/shared/api';
import type { Page } from '@/shared/types';
import type {
  AccessoryStock,
  AddAccessoryStockPayload,
  AccessoryStockFilters,
} from '../model/types';

export const accessoryStockKeys = {
  all: ['accessory-stock'] as const,
  lists: () => [...accessoryStockKeys.all, 'list'] as const,
  list: (filters: AccessoryStockFilters, page: number, pageSize: number) =>
    [...accessoryStockKeys.lists(), { filters, page, pageSize }] as const,
};

/** Fetch accessory stock list paginated with location and category filters. */
export function useAccessoryStock(filters: AccessoryStockFilters, page = 1, pageSize = 20) {
  return useQuery({
    queryKey: accessoryStockKeys.list(filters, page, pageSize),
    queryFn: async () => {
      const params: Record<string, string> = {
        page: String(page),
        pageSize: String(pageSize),
      };
      if (filters.locationId) params.locationId = String(filters.locationId);
      if (filters.categoryId) params.categoryId = String(filters.categoryId);

      const { data } = await api.get<Page<AccessoryStock>>('/accessory-stock', { params });
      return data;
    },
  });
}

/** Add stock quantity to a product model at a location. */
export function useAddAccessoryStock() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (payload: AddAccessoryStockPayload) => {
      const { data } = await api.post<AccessoryStock>('/accessory-stock', payload);
      return data;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: accessoryStockKeys.lists() });
    },
  });
}
