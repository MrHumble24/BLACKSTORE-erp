import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/shared/api';
import { reportKeys } from '@/entities/report';
import { dashboardKeys } from '@/entities/dashboard';
import { businessDayKeys } from '@/entities/business-day';
import type {
  LedgerEntry,
  LedgerPage,
  LedgerFilters,
  CreateLedgerEntryPayload,
  ExpenseStatus,
} from '../model/types';

export const LEDGER_PAGE_SIZE = 20;

export const ledgerKeys = {
  all: ['ledger'] as const,
  lists: () => [...ledgerKeys.all, 'list'] as const,
  list: (filters: LedgerFilters, page: number) =>
    [...ledgerKeys.lists(), { filters, page }] as const,
  categories: () => [...ledgerKeys.all, 'categories'] as const,
};

/** Paginated ledger entries (newest first) with income/confirmed/pending/excluded/net totals. */
export function useLedger(filters: LedgerFilters, page = 1) {
  return useQuery({
    queryKey: ledgerKeys.list(filters, page),
    queryFn: async () => {
      const params: Record<string, string> = { page: String(page), pageSize: String(LEDGER_PAGE_SIZE) };
      if (filters.type) params.type = filters.type;
      if (filters.status) params.status = filters.status;
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

interface SetLedgerStatusPayload {
  id: number;
  status: ExpenseStatus;
}

/**
 * Confirms or excludes an EXPENSE (FR-27). Only CONFIRMED expenses reduce net profit and
 * expected cash, so the ledger plus every derived view (profit report, dashboard, open day)
 * must be refetched after the decision.
 */
export function useSetLedgerStatus() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, status }: SetLedgerStatusPayload) => {
      const { data } = await api.patch<LedgerEntry>(`/ledger/${id}/status`, { status });
      return data;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ledgerKeys.all });
      void queryClient.invalidateQueries({ queryKey: reportKeys.all });
      void queryClient.invalidateQueries({ queryKey: dashboardKeys.all });
      void queryClient.invalidateQueries({ queryKey: businessDayKeys.all });
    },
  });
}
