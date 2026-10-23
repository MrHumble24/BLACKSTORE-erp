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
import { InvestorReportTable } from './InvestorReportTable';
import { FilterSelect } from './FilterSelect';

function getDefaultMonth() {
  const today = getTodayIso();
  return today.slice(0, 7);
}

interface InvestorReportFiltersProps {
  month: string;
  onMonthChange: (m: string) => void;
  investorId?: number;
  onInvestorChange: (id?: number) => void;
}

function InvestorReportFilters({
  month,
  onMonthChange,
  investorId,
  onInvestorChange,
}: InvestorReportFiltersProps) {
  const { t } = useTranslation();
  const { data: investors } = useInvestors();

  return (
    <div className="flex flex-wrap items-center gap-3">
      <Input
        type="month"
        value={month}
        onChange={(e) => onMonthChange(e.target.value)}
        className="w-40 h-8 text-xs rounded-full"
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
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      <ReportsNavTabs />
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-ink">
            {t('reports.investorReport')}
          </h1>
          <p className="text-xs text-slate mt-0.5">{t('reports.investorSubtitle')}</p>
        </div>
        <a
          href={excelUrl}
          download
          className="inline-flex items-center gap-1.5 h-8 px-4 rounded-full text-xs font-medium bg-control-gray hover:bg-control-gray/80 text-ink transition-colors border border-hairline-silver/70 shadow-sm"
        >
          <Download className="h-3.5 w-3.5" />
          <span>{t('reports.exportExcel')}</span>
        </a>
      </div>
      <InvestorReportFilters
        month={month}
        onMonthChange={setMonth}
        investorId={investorId}
        onInvestorChange={setInvestorId}
      />
      {isLoading ? (
        <div className="p-12 text-center text-xs text-slate">{t('common.loading')}</div>
      ) : report ? (
        <InvestorReportTable report={report} canViewCost={canViewCost} />
      ) : null}
    </div>
  );
}
