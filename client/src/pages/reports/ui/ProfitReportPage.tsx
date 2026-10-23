import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Download } from 'lucide-react';
import { TablePagination } from '@/shared/ui';
import { API_BASE_URL } from '@/shared/api';
import { getTodayIso } from '@/shared/lib';
import { useAuthStore } from '@/entities/session';
import { useProfitReport, type ProfitReportFilters, type ProfitReport } from '@/entities/report';
import { ReportsNavTabs } from './ReportsNavTabs';
import { ReportPageHeader } from './ReportPageHeader';
import { ProfitReportFilterControls } from './ProfitReportFilterControls';
import { ProfitKpiBand } from './ProfitKpiBand';
import { ProfitStatementCard } from './ProfitStatementCard';
import { ProfitTrendsChart } from './ProfitTrendsChart';
import { ProfitWaterfall } from './ProfitWaterfall';
import { ProfitMarginGauge } from './ProfitMarginGauge';
import { ProfitShareDonut } from './ProfitShareDonut';
import { ProfitRankChart } from './ProfitRankChart';
import { ProfitHeatmap } from './ProfitHeatmap';
import { ProfitLowMargin } from './ProfitLowMargin';
import { ProfitGroupTables } from './ProfitGroupTables';
import { ProfitLinesTable } from './ProfitLinesTable';
import { ReportSkeleton } from './ReportSkeleton';

/** Builds the profit Excel export URL carrying the active filters (cookie-authed, like the investor export). */
function buildExcelUrl(filters: ProfitReportFilters): string {
  const params = new URLSearchParams();
  if (filters.from) params.set('from', filters.from);
  if (filters.to) params.set('to', filters.to);
  if (filters.investorId) params.set('investorId', String(filters.investorId));
  if (filters.locationId) params.set('locationId', String(filters.locationId));
  if (filters.categoryId) params.set('categoryId', String(filters.categoryId));
  return `${API_BASE_URL}/reports/profit.xlsx?${params}`;
}

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

/** Dashboard body: KPI band, trends + waterfall, category/product ranks, breakdowns and lines. */
function ProfitReportContent({ report, canViewCost, page, onPageChange }: ProfitReportContentProps) {
  const { t } = useTranslation();
  const totalPages = Math.max(1, Math.ceil(report.lines.total / report.lines.pageSize));

  return (
    <div className="space-y-4">
      <ProfitKpiBand totals={report.totals} previous={report.previous} summary={report.summary} dailyTrends={report.dailyTrends} />

      {/* Analytics bento: trends + waterfall, shares, ranks, activity + watchlist, breakdown. */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-6">
        <div className="lg:col-span-4">
          <ProfitTrendsChart dailyTrends={report.dailyTrends} previousTrends={report.previousTrends} canViewCost={canViewCost} />
        </div>
        <div className="lg:col-span-2">
          <ProfitWaterfall totals={report.totals} />
        </div>

        <div className="lg:col-span-2">
          <ProfitMarginGauge totals={report.totals} previous={report.previous} />
        </div>
        <div className="lg:col-span-2">
          <ProfitShareDonut title={t('reports.salesByCategory')} groups={report.byCategory} centerCaption={t('reports.sales')} />
        </div>
        <div className="lg:col-span-2">
          <ProfitShareDonut title={t('reports.salesByLocation')} groups={report.byLocation} centerCaption={t('reports.sales')} />
        </div>

        <div className="lg:col-span-3">
          <ProfitRankChart title={t('reports.categoryDistribution')} groups={report.byCategory} />
        </div>
        <div className="lg:col-span-3">
          <ProfitRankChart title={t('reports.topByProfit')} groups={report.topModels} />
        </div>

        <div className="lg:col-span-4">
          <ProfitHeatmap heatmap={report.heatmap} />
        </div>
        <div className="lg:col-span-2">
          <ProfitLowMargin lines={report.lowMargin} />
        </div>

        <div className="lg:col-span-2">
          <ProfitStatementCard totals={report.totals} canViewCost={canViewCost} />
        </div>
        <div className="lg:col-span-4">
          <ProfitGroupTables byInvestor={report.byInvestor} byLocation={report.byLocation} byCategory={report.byCategory} />
        </div>
      </div>

      <ProfitLinesTable lines={report.lines.items} canViewCost={canViewCost} />
      {report.lines.total > 0 && (
        <TablePagination page={page} totalPages={totalPages} total={report.lines.total} onPageChange={onPageChange} />
      )}
    </div>
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
        <ReportPageHeader
          title={t('reports.profitReport')}
          subtitle={t('reports.profitSubtitle')}
          actions={
            <a
              href={buildExcelUrl(filters)}
              download
              className="inline-flex items-center gap-1.5 rounded-full border border-hairline-silver bg-gallery-white px-4 py-1.5 text-xs font-medium text-ink shadow-xs transition-colors hover:bg-studio-mist"
            >
              <Download className="h-3.5 w-3.5" />
              <span>{t('reports.exportExcel')}</span>
            </a>
          }
        />
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
        <ProfitReportContent report={report} canViewCost={canViewCost} page={page} onPageChange={setPage} />
      ) : null}
    </div>
  );
}
