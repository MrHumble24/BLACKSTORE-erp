import { useTranslation } from 'react-i18next';
import { DateRangeInputs } from '@/shared/ui';
import { cn, getTodayIso } from '@/shared/lib';
import { useInvestors } from '@/entities/investor';
import { useLocations } from '@/entities/location';
import { useCategories } from '@/entities/category';
import type { ProfitReportFilters } from '@/entities/report';
import { FilterSelect } from './FilterSelect';

type Preset = 'thisMonth' | 'last30Days';

interface SelectDropdownsProps {
  filters: ProfitReportFilters;
  onChange: (filters: ProfitReportFilters) => void;
}

function SelectDropdowns({ filters, onChange }: SelectDropdownsProps) {
  const { t } = useTranslation();
  const { data: investors } = useInvestors();
  const { data: locations } = useLocations();
  const { data: categories } = useCategories();

  return (
    <>
      <FilterSelect
        value={filters.investorId ? String(filters.investorId) : 'ALL'}
        placeholder={t('reports.allInvestors')}
        onChange={(val) => onChange({ ...filters, investorId: val === 'ALL' ? undefined : Number(val) })}
        options={(investors ?? []).map((i) => ({ value: String(i.id), label: i.name }))}
      />
      <FilterSelect
        value={filters.locationId ? String(filters.locationId) : 'ALL'}
        placeholder={t('reports.allLocations')}
        onChange={(val) => onChange({ ...filters, locationId: val === 'ALL' ? undefined : Number(val) })}
        options={(locations ?? []).map((l) => ({ value: String(l.id), label: l.name }))}
      />
      <FilterSelect
        value={filters.categoryId ? String(filters.categoryId) : 'ALL'}
        placeholder={t('reports.allCategories')}
        onChange={(val) => onChange({ ...filters, categoryId: val === 'ALL' ? undefined : Number(val) })}
        options={(categories ?? []).map((c) => ({ value: String(c.id), label: c.name }))}
      />
    </>
  );
}

function getPresetRange(preset: Preset): { from: string; to: string } {
  const todayIso = getTodayIso();
  if (preset === 'thisMonth') {
    return { from: `${todayIso.slice(0, 7)}-01`, to: todayIso };
  }
  const past = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
  const pastIso = `${past.getFullYear()}-${String(past.getMonth() + 1).padStart(2, '0')}-${String(past.getDate()).padStart(2, '0')}`;
  return { from: pastIso, to: todayIso };
}

/** Highlights the preset chip whose range matches the current filters. */
function getActivePreset(filters: ProfitReportFilters): Preset | null {
  const thisMonth = getPresetRange('thisMonth');
  const last30 = getPresetRange('last30Days');
  if (filters.from === thisMonth.from && filters.to === thisMonth.to) return 'thisMonth';
  if (filters.from === last30.from && filters.to === last30.to) return 'last30Days';
  return null;
}

interface ProfitReportFilterControlsProps {
  filters: ProfitReportFilters;
  onChange: (filters: ProfitReportFilters) => void;
}

/** Report filter bar: date preset segments + range on the left, entity selects on the right. */
export function ProfitReportFilterControls({ filters, onChange }: ProfitReportFilterControlsProps) {
  const { t } = useTranslation();
  const activePreset = getActivePreset(filters);

  const presets: Array<{ id: Preset; label: string }> = [
    { id: 'thisMonth', label: t('reports.thisMonth', 'This month') },
    { id: 'last30Days', label: t('reports.last30Days', 'Last 30 days') },
  ];

  return (
    <div className="flex flex-wrap items-end justify-between gap-x-3 gap-y-3">
      <div className="flex flex-wrap items-center gap-x-2 gap-y-2">
        <div className="inline-flex items-center gap-1 rounded-full bg-studio-mist p-1">
          {presets.map((preset) => (
            <button
              key={preset.id}
              type="button"
              onClick={() => onChange({ ...filters, ...getPresetRange(preset.id) })}
              aria-pressed={activePreset === preset.id}
              className={cn(
                'cursor-pointer rounded-full px-3 py-1.5 text-xs font-medium transition-all',
                activePreset === preset.id ? 'bg-gallery-white text-ink shadow-xs' : 'text-slate hover:text-ink',
              )}
            >
              {preset.label}
            </button>
          ))}
        </div>
        <DateRangeInputs
          from={filters.from}
          to={filters.to}
          onChange={({ from, to }) => onChange({ ...filters, from, to })}
        />
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <SelectDropdowns filters={filters} onChange={onChange} />
      </div>
    </div>
  );
}
