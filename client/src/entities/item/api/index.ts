import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/shared/api';
import type {
  Item,
  ItemWithCost,
  ItemIdentifier,
  CreateItemPayload,
  UpdateItemPayload,
  UpdatePricesPayload,
  AddIdentifierPayload,
  ItemFilters,
  Page,
} from '../model/types';

export const itemKeys = {
  all: ['items'] as const,
  lists: () => [...itemKeys.all, 'list'] as const,
  list: (filters: ItemFilters, page: number, pageSize: number) =>
    [...itemKeys.lists(), { filters, page, pageSize }] as const,
  details: () => [...itemKeys.all, 'detail'] as const,
  detail: (id: number) => [...itemKeys.details(), id] as const,
};

/** Fetch paginated items list with status, location, category, investor, and search filters. */
export function useItems(filters: ItemFilters, page = 1, pageSize = 20) {
  return useQuery({
    queryKey: itemKeys.list(filters, page, pageSize),
    queryFn: async () => {
      const params: Record<string, string> = {
        page: String(page),
        pageSize: String(pageSize),
      };
      if (filters.status) params.status = filters.status;
      if (filters.condition) params.condition = filters.condition;
      if (filters.locationId) params.locationId = String(filters.locationId);
      if (filters.categoryId) params.categoryId = String(filters.categoryId);
      if (filters.investorId) params.investorId = String(filters.investorId);
      if (filters.search) params.search = filters.search.trim();
      if (filters.isUnpriced) params.isUnpriced = 'true';
      if (filters.sortBy) params.sortBy = filters.sortBy;
      if (filters.sortOrder) params.sortOrder = filters.sortOrder;

      const { data } = await api.get<Page<Item>>('/items', { params });
      return data;
    },
  });
}

/** Fetch a single item by id. */
export function useItem(id: number) {
  return useQuery({
    queryKey: itemKeys.detail(id),
    queryFn: async () => {
      const { data } = await api.get<Item>(`/items/${id}`);
      return data;
    },
    enabled: Boolean(id),
  });
}

/** Mutation lookup hook used by the scan field to find an item by IMEI or Serial. */
export function useItemByCode() {
  return useMutation({
    mutationFn: async (code: string) => {
      const trimmed = code.trim().toUpperCase();
      const { data } = await api.get<Item>(`/items/by-code/${encodeURIComponent(trimmed)}`);
      return data;
    },
  });
}

/** Create new device item with identifiers and initial stock. */
export function useCreateItem() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (payload: CreateItemPayload) => {
      const { data } = await api.post<Item>('/items', payload);
      return data;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: itemKeys.lists() });
    },
  });
}

/** Update device condition and attributes. */
export function useUpdateItem() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, payload }: { id: number; payload: UpdateItemPayload }) => {
      const { data } = await api.patch<Item>(`/items/${id}`, payload);
      return data;
    },
    onSuccess: (_, variables) => {
      void queryClient.invalidateQueries({ queryKey: itemKeys.detail(variables.id) });
      void queryClient.invalidateQueries({ queryKey: itemKeys.lists() });
    },
  });
}

/** Update item purchase, sale, and minimum price. */
export function useUpdateItemPrices() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, payload }: { id: number; payload: UpdatePricesPayload }) => {
      const { data } = await api.patch<ItemWithCost>(`/items/${id}/prices`, payload);
      return data;
    },
    onSuccess: (_, variables) => {
      void queryClient.invalidateQueries({ queryKey: itemKeys.detail(variables.id) });
      void queryClient.invalidateQueries({ queryKey: itemKeys.lists() });
    },
  });
}

/** Add a new identifier (e.g. secondary IMEI or Serial) to an existing item. */
export function useAddIdentifier() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, payload }: { id: number; payload: AddIdentifierPayload }) => {
      const { data } = await api.post<ItemIdentifier>(`/items/${id}/identifiers`, payload);
      return data;
    },
    onSuccess: (_, variables) => {
      void queryClient.invalidateQueries({ queryKey: itemKeys.detail(variables.id) });
      void queryClient.invalidateQueries({ queryKey: itemKeys.lists() });
    },
  });
}

/** Generates (or returns the existing) BS-XXXXXX system code for an item (FR-15 labels). */
export function useGenerateSystemCode() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: number) => {
      const { data } = await api.post<ItemIdentifier>(`/items/${id}/system-code`);
      return data;
    },
    onSuccess: (_, id) => {
      void queryClient.invalidateQueries({ queryKey: itemKeys.detail(id) });
      void queryClient.invalidateQueries({ queryKey: itemKeys.lists() });
    },
  });
}
