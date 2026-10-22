import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { ChevronRight } from 'lucide-react';
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
import {
  ItemStatusBadge,
  ItemConditionBadge,
  type Item,
} from '@/entities/item';
import { formatMoney } from '@/shared/lib';

interface ItemsTableProps {
  items: Item[];
  isLoading: boolean;
  page: number;
  totalPages: number;
  total: number;
  onPageChange: (p: number) => void;
}

function ItemsTableHeader({ canViewCost }: { canViewCost: boolean }) {
  const { t } = useTranslation();
  return (
    <TableHeader>
      <TableRow className="border-b border-hairline-silver/60 hover:bg-transparent">
        <TableHead>{t('items.model')}</TableHead>
        <TableHead>{t('items.category')}</TableHead>
        <TableHead>{t('items.identifiers')}</TableHead>
        <TableHead>{t('items.owner')}</TableHead>
        <TableHead>{t('items.location')}</TableHead>
        <TableHead>{t('items.statusLabel')}</TableHead>
        <TableHead>{t('items.conditionLabel')}</TableHead>
        <TableHead className="text-right">{t('items.salePrice')}</TableHead>
        <TableHead className="text-right">{t('items.minSalePrice')}</TableHead>
        {canViewCost && <TableHead className="text-right">{t('items.cost')}</TableHead>}
        <TableHead className="w-10" />
      </TableRow>
    </TableHeader>
  );
}

function ItemRow({ item, canViewCost }: { item: Item; canViewCost: boolean }) {
  const navigate = useNavigate();

  return (
    <TableRow
      key={item.id}
      onClick={() => navigate(`/items/${item.id}`)}
      className="border-b border-hairline-silver/40 hover:bg-studio-mist/60 cursor-pointer"
    >
      <TableCell className="font-medium text-ink tracking-tight">{item.productModel.name}</TableCell>
      <TableCell className="text-slate text-xs">{item.productModel.category.name}</TableCell>
      <TableCell className="text-xs">
        <div className="space-y-0.5">
          {item.identifiers.map((id) => (
            <div key={id.id} className="font-mono text-[11px] text-ink">
              <span className="text-slate">{id.type}:</span> {id.value}
            </div>
          ))}
        </div>
      </TableCell>
      <TableCell className="text-xs text-ink">{item.investor.name}</TableCell>
      <TableCell className="text-xs text-slate">{item.location.name}</TableCell>
      <TableCell>
        <ItemStatusBadge status={item.status} />
      </TableCell>
      <TableCell>
        <ItemConditionBadge condition={item.condition} />
      </TableCell>
      <TableCell className="text-right font-mono text-xs">{formatMoney(item.salePrice)}</TableCell>
      <TableCell className="text-right font-mono text-xs text-slate">
        {formatMoney(item.minSalePrice)}
      </TableCell>
      {canViewCost && (
        <TableCell className="text-right font-mono text-xs text-ink">
          {formatMoney(item.cost)}
        </TableCell>
      )}
      <TableCell className="text-right">
        <ChevronRight className="h-4 w-4 text-steel inline" />
      </TableCell>
    </TableRow>
  );
}

/** Apple-styled inventory items table with integrated pagination. */
export function ItemsTable({
  items,
  isLoading,
  page,
  totalPages,
  total,
  onPageChange,
}: ItemsTableProps) {
  const { t } = useTranslation();
  const canViewCost = useAuthStore((state) => state.hasPermission('view_cost'));
  const colSpan = canViewCost ? 11 : 10;

  return (
    <div className="rounded-[28px] border border-hairline-silver/70 bg-gallery-white overflow-hidden shadow-none">
      <Table>
        <ItemsTableHeader canViewCost={canViewCost} />
        <TableBody>
          {isLoading && <TableLoadingRow colSpan={colSpan} />}
          {!isLoading && items.length === 0 && (
            <TableEmptyRow colSpan={colSpan} message={t('items.noItems')} />
          )}
          {!isLoading &&
            items.map((item) => <ItemRow key={item.id} item={item} canViewCost={canViewCost} />)}
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
