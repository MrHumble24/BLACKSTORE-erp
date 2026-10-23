import { useTranslation } from 'react-i18next';
import { DateRangeInputs } from '@/shared/ui';
import { useInvestors } from '@/entities/investor';
import { useLocations } from '@/entities/location';
import { useCategories } from '@/entities/category';
import type { ProfitReportFilters } from '@/entities/report';
import { FilterSelect } from './FilterSelect';

interface SelectDropdownsProps {
  filters: ProfitReportFilters;
  onChange: (filters: ProfitReportFilters) => void;
}

function SelectDropdowns({ filters, onChange }: SelectDropdownsProps) {
  const { t } = useTranslation();
  const { data: investors } = useInvestors();
  const { data: locations } = useLocations();
  const { data: categories } = useCategories();

  const investorOptions = (investors ?? []).map((i) => ({ value: String(i.id), label: i.name }));
  const locationOptions = (locations ?? []).map((l) => ({ value: String(l.id), label: l.name }));
  const categoryOptions = (categories ?? []).map((c) => ({ value: String(c.id), label: c.name }));

  return (
    <>
      <FilterSelect
        value={filters.investorId ? String(filters.investorId) : 'ALL'}
        placeholder={t('reports.allInvestors')}
        onChange={(val) => onChange({ ...filters, investorId: val === 'ALL' ? undefined : Number(val) })}
        options={investorOptions}
      />
      <FilterSelect
        value={filters.locationId ? String(filters.locationId) : 'ALL'}
        placeholder={t('reports.allLocations')}
        onChange={(val) => onChange({ ...filters, locationId: val === 'ALL' ? undefined : Number(val) })}
        options={locationOptions}
      />
      <FilterSelect
        value={filters.categoryId ? String(filters.categoryId) : 'ALL'}
        placeholder={t('reports.allCategories')}
        onChange={(val) => onChange({ ...filters, categoryId: val === 'ALL' ? undefined : Number(val) })}
        options={categoryOptions}
      />
    </>
  );
}

interface ProfitReportFilterControlsProps {
  filters: ProfitReportFilters;
  onChange: (filters: ProfitReportFilters) => void;
}

/** Controls for filtering profit report by date range, investor, location and category. */
export function ProfitReportFilterControls({
  filters,
  onChange,
}: ProfitReportFilterControlsProps) {
  return (
    <div className="flex flex-wrap items-center gap-3">
      <DateRangeInputs
        from={filters.from}
        to={filters.to}
        onChange={({ from, to }) => onChange({ ...filters, from, to })}
      />
      <SelectDropdowns filters={filters} onChange={onChange} />
    </div>
  );
}
