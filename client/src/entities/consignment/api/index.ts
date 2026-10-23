import { useQuery, useMutation, useQueryClient, type QueryClient } from '@tanstack/react-query';
import { api } from '@/shared/api';
import type { Page } from '@/shared/types';
import type {
  Consignment,
  ConsignmentSummary,
  ConsignmentItem,
  ConsignmentFilters,
  CreateConsignmentPayload,
  SellConsignmentItemPayload,
} from '../model/types';

export const consignmentKeys = {
  all: ['consignments'] as const,
  lists: () => [...consignmentKeys.all, 'list'] as const,
  list: (filters: ConsignmentFilters, page: number, pageSize: number) =>
    [...consignmentKeys.lists(), { filters, page, pageSize }] as const,
  details: () => [...consignmentKeys.all, 'detail'] as const,
  detail: (id: number | string) => [...consignmentKeys.details(), String(id)] as const,
};

function invalidateConsignmentRelated(queryClient: QueryClient) {
  void queryClient.invalidateQueries({ queryKey: ['consignments'] });
  void queryClient.invalidateQueries({ queryKey: ['partners'] });
  void queryClient.invalidateQueries({ queryKey: ['items'] });
  void queryClient.invalidateQueries({ queryKey: ['sales'] });
}

/** Fetch paginated list of consignment summaries newest first. */
export function useConsignments(filters: ConsignmentFilters = {}, page = 1, pageSize = 20) {
  return useQuery({
    queryKey: consignmentKeys.list(filters, page, pageSize),
    queryFn: async () => {
      const params: Record<string, string> = {
        page: String(page),
        pageSize: String(pageSize),
      };
      if (filters.partnerId) params.partnerId = String(filters.partnerId);
      if (filters.open !== undefined) params.open = String(filters.open);
      const { data } = await api.get<Page<ConsignmentSummary>>('/consignments', { params });
      return data;
    },
  });
}

/** Fetch single consignment details with items list. */
export function useConsignment(id: number | string) {
  return useQuery({
    queryKey: consignmentKeys.detail(id),
    queryFn: async () => {
      const { data } = await api.get<Consignment>(`/consignments/${id}`);
      return data;
    },
    enabled: Boolean(id),
  });
}

/** Create a new consignment and invalidate related caches. */
export function useCreateConsignment() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (payload: CreateConsignmentPayload) => {
      const { data } = await api.post<Consignment>('/consignments', payload);
      return data;
    },
    onSuccess: () => {
      invalidateConsignmentRelated(queryClient);
    },
  });
}

/** Update the due date of a consignment. */
export function useUpdateConsignmentDueDate() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, dueDate }: { id: number; dueDate: string | null }) => {
      const { data } = await api.patch<Consignment>(`/consignments/${id}`, { dueDate });
      return data;
    },
    onSuccess: () => {
      invalidateConsignmentRelated(queryClient);
    },
  });
}

/** Update the minPrice of a consignment item while AT_PARTNER. */
export function useUpdateConsignmentItemPrice() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      consignmentId,
      itemId,
      minPrice,
    }: {
      consignmentId: number;
      itemId: number;
      minPrice: string;
    }) => {
      const { data } = await api.patch<ConsignmentItem>(
        `/consignments/${consignmentId}/items/${itemId}`,
        { minPrice },
      );
      return data;
    },
    onSuccess: () => {
      invalidateConsignmentRelated(queryClient);
    },
  });
}

/** Record partner sale of a consignment item. */
export function useSellConsignmentItem() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      consignmentId,
      itemId,
      payload,
    }: {
      consignmentId: number;
      itemId: number;
      payload: SellConsignmentItemPayload;
    }) => {
      const { data } = await api.post<Consignment>(
        `/consignments/${consignmentId}/items/${itemId}/sell`,
        payload,
      );
      return data;
    },
    onSuccess: () => {
      invalidateConsignmentRelated(queryClient);
    },
  });
}

/** Return an item from partner back to in stock. */
export function useReturnConsignmentItem() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      consignmentId,
      itemId,
    }: {
      consignmentId: number;
      itemId: number;
    }) => {
      const { data } = await api.post<Consignment>(
        `/consignments/${consignmentId}/items/${itemId}/return`,
      );
      return data;
    },
    onSuccess: () => {
      invalidateConsignmentRelated(queryClient);
    },
  });
}
