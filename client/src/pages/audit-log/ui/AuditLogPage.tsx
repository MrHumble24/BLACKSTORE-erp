import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { TablePagination } from '@/shared/ui';
import { useAuditLog, AUDIT_LOG_PAGE_SIZE, type AuditFilters } from '@/entities/audit-log';
import { AuditLogFilters } from './AuditLogFilters';
import { AuditLogTable } from './AuditLogTable';

/** Read-only audit log with exact-match filters and expandable before/after (view_audit_log). */
export function AuditLogPage() {
  const { t } = useTranslation();
  const [filters, setFilters] = useState<AuditFilters>({});
  const [page, setPage] = useState(1);

  const { data, isLoading } = useAuditLog(filters, page);
  const totalPages = Math.ceil((data?.total ?? 0) / AUDIT_LOG_PAGE_SIZE) || 1;

  const onFilterChange = (next: AuditFilters) => {
    setFilters(next);
    setPage(1);
  };

  return (
    <div className="space-y-6">
      <div className="space-y-1">
        <h1 className="text-2xl md:text-3xl font-semibold font-sf-pro-display tracking-tight text-ink">
          {t('auditLog.title')}
        </h1>
        <p className="text-xs text-slate">{t('auditLog.subtitle')}</p>
      </div>

      <AuditLogFilters filters={filters} onChange={onFilterChange} />
      <AuditLogTable entries={data?.items ?? []} isLoading={isLoading} />
      <TablePagination page={page} totalPages={totalPages} total={data?.total ?? 0} onPageChange={setPage} />
    </div>
  );
}
