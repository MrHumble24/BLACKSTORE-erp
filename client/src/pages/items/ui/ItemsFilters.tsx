import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Search, X, RotateCcw } from 'lucide-react';
import {
  Input,
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
  Button,
  Badge,
} from '@/shared/ui';
import { useCategories } from '@/entities/category';
import { useLocations } from '@/entities/location';
import { useInvestors } from '@/entities/investor';
import type { ItemFilters, ItemStatus } from '@/entities/item';

interface ItemsFiltersProps {
  filters: ItemFilters;
  onChange: (filters: ItemFilters) => void;
}

const ALL_STATUSES: ItemStatus[] = [
  'IN_STOCK',
  'AT_PARTNER',
  'DEBT',
  'SOLD',
  'RETURNED',
  'DEFECTIVE',
];

interface FilterSelectProps {
  value: string;
  placeholder: string;
  onChange: (value: string) => void;
  options: { value: string; label: string }[];
}

function FilterSelect({ value, placeholder, onChange, options }: FilterSelectProps) {
  const isFiltered = value !== 'ALL';

  return (
    <div className="w-full sm:w-auto">
      <Select value={value} onValueChange={onChange}>
        <SelectTrigger
          className={`h-8 text-xs rounded-full border-hairline-silver/70 transition-colors w-full sm:w-auto sm:min-w-[10rem] [&>span]:truncate ${
            isFiltered ? 'bg-studio-mist font-medium text-ink border-steel/60' : 'bg-gallery-white text-slate'
          }`}
        >
          <SelectValue placeholder={placeholder} />
        </SelectTrigger>
        <SelectContent>
          {options.map((opt) => (
            <SelectItem key={opt.value} value={opt.value}>
              {opt.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}

function SearchFilterInput({
  initialValue,
  onSubmit,
  placeholder,
}: {
  initialValue: string;
  onSubmit: (v: string) => void;
  placeholder: string;
}) {
  const [value, setValue] = useState(initialValue);

  const handleApply = () => {
    onSubmit(value.trim());
  };

  const handleClear = () => {
    setValue('');
    onSubmit('');
  };

  return (
    <div className="relative flex items-center w-full sm:w-auto">
      <Search className="absolute left-3 h-3.5 w-3.5 text-slate pointer-events-none" />
      <Input
        placeholder={placeholder}
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter') {
            e.preventDefault();
            handleApply();
          }
        }}
        onBlur={handleApply}
        className="w-full sm:w-56 md:w-64 h-8 pl-8 pr-7 text-xs rounded-full bg-studio-mist/40 border-hairline-silver/70 focus:bg-gallery-white"
      />
      {value && (
        <button
          type="button"
          onClick={handleClear}
          className="absolute right-2.5 p-0.5 rounded-full text-slate hover:text-ink transition-colors cursor-pointer"
        >
          <X className="h-3 w-3" />
        </button>
      )}
    </div>
  );
}

/** Filter controls toolbar for the items inventory table. */
export function ItemsFilters({ filters, onChange }: ItemsFiltersProps) {
  const { t } = useTranslation();

  const { data: categories = [] } = useCategories();
  const { data: locations = [] } = useLocations();
  const { data: investors = [] } = useInvestors();

  const handleSearchSubmit = (value: string) => {
    if (value !== (filters.search ?? '')) {
      onChange({ ...filters, search: value || undefined });
    }
  };

  const activeFiltersCount = [
    Boolean(filters.search),
    Boolean(filters.status),
    Boolean(filters.categoryId),
    Boolean(filters.locationId),
    Boolean(filters.investorId),
  ].filter(Boolean).length;

  return (
    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-gallery-white border border-hairline-silver/70 rounded-2xl p-2.5 sm:p-3 shadow-none">
      <div className="flex flex-col sm:flex-row sm:items-center gap-2 w-full sm:w-auto flex-1">
        <SearchFilterInput
          key={filters.search ?? 'empty'}
          initialValue={filters.search ?? ''}
          onSubmit={handleSearchSubmit}
          placeholder={t('items.searchPlaceholder')}
        />
        <div className="grid grid-cols-2 sm:flex sm:flex-wrap items-center gap-2 w-full sm:w-auto">
          <FilterSelect
            value={filters.status ?? 'ALL'}
            placeholder={t('items.allStatuses')}
            onChange={(val) => onChange({ ...filters, status: val === 'ALL' ? undefined : (val as ItemStatus) })}
            options={[{ value: 'ALL', label: t('items.allStatuses') }, ...ALL_STATUSES.map((st) => ({ value: st, label: t(`items.status.${st}`) }))]}
          />
          <FilterSelect
            value={filters.categoryId ? String(filters.categoryId) : 'ALL'}
            placeholder={t('items.allCategories')}
            onChange={(val) => onChange({ ...filters, categoryId: val === 'ALL' ? undefined : Number(val) })}
            options={[{ value: 'ALL', label: t('items.allCategories') }, ...categories.map((c) => ({ value: String(c.id), label: c.name }))]}
          />
          <FilterSelect
            value={filters.locationId ? String(filters.locationId) : 'ALL'}
            placeholder={t('items.allLocations')}
            onChange={(val) => onChange({ ...filters, locationId: val === 'ALL' ? undefined : Number(val) })}
            options={[{ value: 'ALL', label: t('items.allLocations') }, ...locations.map((l) => ({ value: String(l.id), label: l.name }))]}
          />
          <FilterSelect
            value={filters.investorId ? String(filters.investorId) : 'ALL'}
            placeholder={t('items.allOwners')}
            onChange={(val) => onChange({ ...filters, investorId: val === 'ALL' ? undefined : Number(val) })}
            options={[{ value: 'ALL', label: t('items.allOwners') }, ...investors.map((i) => ({ value: String(i.id), label: i.name }))]}
          />
        </div>
      </div>

      {activeFiltersCount > 0 && (
        <div className="flex items-center justify-end gap-2 pt-2 sm:pt-0 border-t sm:border-t-0 border-hairline-silver/40">
          <Badge variant="secondary" className="h-6 px-2 text-[10px] font-medium rounded-full bg-studio-mist text-slate">
            {activeFiltersCount}
          </Badge>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onChange({})}
            className="h-7 px-2.5 text-xs text-slate hover:text-ink rounded-full cursor-pointer gap-1.5"
          >
            <RotateCcw className="h-3 w-3" />
            <span>{t('common.reset')}</span>
          </Button>
        </div>
      )}
    </div>
  );
}
