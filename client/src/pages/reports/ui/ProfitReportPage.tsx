import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { TablePagination } from '@/shared/ui';
import { getTodayIso } from '@/shared/lib';
import { useAuthStore } from '@/entities/session';
import { useProfitReport, type ProfitReportFilters, type ProfitReport } from '@/entities/report';
import { ReportsNavTabs } from './ReportsNavTabs';
import { ProfitReportFilterControls } from './ProfitReportFilterControls';
import { ProfitReportTotalsCards } from './ProfitReportTotalsCards';
import { ProfitGroupTables } from './ProfitGroupTables';
import { ProfitLinesTable } from './ProfitLinesTable';

function getDefaultRange() {
  const today = getTodayIso();
  return { from: `${today.slice(0, 7)}-01`, to: today };
}

interface ProfitReportContentProps {
  report: ProfitReport;
  canViewCost: boolean;
  page: number;
  onPageChange: (p: number) => void;
}

function ProfitReportContent({
  report,
  canViewCost,
  page,
  onPageChange,
}: ProfitReportContentProps) {
  const totalPages = Math.max(1, Math.ceil(report.lines.total / report.lines.pageSize));

  return (
    <>
      <ProfitReportTotalsCards totals={report.totals} canViewCost={canViewCost} />
      <ProfitGroupTables
        byInvestor={report.byInvestor}
        byLocation={report.byLocation}
        byCategory={report.byCategory}
      />
      <ProfitLinesTable lines={report.lines.items} canViewCost={canViewCost} />
      {report.lines.total > 0 && (
        <TablePagination
          page={page}
          totalPages={totalPages}
          total={report.lines.total}
          onPageChange={onPageChange}
        />
      )}
    </>
  );
}

/** Profit and loss overview page aggregating sales, returns, investor shares and net profit. */
export function ProfitReportPage() {
  const { t } = useTranslation();
  const canViewCost = useAuthStore((s) => s.hasPermission('view_cost'));

  const [filters, setFilters] = useState<ProfitReportFilters>(getDefaultRange);
  const [page, setPage] = useState(1);

  const { data: report, isLoading } = useProfitReport(filters, page, 20);

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      <ReportsNavTabs />
      <div>
        <h1 className="text-xl font-bold tracking-tight text-ink">{t('reports.profitReport')}</h1>
        <p className="text-xs text-slate mt-0.5">{t('reports.profitSubtitle')}</p>
      </div>
      <ProfitReportFilterControls
        filters={filters}
        onChange={(newFilters) => {
          setFilters(newFilters);
          setPage(1);
        }}
      />
      {isLoading ? (
        <div className="p-12 text-center text-xs text-slate">{t('common.loading')}</div>
      ) : report ? (
        <ProfitReportContent
          report={report}
          canViewCost={canViewCost}
          page={page}
          onPageChange={setPage}
        />
      ) : null}
    </div>
  );
}
