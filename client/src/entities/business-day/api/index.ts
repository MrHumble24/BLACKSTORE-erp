import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/shared/api';
import type { Page } from '@/shared/types';
import type {
  CloseDayPayload, ClosedDaySnapshot, CurrentBusinessDay, UpdateBusinessDayPayload,
} from '../model/types';

const BASE = '/business-day';

/** Rows per page of the closed days history. */
export const CLOSED_DAYS_PAGE_SIZE = 20;

export const businessDayKeys = {
  all: ['business-day'] as const,
  current: () => [...businessDayKeys.all, 'current'] as const,
  closed: (page: number) => [...businessDayKeys.all, 'closed', page] as const,
};

/** The current OPEN day with live expected cash/card and the review lists; close_day only. */
export function useCurrentBusinessDay() {
  return useQuery({
    queryKey: businessDayKeys.current(),
    queryFn: async () => {
      const { data } = await api.get<CurrentBusinessDay>(`${BASE}/current`);
      return data;
    },
  });
}

/** One page of CLOSED days, newest first (frozen close-time snapshots); close_day only. */
export function useClosedDays(page: number) {
  return useQuery({
    queryKey: businessDayKeys.closed(page),
    queryFn: async () => {
      const { data } = await api.get<Page<ClosedDaySnapshot>>(BASE, {
        params: { page, pageSize: CLOSED_DAYS_PAGE_SIZE },
      });
      return data;
    },
  });
}

/** Closes the current day (freezes the snapshot, auto-opens the next); refreshes current day and history. */
export function useCloseDay() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (payload: CloseDayPayload) => {
      const { data } = await api.post<ClosedDaySnapshot>(`${BASE}/close`, payload);
      return data;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: businessDayKeys.all });
    },
  });
}

/** Corrects a closed day's counted cash/card and note; the server recomputes the variances. */
export function useUpdateBusinessDay() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...payload }: UpdateBusinessDayPayload & { id: number }) => {
      const { data } = await api.patch<ClosedDaySnapshot>(`${BASE}/${id}`, payload);
      return data;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: businessDayKeys.all });
    },
  });
}
