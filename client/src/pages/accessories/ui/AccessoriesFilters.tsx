import { useTranslation } from 'react-i18next';
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from '@/shared/ui';
import { useCategories } from '@/entities/category';
import { useLocations } from '@/entities/location';
import type { AccessoryStockFilters, StockLevel } from '@/entities/accessory-stock';

interface Option {
  value: string;
  label: string;
}

/** Single "All + options" filter dropdown used by the accessory filters bar. */
function FilterSelect({
  value,
  onChange,
  options,
  allLabel,
}: {
  value: string;
  onChange: (val: string) => void;
  options: Option[];
  allLabel: string;
}) {
  return (
    <div className="w-full sm:w-44">
      <Select value={value || 'ALL'} onValueChange={onChange}>
        <SelectTrigger className="h-8 text-xs rounded-full w-full">
          <SelectValue placeholder={allLabel} />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="ALL">{allLabel}</SelectItem>
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

export type StockLevelFilter = StockLevel;

interface AccessoriesFiltersProps {
  filters: AccessoryStockFilters;
  onChange: (filters: AccessoryStockFilters) => void;
  stockLevel?: StockLevelFilter;
  onStockLevelChange?: (level: StockLevelFilter) => void;
}

/** Filter bar for non-serialized accessory stock. */
export function AccessoriesFilters({
  filters,
  onChange,
  stockLevel = 'ALL',
  onStockLevelChange,
}: AccessoriesFiltersProps) {
  const { t } = useTranslation();
  const { data: categories = [] } = useCategories();
  const nonSerializedCategories = categories.filter((c) => !c.isSerialized);
  const { data: locations = [] } = useLocations();

  return (
    <div className="grid grid-cols-1 sm:flex sm:flex-wrap items-center gap-2.5 pt-1 w-full sm:w-auto">
      <FilterSelect
        value={filters.categoryId ? String(filters.categoryId) : ''}
        onChange={(val) =>
          onChange({ ...filters, categoryId: val === 'ALL' ? undefined : Number(val) })
        }
        options={nonSerializedCategories.map((c) => ({ value: String(c.id), label: c.name }))}
        allLabel={t('accessories.allCategories')}
      />
      <FilterSelect
        value={filters.locationId ? String(filters.locationId) : ''}
        onChange={(val) =>
          onChange({ ...filters, locationId: val === 'ALL' ? undefined : Number(val) })
        }
        options={locations.map((l) => ({ value: String(l.id), label: l.name }))}
        allLabel={t('accessories.allLocations')}
      />
      {onStockLevelChange && (
        <FilterSelect
          value={stockLevel}
          onChange={(val) => onStockLevelChange(val as StockLevelFilter)}
          options={[
            { value: 'IN_STOCK', label: t('accessories.stockFilterInStock') },
            { value: 'LOW_STOCK', label: t('accessories.stockFilterLowStock') },
            { value: 'OUT_OF_STOCK', label: t('accessories.stockFilterOutOfStock') },
          ]}
          allLabel={t('accessories.stockFilterAll')}
        />
      )}
    </div>
  );
}
