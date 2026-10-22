import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/shared/api';
import type {
  LedgerEntry,
  LedgerPage,
  LedgerFilters,
  CreateLedgerEntryPayload,
} from '../model/types';

export const LEDGER_PAGE_SIZE = 20;

export const ledgerKeys = {
  all: ['ledger'] as const,
  lists: () => [...ledgerKeys.all, 'list'] as const,
  list: (filters: LedgerFilters, page: number) =>
    [...ledgerKeys.lists(), { filters, page }] as const,
  categories: () => [...ledgerKeys.all, 'categories'] as const,
};

/** Paginated ledger entries (newest first) with income/expense/net totals over the whole filter. */
export function useLedger(filters: LedgerFilters, page = 1) {
  return useQuery({
    queryKey: ledgerKeys.list(filters, page),
    queryFn: async () => {
      const params: Record<string, string> = { page: String(page), pageSize: String(LEDGER_PAGE_SIZE) };
      if (filters.type) params.type = filters.type;
      if (filters.category) params.category = filters.category;
      if (filters.from) params.from = filters.from;
      if (filters.to) params.to = filters.to;
      const { data } = await api.get<LedgerPage>('/ledger', { params });
      return data;
    },
  });
}

/** Distinct categories, sorted, for the datalist. */
export function useLedgerCategories() {
  return useQuery({
    queryKey: ledgerKeys.categories(),
    queryFn: async () => {
      const { data } = await api.get<string[]>('/ledger/categories');
      return data;
    },
  });
}

/** Creates an income/expense entry and refreshes the ledger (list, totals, categories). */
export function useCreateLedgerEntry() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (payload: CreateLedgerEntryPayload) => {
      const { data } = await api.post<LedgerEntry>('/ledger', payload);
      return data;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ledgerKeys.all });
    },
  });
}
