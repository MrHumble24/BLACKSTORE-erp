import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/shared/api';
import { itemKeys } from '@/entities/item';
import type { Page } from '@/shared/types';
import type {
  Transfer,
  TransferSummary,
  TransferFilters,
  CreateTransferPayload,
} from '../model/types';

export const TRANSFERS_PAGE_SIZE = 20;

export const transferKeys = {
  all: ['transfers'] as const,
  lists: () => [...transferKeys.all, 'list'] as const,
  list: (filters: TransferFilters, page: number) =>
    [...transferKeys.lists(), { filters, page }] as const,
  detail: (id: number) => [...transferKeys.all, 'detail', id] as const,
};

/** Paginated transfers, newest first; locationId matches either end, itemId a moved device. */
export function useTransfers(filters: TransferFilters, page = 1) {
  return useQuery({
    queryKey: transferKeys.list(filters, page),
    queryFn: async () => {
      const params: Record<string, string> = { page: String(page), pageSize: String(TRANSFERS_PAGE_SIZE) };
      if (filters.locationId) params.locationId = String(filters.locationId);
      if (filters.itemId) params.itemId = String(filters.itemId);
      if (filters.from) params.from = filters.from;
      if (filters.to) params.to = filters.to;
      const { data } = await api.get<Page<TransferSummary>>('/transfers', { params });
      return data;
    },
  });
}

/** One transfer with its moved items and accessory lines. */
export function useTransfer(id: number) {
  return useQuery({
    queryKey: transferKeys.detail(id),
    enabled: Boolean(id),
    queryFn: async () => {
      const { data } = await api.get<Transfer>(`/transfers/${id}`);
      return data;
    },
  });
}

/** Creates a transfer; items moved, so both the items and transfers caches are refreshed. */
export function useCreateTransfer() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (payload: CreateTransferPayload) => {
      const { data } = await api.post<Transfer>('/transfers', payload);
      return data;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: transferKeys.lists() });
      void queryClient.invalidateQueries({ queryKey: itemKeys.all });
    },
  });
}
