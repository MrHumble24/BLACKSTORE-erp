import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/shared/api';
import type { Page } from '@/shared/types';
import type { Watch, CreateWatchPayload, UpdateWatchPayload } from '../model/types';

export const watchKeys = {
  all: ['watches'] as const,
  lists: () => [...watchKeys.all, 'list'] as const,
  list: (page = 1, pageSize = 20) => [...watchKeys.lists(), { page, pageSize }] as const,
};

/** Fetch a page of watches (manage_watches). */
export function useWatches(page = 1, pageSize = 20) {
  return useQuery({
    queryKey: watchKeys.list(page, pageSize),
    queryFn: async () => {
      const { data } = await api.get<Page<Watch>>('/watches', {
        params: { page: String(page), pageSize: String(pageSize) },
      });
      return data;
    },
  });
}

/** Creates a watch and refreshes the watch lists. */
export function useCreateWatch() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (payload: CreateWatchPayload) => {
      const { data } = await api.post<Watch>('/watches', payload);
      return data;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: watchKeys.all });
    },
  });
}

/** Updates a watch (fields or isActive) and refreshes the watch lists. */
export function useUpdateWatch() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, payload }: { id: number; payload: UpdateWatchPayload }) => {
      const { data } = await api.patch<Watch>(`/watches/${id}`, payload);
      return data;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: watchKeys.all });
    },
  });
}
