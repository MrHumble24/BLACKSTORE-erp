import { useQuery } from '@tanstack/react-query';
import { api } from '@/shared/api';
import type { Page } from '@/shared/types';
import type { AuditEntry, AuditFilters } from '../model/types';

export const AUDIT_LOG_PAGE_SIZE = 20;

export const auditLogKeys = {
  all: ['audit-log'] as const,
  list: (filters: AuditFilters, page: number) => [...auditLogKeys.all, 'list', { filters, page }] as const,
};

/** Paginated audit log, newest first; filters are exact matches (view_audit_log, Admin). */
export function useAuditLog(filters: AuditFilters, page = 1) {
  return useQuery({
    queryKey: auditLogKeys.list(filters, page),
    queryFn: async () => {
      const params: Record<string, string> = { page: String(page), pageSize: String(AUDIT_LOG_PAGE_SIZE) };
      if (filters.entity) params.entity = filters.entity;
      if (filters.entityId) params.entityId = String(filters.entityId);
      if (filters.userId) params.userId = String(filters.userId);
      if (filters.action) params.action = filters.action;
      if (filters.from) params.from = filters.from;
      if (filters.to) params.to = filters.to;
      const { data } = await api.get<Page<AuditEntry>>('/audit-log', { params });
      return data;
    },
  });
}
