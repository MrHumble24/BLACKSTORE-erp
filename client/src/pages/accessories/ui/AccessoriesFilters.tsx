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
import type { AccessoryStockFilters } from '@/entities/accessory-stock';

interface AccessoriesFiltersProps {
  filters: AccessoryStockFilters;
  onChange: (filters: AccessoryStockFilters) => void;
}

/** Filter bar for non-serialized accessory stock. */
export function AccessoriesFilters({ filters, onChange }: AccessoriesFiltersProps) {
  const { t } = useTranslation();
  const { data: categories = [] } = useCategories();
  const nonSerializedCategories = categories.filter((c) => !c.isSerialized);
  const { data: locations = [] } = useLocations();

  return (
    <div className="flex flex-wrap items-center gap-2.5 pt-1">
      <div className="w-44">
        <Select
          value={filters.categoryId ? String(filters.categoryId) : 'ALL'}
          onValueChange={(val) =>
            onChange({ ...filters, categoryId: val === 'ALL' ? undefined : Number(val) })
          }
        >
          <SelectTrigger className="h-8 text-xs rounded-full">
            <SelectValue placeholder={t('accessories.allCategories')} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">{t('accessories.allCategories')}</SelectItem>
            {nonSerializedCategories.map((c) => (
              <SelectItem key={c.id} value={String(c.id)}>
                {c.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="w-44">
        <Select
          value={filters.locationId ? String(filters.locationId) : 'ALL'}
          onValueChange={(val) =>
            onChange({ ...filters, locationId: val === 'ALL' ? undefined : Number(val) })
          }
        >
          <SelectTrigger className="h-8 text-xs rounded-full">
            <SelectValue placeholder={t('accessories.allLocations')} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">{t('accessories.allLocations')}</SelectItem>
            {locations.map((l) => (
              <SelectItem key={l.id} value={String(l.id)}>
                {l.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    </div>
  );
}
