import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/shared/api';
import type { Page } from '@/shared/types';
import { dashboardKeys } from '@/entities/dashboard';
import type { Match, MatchFilters, MatchStatus } from '../model/types';

export const matchKeys = {
  all: ['matches'] as const,
  lists: () => [...matchKeys.all, 'list'] as const,
  list: (filters: MatchFilters) => [...matchKeys.lists(), filters] as const,
};

/** Fetch a page of offers, newest first; polls every 15 s so new offers appear without reload. */
export function useMatches(filters: MatchFilters) {
  return useQuery({
    queryKey: matchKeys.list(filters),
    queryFn: async () => {
      const { data } = await api.get<Page<Match>>('/matches', { params: filters });
      return data;
    },
    refetchInterval: 15000,
  });
}

/** Refreshes offer lists and the home "new offers" counter after a change. */
function useInvalidateMatches() {
  const queryClient = useQueryClient();
  return () => {
    void queryClient.invalidateQueries({ queryKey: matchKeys.all });
    void queryClient.invalidateQueries({ queryKey: dashboardKeys.summary() });
  };
}

/** Moves an offer to the next status (PATCH /matches/:id/status); the server enforces transitions. */
export function useChangeMatchStatus() {
  const invalidate = useInvalidateMatches();
  return useMutation({
    mutationFn: async ({ id, status }: { id: number; status: MatchStatus }) => {
      const { data } = await api.patch<Match>(`/matches/${id}/status`, { status });
      return data;
    },
    onSuccess: invalidate,
  });
}

/** Saves the owner's note on an offer (PATCH /matches/:id). */
export function useUpdateMatchNote() {
  const invalidate = useInvalidateMatches();
  return useMutation({
    mutationFn: async ({ id, note }: { id: number; note: string }) => {
      const { data } = await api.patch<Match>(`/matches/${id}`, { note });
      return data;
    },
    onSuccess: invalidate,
  });
}
