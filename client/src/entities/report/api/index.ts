import { useQuery } from '@tanstack/react-query';
import { api } from '@/shared/api';
import type {
  ProfitReport,
  ProfitReportFilters,
  InvestorReport,
} from '../model/types';

export const reportKeys = {
  all: ['reports'] as const,
  profit: (filters: ProfitReportFilters, page: number, pageSize: number) =>
    [...reportKeys.all, 'profit', { filters, page, pageSize }] as const,
  investors: (month: string, investorId?: number) =>
    [...reportKeys.all, 'investors', { month, investorId }] as const,
};

function buildProfitQueryParams(filters: ProfitReportFilters, page: number, pageSize: number) {
  const params: Record<string, string> = {
    page: String(page),
    pageSize: String(pageSize),
  };
  if (filters.from) params.from = filters.from;
  if (filters.to) params.to = filters.to;
  if (filters.investorId) params.investorId = String(filters.investorId);
  if (filters.locationId) params.locationId = String(filters.locationId);
  if (filters.categoryId) params.categoryId = String(filters.categoryId);
  return params;
}

/** Fetch profit report with totals, groupings and paginated lines. */
export function useProfitReport(
  filters: ProfitReportFilters = {},
  page = 1,
  pageSize = 20,
) {
  return useQuery({
    queryKey: reportKeys.profit(filters, page, pageSize),
    queryFn: async () => {
      const params = buildProfitQueryParams(filters, page, pageSize);
      const { data } = await api.get<ProfitReport>('/reports/profit', { params });
      return data;
    },
  });
}

/** Fetch monthly investor performance report. */
export function useInvestorReport(month: string, investorId?: number) {
  return useQuery({
    queryKey: reportKeys.investors(month, investorId),
    queryFn: async () => {
      const params: Record<string, string> = { month };
      if (investorId) params.investorId = String(investorId);
      const { data } = await api.get<InvestorReport>('/reports/investors', { params });
      return data;
    },
    enabled: Boolean(month),
  });
}
