import { useTranslation } from 'react-i18next';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  TablePagination,
  TableLoadingRow,
  TableEmptyRow,
} from '@/shared/ui';
import { useAuthStore } from '@/entities/session';
import type { AccessoryStock } from '@/entities/accessory-stock';
import { formatMoney } from '@/shared/lib';

interface AccessoriesTableProps {
  items: AccessoryStock[];
  isLoading: boolean;
  page: number;
  totalPages: number;
  total: number;
  onPageChange: (p: number) => void;
}

function AccessoriesTableHeader({ canViewCost }: { canViewCost: boolean }) {
  const { t } = useTranslation();
  return (
    <TableHeader>
      <TableRow className="border-b border-hairline-silver/60 hover:bg-transparent">
        <TableHead>{t('accessories.model')}</TableHead>
        <TableHead>{t('accessories.category')}</TableHead>
        <TableHead>{t('accessories.location')}</TableHead>
        <TableHead className="text-right">{t('accessories.quantity')}</TableHead>
        {canViewCost && (
          <TableHead className="text-right">{t('accessories.avgCost')}</TableHead>
        )}
      </TableRow>
    </TableHeader>
  );
}

function AccessoryRow({
  item,
  canViewCost,
}: {
  item: AccessoryStock;
  canViewCost: boolean;
}) {
  return (
    <TableRow key={item.id} className="border-b border-hairline-silver/40 hover:bg-studio-mist/60">
      <TableCell className="font-medium text-ink tracking-tight">{item.productModel.name}</TableCell>
      <TableCell className="text-slate text-xs">{item.productModel.category.name}</TableCell>
      <TableCell className="text-xs text-slate">{item.location.name}</TableCell>
      <TableCell className="text-right font-mono text-xs font-semibold text-ink">
        {item.quantity}
      </TableCell>
      {canViewCost && (
        <TableCell className="text-right font-mono text-xs text-ink">
          {formatMoney(item.avgCost)}
        </TableCell>
      )}
    </TableRow>
  );
}

/** Apple-styled accessories inventory table with stock count and average costs. */
export function AccessoriesTable({
  items,
  isLoading,
  page,
  totalPages,
  total,
  onPageChange,
}: AccessoriesTableProps) {
  const { t } = useTranslation();
  const canViewCost = useAuthStore((state) => state.hasPermission('view_cost'));
  const colSpan = canViewCost ? 5 : 4;

  return (
    <div className="rounded-[28px] border border-hairline-silver/70 bg-gallery-white overflow-hidden shadow-none">
      <Table>
        <AccessoriesTableHeader canViewCost={canViewCost} />
        <TableBody>
          {isLoading && <TableLoadingRow colSpan={colSpan} />}
          {!isLoading && items.length === 0 && (
            <TableEmptyRow colSpan={colSpan} message={t('accessories.noStock')} />
          )}
          {!isLoading &&
            items.map((item) => (
              <AccessoryRow key={item.id} item={item} canViewCost={canViewCost} />
            ))}
        </TableBody>
      </Table>
      <TablePagination
        page={page}
        totalPages={totalPages}
        total={total}
        onPageChange={onPageChange}
      />
    </div>
  );
}
