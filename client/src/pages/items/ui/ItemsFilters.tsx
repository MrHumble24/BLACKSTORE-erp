import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Search, X, RotateCcw, ArrowUpDown, Tag } from 'lucide-react';
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
import { cn } from '@/shared/lib';
import { useLocations } from '@/entities/location';
import { useInvestors } from '@/entities/investor';
import type { ItemFilters, ItemCondition, ItemSortBy, SortOrder } from '@/entities/item';
import { FilterSelect } from './FilterSelect';
import { CategoryModelVariantFilter } from './CategoryModelVariantFilter';

interface ItemsFiltersProps {
  filters: ItemFilters;
  onChange: (filters: ItemFilters) => void;
}

const ALL_CONDITIONS: ItemCondition[] = ['NEW', 'USED', 'REFURBISHED'];

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
  const handleApply = () => onSubmit(value.trim());

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
        className="w-full sm:w-56 md:w-60 h-8 pl-8 pr-7 text-xs rounded-full bg-studio-mist/40 border-hairline-silver/70 focus:bg-gallery-white dark:bg-white/[0.04]"
      />
      {value && (
        <button
          type="button"
          onClick={() => {
            setValue('');
            onSubmit('');
          }}
          className="absolute right-2.5 p-0.5 rounded-full text-slate hover:text-ink transition-colors cursor-pointer"
        >
          <X className="h-3 w-3" />
        </button>
      )}
    </div>
  );
}

interface SortSelectProps {
  sortBy?: ItemSortBy;
  sortOrder?: SortOrder;
  onChange: (sortBy?: ItemSortBy, sortOrder?: SortOrder) => void;
}

