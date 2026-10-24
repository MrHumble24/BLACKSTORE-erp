import { useQuery } from '@tanstack/react-query';
import { api } from '@/shared/api';
import type { DashboardSummary } from '../model/types';

export const dashboardKeys = {
  all: ['dashboard'] as const,
  summary: () => [...dashboardKeys.all, 'summary'] as const,
};

/** Fetch the role-masked home dashboard snapshot (today's sales, stock, debts, partners). */
export function useDashboardSummary() {
  return useQuery({
    queryKey: dashboardKeys.summary(),
    queryFn: async () => {
      const { data } = await api.get<DashboardSummary>('/dashboard/summary');
      return data;
    },
  });
}
