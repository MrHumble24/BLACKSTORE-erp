import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/shared/api';
import type { CloseDayPayload, ClosedDaySnapshot, CurrentBusinessDay } from '../model/types';

const BASE = '/business-day';

export const businessDayKeys = {
  all: ['business-day'] as const,
  current: () => [...businessDayKeys.all, 'current'] as const,
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

/** Closes the current day (freezes the snapshot, auto-opens the next); refreshes the current day. */
export function useCloseDay() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (payload: CloseDayPayload) => {
      const { data } = await api.post<ClosedDaySnapshot>(`${BASE}/close`, payload);
      return data;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: businessDayKeys.current() });
    },
  });
}