function SortSelect({ sortBy, sortOrder, onChange }: SortSelectProps) {
  const { t } = useTranslation();
  const currentKey = sortBy ? `${sortBy}:${sortOrder ?? 'desc'}` : 'default';

  const sortOptions = [
    { value: 'default', label: t('items.sort.default') },
    { value: 'salePrice:desc', label: t('items.sort.priceDesc') },
    { value: 'salePrice:asc', label: t('items.sort.priceAsc') },
    { value: 'model:asc', label: t('items.sort.modelAsc') },
    { value: 'model:desc', label: t('items.sort.modelDesc') },
    { value: 'createdAt:desc', label: t('items.sort.newest') },
    { value: 'createdAt:asc', label: t('items.sort.oldest') },
  ];

  const handleSortChange = (key: string) => {
    if (key === 'default') {
      onChange(undefined, undefined);
      return;
    }
    const [by, order] = key.split(':') as [ItemSortBy, SortOrder];
    onChange(by, order);
  };

  return (
    <Select value={currentKey} onValueChange={handleSortChange}>
      <SelectTrigger className="h-8 text-xs rounded-full border-hairline-silver/70 w-full sm:w-auto sm:min-w-[9.5rem] bg-gallery-white text-slate dark:bg-white/[0.02]">
        <div className="flex items-center gap-1.5 truncate">
          <ArrowUpDown className="h-3 w-3 text-slate shrink-0" />
          <SelectValue placeholder={t('items.sortBy')} />
        </div>
      </SelectTrigger>
      <SelectContent>
        {sortOptions.map((opt) => (
          <SelectItem key={opt.value} value={opt.value}>
            {opt.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

function ActiveFilterReset({
  count,
  onReset,
}: {
  count: number;
  onReset: () => void;
}) {
  const { t } = useTranslation();
  if (count === 0) return null;

  return (
    <div className="flex items-center gap-1.5 pl-1.5 border-l border-hairline-silver/50">
      <Badge
        variant="secondary"
        className="h-6 px-1.5 text-[10px] font-medium rounded-full bg-studio-mist text-slate"
      >
        {count}
      </Badge>
      <Button
        variant="ghost"
        size="sm"
        onClick={onReset}
        className="h-8 px-2 text-xs text-slate hover:text-ink rounded-full cursor-pointer gap-1"
        title={t('common.reset')}
      >
        <RotateCcw className="h-3 w-3" />
        <span className="hidden sm:inline">{t('common.reset')}</span>
      </Button>
    </div>
  );
}

/** Filter controls toolbar for the items inventory table. */
export function ItemsFilters({ filters, onChange }: ItemsFiltersProps) {
  const { t } = useTranslation();
  const { data: locations = [] } = useLocations();
  const { data: investors = [] } = useInvestors();

  const activeAttributesCount = filters.attributes
    ? Object.keys(filters.attributes).length
    : 0;

  const activeFiltersCount =
    [
      Boolean(filters.search),
      Boolean(filters.condition),
      Boolean(filters.categoryId),
      Boolean(filters.productModelId),
      Boolean(filters.locationId),
      Boolean(filters.investorId),
      Boolean(filters.isUnpriced),
    ].filter(Boolean).length + activeAttributesCount;

  const handleReset = () => {
    onChange({
      status: filters.status,
      sortBy: filters.sortBy,
      sortOrder: filters.sortOrder,
    });
  };

  return (
    <div className="flex flex-col gap-2.5 bg-gallery-white border border-hairline-silver/70 rounded-2xl p-2.5 sm:p-3 shadow-none dark:bg-white/[0.02]">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
        <div className="flex flex-wrap items-center gap-2 flex-1">
          <SearchFilterInput
            key={filters.search ?? 'empty'}
            initialValue={filters.search ?? ''}
            onSubmit={(val) => onChange({ ...filters, search: val || undefined })}
            placeholder={t('items.searchPlaceholder')}
          />
          <CategoryModelVariantFilter filters={filters} onChange={onChange} />
          <FilterSelect
            value={filters.condition ?? 'ALL'}
            placeholder={t('items.allConditions')}
            onChange={(val) =>
              onChange({ ...filters, condition: val === 'ALL' ? undefined : (val as ItemCondition) })
            }
            options={[
              { value: 'ALL', label: t('items.allConditions') },
              ...ALL_CONDITIONS.map((c) => ({ value: c, label: t(`items.condition.${c}`) })),
            ]}
          />
          <FilterSelect
            value={filters.locationId ? String(filters.locationId) : 'ALL'}
            placeholder={t('items.allLocations')}
            onChange={(val) =>
              onChange({ ...filters, locationId: val === 'ALL' ? undefined : Number(val) })
            }
            options={[
              { value: 'ALL', label: t('items.allLocations') },
              ...locations.map((l) => ({ value: String(l.id), label: l.name })),
            ]}
          />
          <FilterSelect
            value={filters.investorId ? String(filters.investorId) : 'ALL'}
            placeholder={t('items.allOwners')}
            onChange={(val) =>
              onChange({ ...filters, investorId: val === 'ALL' ? undefined : Number(val) })
            }
            options={[
              { value: 'ALL', label: t('items.allOwners') },
              ...investors.map((i) => ({ value: String(i.id), label: i.name })),
            ]}
          />
          <button
            type="button"
            onClick={() => onChange({ ...filters, isUnpriced: !filters.isUnpriced })}
            className={cn(
              'inline-flex items-center gap-1.5 h-8 px-3 rounded-full text-xs font-medium border transition-colors cursor-pointer',
              filters.isUnpriced
                ? 'bg-amber-500/10 border-amber-500/40 text-amber-600 dark:text-amber-400 font-semibold'
                : 'bg-gallery-white border-hairline-silver/70 text-slate hover:text-ink dark:bg-white/[0.02]',
            )}
          >
            <Tag className="h-3 w-3" />
            <span>{t('items.unpricedOnly')}</span>
          </button>
        </div>

        <div className="flex items-center gap-2 self-end sm:self-auto shrink-0">
          <SortSelect
            sortBy={filters.sortBy}
            sortOrder={filters.sortOrder}
            onChange={(by, ord) => onChange({ ...filters, sortBy: by, sortOrder: ord })}
          />
          <ActiveFilterReset count={activeFiltersCount} onReset={handleReset} />
        </div>
      </div>
    </div>
  );
}
