import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { TablePagination } from '@/shared/ui';
import { getTodayIso } from '@/shared/lib';
import { useAuthStore } from '@/entities/session';
import { useProfitReport, type ProfitReportFilters, type ProfitReport } from '@/entities/report';
import { ReportsNavTabs } from './ReportsNavTabs';
import { ReportPageHeader } from './ReportPageHeader';
import { ProfitReportFilterControls } from './ProfitReportFilterControls';
import { ProfitReportTotalsCards } from './ProfitReportTotalsCards';
import { ProfitTrendsChart } from './ProfitTrendsChart';
import { ProfitDistributionCharts } from './ProfitDistributionCharts';
import { ProfitGroupTables } from './ProfitGroupTables';
import { ProfitLinesTable } from './ProfitLinesTable';
import { ReportSkeleton } from './ReportSkeleton';

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

function ProfitReportContent({ report, canViewCost, page, onPageChange }: ProfitReportContentProps) {
  const totalPages = Math.max(1, Math.ceil(report.lines.total / report.lines.pageSize));

  return (
    <>
      <ProfitReportTotalsCards
        totals={report.totals}
        dailyTrends={report.dailyTrends}
        canViewCost={canViewCost}
      />
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <ProfitTrendsChart dailyTrends={report.dailyTrends} canViewCost={canViewCost} />
        </div>
        <div className="lg:col-span-1">
          <ProfitDistributionCharts byCategory={report.byCategory} />
        </div>
      </div>
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
    <div className="space-y-6">
      <div className="space-y-4">
        <ReportsNavTabs />
        <ReportPageHeader title={t('reports.profitReport')} subtitle={t('reports.profitSubtitle')} />
        <ProfitReportFilterControls
          filters={filters}
          onChange={(newFilters) => {
            setFilters(newFilters);
            setPage(1);
          }}
        />
      </div>
      {isLoading ? (
        <ReportSkeleton variant="profit" />
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
