import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/shared/api';
import type { Page } from '@/shared/types';
import { itemKeys, type Item } from '@/entities/item';
import { accessoryStockKeys, type AccessoryStock } from '@/entities/accessory-stock';
import type {
  Batch,
  BatchSummary,
  BatchLine,
  BatchFilters,
  CreateBatchPayload,
  UpdateBatchPayload,
  RepriceModelPayload,
  AddBatchItemPayload,
  AddBatchAccessoryPayload,
  UpdateBatchLinePayload,
} from '../model/types';

/** Fixed page size for all batch lists (matches the server default). */
export const BATCH_PAGE_SIZE = 20;

export const batchKeys = {
  all: ['batches'] as const,
  lists: () => [...batchKeys.all, 'list'] as const,
  list: (filters: BatchFilters, page: number, pageSize: number) =>
    [...batchKeys.lists(), { filters, page, pageSize }] as const,
  detail: (id: number) => [...batchKeys.all, 'detail', id] as const,
};

/** Fetch paginated batches, newest first; optionally filtered by supplier. */
export function useBatches(filters: BatchFilters, page = 1) {
  return useQuery({
    queryKey: batchKeys.list(filters, page, BATCH_PAGE_SIZE),
    queryFn: async () => {
      const params: Record<string, string> = {
        page: String(page),
        pageSize: String(BATCH_PAGE_SIZE),
      };
      if (filters.supplierId) params.supplierId = String(filters.supplierId);

      const { data } = await api.get<Page<BatchSummary>>('/batches', { params });
      return data;
    },
  });
}

/** Fetch one batch with all its lines. */
export function useBatch(id: number) {
  return useQuery({
    queryKey: batchKeys.detail(id),
    enabled: Boolean(id),
    queryFn: async () => {
      const { data } = await api.get<Batch>(`/batches/${id}`);
      return data;
    },
  });
}

/** Invalidates the batch detail/lists plus the item and accessory-stock lists (stock moved). */
function invalidateAfterBatchWrite(
  queryClient: ReturnType<typeof useQueryClient>,
  id: number | null,
) {
  if (id !== null) {
    void queryClient.invalidateQueries({ queryKey: batchKeys.detail(id) });
  }
  void queryClient.invalidateQueries({ queryKey: batchKeys.lists() });
  void queryClient.invalidateQueries({ queryKey: itemKeys.lists() });
  void queryClient.invalidateQueries({ queryKey: accessoryStockKeys.lists() });
}

/** Creates a batch and invalidates the batch lists. */
export function useCreateBatch() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (payload: CreateBatchPayload) => {
      const { data } = await api.post<BatchSummary>('/batches', payload);
      return data;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: batchKeys.lists() });
    },
  });
}

/** Updates a batch (date, note, and for manage_prices: extra costs) — invalidates detail + lists. */
export function useUpdateBatch() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, payload }: { id: number; payload: UpdateBatchPayload }) => {
      const { data } = await api.patch<Batch>(`/batches/${id}`, payload);
      return data;
    },
    onSuccess: (_, variables) => invalidateAfterBatchWrite(queryClient, variables.id),
  });
}

/** Adds one device line to a batch; refreshes the batch, item and accessory-stock lists. */
export function useAddBatchItem() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, payload }: { id: number; payload: AddBatchItemPayload }) => {
      const { data } = await api.post<Item>(`/batches/${id}/items`, payload);
      return data;
    },
    onSuccess: (_, variables) => invalidateAfterBatchWrite(queryClient, variables.id),
  });
}

/** Adds one accessory line to a batch; same refresh set as useAddBatchItem. */
export function useAddBatchAccessory() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, payload }: { id: number; payload: AddBatchAccessoryPayload }) => {
      const { data } = await api.post<AccessoryStock>(`/batches/${id}/accessories`, payload);
      return data;
    },
    onSuccess: (_, variables) => invalidateAfterBatchWrite(queryClient, variables.id),
  });
}

/** Sets the unit price of one batch line (manage_prices); refreshes the batch and item lists. */
export function useUpdateBatchLine() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      id,
      lineId,
      payload,
    }: {
      id: number;
      lineId: number;
      payload: UpdateBatchLinePayload;
    }) => {
      const { data } = await api.patch<BatchLine>(`/batches/${id}/lines/${lineId}`, payload);
      return data;
    },
    onSuccess: (_, variables) => invalidateAfterBatchWrite(queryClient, variables.id),
  });
}

/** Reprices every line of one model (manage_prices); same refresh set as a priced line. */
export function usePriceBatchModel() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, payload }: { id: number; payload: RepriceModelPayload }) => {
      const { data } = await api.patch<Batch>(`/batches/${id}/lines`, payload);
      return data;
    },
    onSuccess: (_, variables) => invalidateAfterBatchWrite(queryClient, variables.id),
  });
}

/** Removes one batch line (delete_records); the server deletes the item or trims stock. */
export function useRemoveBatchLine() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, lineId }: { id: number; lineId: number }) => {
      await api.delete(`/batches/${id}/lines/${lineId}`);
    },
    onSuccess: (_, variables) => invalidateAfterBatchWrite(queryClient, variables.id),
  });
}
