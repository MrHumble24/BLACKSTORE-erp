import { useTranslation } from 'react-i18next';
import {
  Select, SelectTrigger, SelectValue, SelectContent, SelectItem,
} from '@/shared/ui';
import { useSuppliers, type SupplierSummary } from '@/entities/supplier';

/** Single "All suppliers + supplier" filter dropdown for the batches list page. */
function SupplierFilterSelect({
  value,
  onChange,
  suppliers,
  allLabel,
}: {
  value: string;
  onChange: (val: string) => void;
  suppliers: SupplierSummary[];
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
          {suppliers.map((s) => (
            <SelectItem key={s.id} value={String(s.id)}>
              {s.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}

interface BatchesFiltersProps {
  supplierId?: number;
  onChange: (supplierId?: number) => void;
}

/** Filter bar for the batches list page: one supplier dropdown. */
export function BatchesFilters({ supplierId, onChange }: BatchesFiltersProps) {
  const { t } = useTranslation();
  const { data: suppliers = [] } = useSuppliers(true);

  return (
    <div className="flex flex-wrap items-center gap-2.5 pt-1">
      <SupplierFilterSelect
        value={supplierId ? String(supplierId) : ''}
        onChange={(val) => onChange(val === 'ALL' ? undefined : Number(val))}
        suppliers={suppliers}
        allLabel={t('batches.allSuppliers')}
      />
    </div>
  );
}
