import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { Copy, Check, MoreHorizontal, Eye, Printer } from 'lucide-react';
import { toast } from 'sonner';
import {
  Table,
  TableBody,
  TableCell,
  TableRow,
  TablePagination,
  TableLoadingRow,
  TableEmptyRow,
  Button,
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from '@/shared/ui';
import { useAuthStore } from '@/entities/session';
import {
  ItemStatusBadge,
  ItemConditionBadge,
  type Item,
  type ItemSortBy,
  type SortOrder,
} from '@/entities/item';
import { money } from '@/shared/lib';
import { ItemsTableHeader } from './ItemsTableHeader';
import { ItemSpecsBadges } from './ItemSpecsBadges';

interface ItemsTableProps {
  items: Item[];
  isLoading: boolean;
  page: number;
  totalPages: number;
  total: number;
  pageSize: number;
  sortBy?: ItemSortBy;
  sortOrder?: SortOrder;
  onPageChange: (p: number) => void;
  onPageSizeChange: (size: number) => void;
  onSortChange: (by: ItemSortBy) => void;
}

function CopyableIdentifier({ type, value }: { type: string; value: string }) {
  const { t } = useTranslation();
  const [copied, setCopied] = useState(false);

  const handleCopy = (e: React.MouseEvent) => {
    e.stopPropagation();
    void navigator.clipboard.writeText(value);
    setCopied(true);
    toast.success(`${type} ${t('common.copied')}`);
    setTimeout(() => setCopied(false), 1500);
  };

  return (
    <div className="group/id flex items-center gap-1.5 font-mono text-[11px] text-ink whitespace-nowrap">
      <span className="text-slate text-[10px]">{type}:</span>
      <span className="tracking-tight">{value}</span>
      <button
        type="button"
        onClick={handleCopy}
        className="opacity-0 group-hover/id:opacity-100 p-0.5 text-slate hover:text-ink transition-opacity cursor-pointer rounded"
        title="Copy"
      >
        {copied ? <Check className="h-3 w-3 text-emerald-600" /> : <Copy className="h-3 w-3" />}
      </button>
    </div>
  );
}

function ItemRowActions({ itemId, canPrint }: { itemId: number; canPrint: boolean }) {
  const { t } = useTranslation();
  const navigate = useNavigate();

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          className="h-7 w-7 p-0 rounded-full hover:bg-studio-mist text-slate hover:text-ink cursor-pointer"
        >
          <MoreHorizontal className="h-4 w-4" />
          <span className="sr-only">{t('common.actions')}</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-40">
        <DropdownMenuItem onClick={() => navigate(`/items/${itemId}`)} className="gap-2">
          <Eye className="h-3.5 w-3.5 text-slate" />
          <span>{t('common.view')}</span>
        </DropdownMenuItem>
        {canPrint && (
          <DropdownMenuItem onClick={() => navigate(`/items/${itemId}/label`)} className="gap-2">
            <Printer className="h-3.5 w-3.5 text-slate" />
            <span>{t('labels.print')}</span>
          </DropdownMenuItem>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function ItemRow({ item, canViewCost }: { item: Item; canViewCost: boolean }) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const canReceiveBatch = useAuthStore((state) => state.hasPermission('receive_batch'));

  return (
    <TableRow
      onClick={() => navigate(`/items/${item.id}`)}
      className="border-b border-hairline-silver/40 hover:bg-studio-mist/70 transition-colors cursor-pointer group"
    >
      <TableCell className="px-4 py-3 whitespace-nowrap">
        <div className="flex flex-col">
          <span className="font-medium text-ink tracking-tight">
            {item.productModel.name}
          </span>
          <span className="text-[11px] text-slate font-normal">
            {item.productModel.category.name}
          </span>
        </div>
      </TableCell>
      <TableCell className="px-4 py-3">
        <ItemSpecsBadges attributes={item.attributes} />
      </TableCell>
      <TableCell className="px-4 py-3 text-xs">
        <div className="space-y-1">
          {item.identifiers.map((id) => (
            <CopyableIdentifier key={id.id} type={id.type} value={id.value} />
          ))}
        </div>
      </TableCell>
      <TableCell className="px-4 py-3 text-xs text-ink whitespace-nowrap">{item.investor.name}</TableCell>
      <TableCell className="px-4 py-3 text-xs text-slate whitespace-nowrap">{item.location.name}</TableCell>
      <TableCell className="px-4 py-3 text-center whitespace-nowrap">
        <ItemStatusBadge status={item.status} />
      </TableCell>
      <TableCell className="px-4 py-3 text-center whitespace-nowrap">
        <ItemConditionBadge condition={item.condition} />
      </TableCell>
      <TableCell className="px-4 py-3 text-right font-mono text-xs whitespace-nowrap tabular-nums">
        {item.salePrice ? (
          money(item.salePrice)
        ) : (
          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20">
            {t('items.unpricedBadge')}
          </span>
        )}
      </TableCell>
      <TableCell className="px-4 py-3 text-right font-mono text-xs text-slate whitespace-nowrap tabular-nums">
        {item.minSalePrice ? money(item.minSalePrice) : '—'}
      </TableCell>
      {canViewCost && (
        <TableCell className="px-4 py-3 text-right font-mono text-xs text-ink font-medium whitespace-nowrap tabular-nums">
          {item.cost ? money(item.cost) : '—'}
        </TableCell>
      )}
      <TableCell className="px-3 py-3 text-center" onClick={(e) => e.stopPropagation()}>
        <ItemRowActions itemId={item.id} canPrint={canReceiveBatch} />
      </TableCell>
    </TableRow>
  );
}

interface TableFooterProps {
  page: number;
  totalPages: number;
  total: number;
  pageSize: number;
  onPageChange: (p: number) => void;
  onPageSizeChange: (size: number) => void;
}

function TableFooter({
  page,
  totalPages,
  total,
  pageSize,
  onPageChange,
  onPageSizeChange,
}: TableFooterProps) {
  const { t } = useTranslation();
  return (
    <div className="flex flex-col sm:flex-row items-center justify-between gap-2.5 border-t border-hairline-silver/60 bg-gallery-white px-4 sm:px-6 py-3 text-xs text-slate dark:bg-card">
      <div className="flex items-center gap-3">
        <span>
          {t('common.total')}: <span className="font-semibold text-ink">{total}</span>
        </span>
        <div className="flex items-center gap-1.5 pl-3 border-l border-hairline-silver/50">
          <span className="text-[11px] text-slate">{t('items.pageSize')}:</span>
          <Select value={String(pageSize)} onValueChange={(val) => onPageSizeChange(Number(val))}>
            <SelectTrigger className="h-6 w-16 text-[11px] rounded-md px-1.5 py-0 border-hairline-silver/70">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="20">20</SelectItem>
              <SelectItem value="50">50</SelectItem>
              <SelectItem value="100">100</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>
      <TablePagination
        page={page}
        totalPages={totalPages}
        total={total}
        onPageChange={onPageChange}
      />
    </div>
  );
}

/** Modern ERP inventory items table with integrated sticky header, quick actions, sorting, and pagination. */
export function ItemsTable({
  items,
  isLoading,
  page,
  totalPages,
  total,
  pageSize,
  sortBy,
  sortOrder,
  onPageChange,
  onPageSizeChange,
  onSortChange,
}: ItemsTableProps) {
  const { t } = useTranslation();
  const canViewCost = useAuthStore((state) => state.hasPermission('view_cost'));
  const colSpan = canViewCost ? 11 : 10;

  return (
    <div className="rounded-[24px] border border-hairline-silver/70 bg-gallery-white overflow-hidden shadow-none dark:bg-card">
      <Table>
        <ItemsTableHeader
          canViewCost={canViewCost}
          sortBy={sortBy}
          sortOrder={sortOrder}
          onSort={onSortChange}
        />
        <TableBody>
          {isLoading && <TableLoadingRow colSpan={colSpan} />}
          {!isLoading && items.length === 0 && (
            <TableEmptyRow colSpan={colSpan} message={t('items.noItems')} />
          )}
          {!isLoading &&
            items.map((item) => (
              <ItemRow key={item.id} item={item} canViewCost={canViewCost} />
            ))}
        </TableBody>
      </Table>
      <TableFooter
        page={page}
        totalPages={totalPages}
        total={total}
        pageSize={pageSize}
        onPageChange={onPageChange}
        onPageSizeChange={onPageSizeChange}
      />
    </div>
  );
}
