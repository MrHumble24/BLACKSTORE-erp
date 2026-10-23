import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Download } from 'lucide-react';
import { Input } from '@/shared/ui';
import { API_BASE_URL } from '@/shared/api';
import { getTodayIso } from '@/shared/lib';
import { useAuthStore } from '@/entities/session';
import { useInvestors } from '@/entities/investor';
import { useInvestorReport } from '@/entities/report';
import { ReportsNavTabs } from './ReportsNavTabs';
import { ReportPageHeader } from './ReportPageHeader';
import { InvestorSummaryStrip } from './InvestorSummaryStrip';
import { InvestorReportTable } from './InvestorReportTable';
import { FilterSelect } from './FilterSelect';
import { ReportSkeleton } from './ReportSkeleton';

function getDefaultMonth() {
  return getTodayIso().slice(0, 7);
}

interface InvestorReportFiltersProps {
  month: string;
  onMonthChange: (m: string) => void;
  investorId?: number;
  onInvestorChange: (id?: number) => void;
}

function InvestorReportFilters({ month, onMonthChange, investorId, onInvestorChange }: InvestorReportFiltersProps) {
  const { t } = useTranslation();
  const { data: investors } = useInvestors();

  return (
    <div className="flex flex-wrap items-center gap-2">
      <Input
        type="month"
        value={month}
        onChange={(e) => onMonthChange(e.target.value)}
        className="w-40 h-8 text-xs"
      />
      <FilterSelect
        value={investorId ? String(investorId) : 'ALL'}
        placeholder={t('reports.allInvestors')}
        onChange={(val) => onInvestorChange(val === 'ALL' ? undefined : Number(val))}
        options={(investors ?? []).map((inv) => ({ value: String(inv.id), label: inv.name }))}
      />
    </div>
  );
}

/** Monthly investor profit breakdown report with Excel export capability. */
export function InvestorReportPage() {
  const { t } = useTranslation();
  const canViewCost = useAuthStore((s) => s.hasPermission('view_cost'));

  const [month, setMonth] = useState(getDefaultMonth);
  const [investorId, setInvestorId] = useState<number | undefined>(undefined);

  const { data: report, isLoading } = useInvestorReport(month, investorId);

  const params = new URLSearchParams({ month });
  if (investorId) params.set('investorId', String(investorId));
  const excelUrl = `${API_BASE_URL}/reports/investors.xlsx?${params}`;

  return (
    <div className="space-y-6">
      <div className="space-y-4">
        <ReportsNavTabs />
        <ReportPageHeader
          title={t('reports.investorReport')}
          subtitle={t('reports.investorSubtitle')}
          actions={
            <a
              href={excelUrl}
              download
              className="inline-flex items-center gap-1.5 rounded-full border border-hairline-silver bg-gallery-white px-4 py-1.5 text-xs font-medium text-ink shadow-xs transition-colors hover:bg-studio-mist"
            >
              <Download className="h-3.5 w-3.5" />
              <span>{t('reports.exportExcel')}</span>
            </a>
          }
        />
        <InvestorReportFilters
          month={month}
          onMonthChange={setMonth}
          investorId={investorId}
          onInvestorChange={setInvestorId}
        />
      </div>
      {isLoading ? (
        <ReportSkeleton variant="investor" />
      ) : report ? (
        <>
          <InvestorSummaryStrip totals={report.totals} />
          <InvestorReportTable report={report} canViewCost={canViewCost} />
        </>
      ) : null}
    </div>
  );
}
