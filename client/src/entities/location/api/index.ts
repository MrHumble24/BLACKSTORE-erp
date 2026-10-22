import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/shared/api';
import type { Location, CreateLocationPayload, UpdateLocationPayload } from '../model/types';

export const locationKeys = {
  all: ['locations'] as const,
  list: (all?: boolean) => [...locationKeys.all, 'list', { all }] as const,
};

/**
 * Fetch locations list. Defaults to active only; pass `all: true` to get inactive as well.
 */
export function useLocations(all = false) {
  return useQuery({
    queryKey: locationKeys.list(all),
    queryFn: async () => {
      const { data } = await api.get<Location[]>('/locations', {
        params: all ? { all: 'true' } : undefined,
      });
      return data;
    },
  });
}

/** Creates a location and invalidates the locations list. */
export function useCreateLocation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (payload: CreateLocationPayload) => {
      const { data } = await api.post<Location>('/locations', payload);
      return data;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: locationKeys.all });
    },
  });
}

/** Updates a location (name, type or isActive) and invalidates the locations list. */
export function useUpdateLocation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, payload }: { id: number; payload: UpdateLocationPayload }) => {
      const { data } = await api.patch<Location>(`/locations/${id}`, payload);
      return data;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: locationKeys.all });
    },
  });
}
