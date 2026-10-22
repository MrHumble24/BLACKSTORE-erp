import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Input,
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
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
  return (
    <div className="w-36">
      <Select value={value} onValueChange={onChange}>
        <SelectTrigger className="h-8 text-xs rounded-full">
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
  value,
  onChange,
  onSubmit,
  placeholder,
}: {
  value: string;
  onChange: (v: string) => void;
  onSubmit: () => void;
  placeholder: string;
}) {
  return (
    <Input
      placeholder={placeholder}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      onKeyDown={(e) => {
        if (e.key === 'Enter') {
          e.preventDefault();
          onSubmit();
        }
      }}
      onBlur={onSubmit}
      className="w-48 md:w-56 h-8 text-xs rounded-full"
    />
  );
}

/** Filter controls row for the items inventory table. */
export function ItemsFilters({ filters, onChange }: ItemsFiltersProps) {
  const { t } = useTranslation();
  const [searchValue, setSearchValue] = useState(filters.search ?? '');

  const { data: categories = [] } = useCategories();
  const { data: locations = [] } = useLocations();
  const { data: investors = [] } = useInvestors();

  const handleSearchSubmit = () => {
    const trimmed = searchValue.trim();
    if (trimmed !== (filters.search ?? '')) onChange({ ...filters, search: trimmed || undefined });
  };

  return (
    <div className="flex flex-wrap items-center gap-2.5 pt-1">
      <SearchFilterInput
        value={searchValue}
        onChange={setSearchValue}
        onSubmit={handleSearchSubmit}
        placeholder={t('items.searchPlaceholder')}
      />
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
  );
}
