import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/shared/api';
import type { Page } from '@/shared/types';
import type {
  StockCount,
  StockCountScan,
  StockCountSummary,
  StockCountFilters,
  CreateStockCountPayload,
} from '../model/types';

export const STOCK_COUNTS_PAGE_SIZE = 20;

export const stockCountKeys = {
  all: ['stock-counts'] as const,
  lists: () => [...stockCountKeys.all, 'list'] as const,
  list: (filters: StockCountFilters, page: number) =>
    [...stockCountKeys.lists(), { filters, page }] as const,
  detail: (id: number) => [...stockCountKeys.all, 'detail', id] as const,
};

/** Paginated stock counts, newest first. */
export function useStockCounts(filters: StockCountFilters, page = 1) {
  return useQuery({
    queryKey: stockCountKeys.list(filters, page),
    queryFn: async () => {
      const params: Record<string, string> = { page: String(page), pageSize: String(STOCK_COUNTS_PAGE_SIZE) };
      if (filters.locationId) params.locationId = String(filters.locationId);
      const { data } = await api.get<Page<StockCountSummary>>('/stock-counts', { params });
      return data;
    },
  });
}

/** One stock count with its result computed now. */
export function useStockCount(id: number) {
  return useQuery({
    queryKey: stockCountKeys.detail(id),
    enabled: Boolean(id),
    queryFn: async () => {
      const { data } = await api.get<StockCount>(`/stock-counts/${id}`);
      return data;
    },
  });
}

/** Opens a count for a location (409 if one is already open there). */
export function useStartStockCount() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (payload: CreateStockCountPayload) => {
      const { data } = await api.post<StockCount>('/stock-counts', payload);
      return data;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: stockCountKeys.lists() });
    },
  });
}

/** Scans one code into a count; the detail (which holds the result) is refreshed. */
export function useScanStockCount(id: number) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (code: string) => {
      const { data } = await api.post<StockCountScan>(`/stock-counts/${id}/scans`, { code });
      return data;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: stockCountKeys.detail(id) });
    },
  });
}

/** Finishes a count; refreshes its detail and the list. */
export function useFinishStockCount(id: number) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async () => {
      const { data } = await api.post<StockCount>(`/stock-counts/${id}/finish`);
      return data;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: stockCountKeys.detail(id) });
      void queryClient.invalidateQueries({ queryKey: stockCountKeys.lists() });
    },
  });
}
