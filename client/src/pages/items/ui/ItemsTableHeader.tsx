import { useTranslation } from 'react-i18next';
import { ArrowUpDown, ArrowUp, ArrowDown } from 'lucide-react';
import { TableHeader, TableRow, TableHead } from '@/shared/ui';
import type { ItemSortBy, SortOrder } from '@/entities/item';
import { cn, CURRENCY } from '@/shared/lib';

interface SortHeadProps {
  label: string;
  field?: ItemSortBy;
  activeField?: ItemSortBy;
  order?: SortOrder;
  onSort?: (by: ItemSortBy) => void;
  align?: 'left' | 'center' | 'right';
  className?: string;
}

function SortHead({
  label,
  field,
  activeField,
  order,
  onSort,
  align = 'left',
  className,
}: SortHeadProps) {
  if (!field || !onSort) {
    return (
      <TableHead
        className={cn(
          'px-4 py-3',
          align === 'right' && 'text-right',
          align === 'center' && 'text-center',
          className,
        )}
      >
        {label}
      </TableHead>
    );
  }

  const isActive = activeField === field;

  return (
    <TableHead
      className={cn(
        'px-4 py-3 select-none',
        align === 'right' && 'text-right',
        align === 'center' && 'text-center',
        className,
      )}
    >
      <button
        type="button"
        onClick={() => onSort(field)}
        className={cn(
          'inline-flex items-center gap-1 font-medium transition-colors cursor-pointer group hover:text-ink',
          align === 'right' && 'flex-row-reverse text-right',
          align === 'center' && 'justify-center',
          isActive ? 'text-ink font-semibold' : 'text-slate',
        )}
      >
        <span>{label}</span>
        {isActive ? (
          order === 'asc' ? (
            <ArrowUp className="h-3.5 w-3.5 text-pricing-blue shrink-0" />
          ) : (
            <ArrowDown className="h-3.5 w-3.5 text-pricing-blue shrink-0" />
          )
        ) : (
          <ArrowUpDown className="h-3 w-3 opacity-0 group-hover:opacity-70 text-slate shrink-0 transition-opacity" />
        )}
      </button>
    </TableHead>
  );
}

export interface ItemsTableHeaderProps {
  canViewCost: boolean;
  sortBy?: ItemSortBy;
  sortOrder?: SortOrder;
  onSort: (by: ItemSortBy) => void;
}

/** Sticky sortable table header for the device inventory table. */
export function ItemsTableHeader({
  canViewCost,
  sortBy,
  sortOrder,
  onSort,
}: ItemsTableHeaderProps) {
  const { t } = useTranslation();

  return (
    <TableHeader className="bg-gallery-white sticky top-0 z-10 shadow-[0_1px_0_0_rgba(0,0,0,0.05)] dark:bg-card">
      <TableRow className="border-b border-hairline-silver/60 hover:bg-transparent">
        <SortHead
          label={t('items.model')}
          field="model"
          activeField={sortBy}
          order={sortOrder}
          onSort={onSort}
          className="min-w-[160px]"
        />
        <TableHead className="px-4 py-3 min-w-[180px]">{t('items.specs')}</TableHead>
        <TableHead className="px-4 py-3 min-w-[190px]">{t('items.identifiers')}</TableHead>
        <TableHead className="px-4 py-3 min-w-[90px]">{t('items.owner')}</TableHead>
        <TableHead className="px-4 py-3 min-w-[90px]">{t('items.location')}</TableHead>
        <SortHead
          label={t('items.statusLabel')}
          field="status"
          activeField={sortBy}
          order={sortOrder}
          onSort={onSort}
          align="center"
          className="min-w-[110px]"
        />
        <TableHead className="px-4 py-3 min-w-[95px] text-center">{t('items.conditionLabel')}</TableHead>
        <SortHead
          label={`${t('items.salePrice')} (${CURRENCY})`}
          field="salePrice"
          activeField={sortBy}
          order={sortOrder}
          onSort={onSort}
          align="right"
          className="min-w-[115px] whitespace-nowrap"
        />
        <SortHead
          label={`${t('items.minSalePrice')} (${CURRENCY})`}
          field="minSalePrice"
          activeField={sortBy}
          order={sortOrder}
          onSort={onSort}
          align="right"
          className="min-w-[115px] whitespace-nowrap"
        />
        {canViewCost && (
          <SortHead
            label={`${t('items.cost')} (${CURRENCY})`}
            field="cost"
            activeField={sortBy}
            order={sortOrder}
            onSort={onSort}
            align="right"
            className="min-w-[115px] whitespace-nowrap"
          />
        )}
        <TableHead className="w-12 px-3 text-center" />
      </TableRow>
    </TableHeader>
  );
}
