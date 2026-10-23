import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { Copy, Check, MoreHorizontal, Eye, Printer } from 'lucide-react';
import { toast } from 'sonner';
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
  Button,
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
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

function CopyableIdentifier({ type, value }: { type: string; value: string }) {
  const { t } = useTranslation();
  const [copied, setCopied] = useState(false);

  const handleCopy = (e: React.MouseEvent) => {
    e.stopPropagation();
    navigator.clipboard.writeText(value);
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

function ItemsTableHeader({ canViewCost }: { canViewCost: boolean }) {
  const { t } = useTranslation();
  return (
    <TableHeader className="bg-gallery-white sticky top-0 z-10 shadow-[0_1px_0_0_rgba(0,0,0,0.05)]">
      <TableRow className="border-b border-hairline-silver/60 hover:bg-transparent">
        <TableHead className="px-4 py-3 min-w-[160px]">{t('items.model')}</TableHead>
        <TableHead className="px-4 py-3 min-w-[100px]">{t('items.category')}</TableHead>
        <TableHead className="px-4 py-3 min-w-[190px]">{t('items.identifiers')}</TableHead>
        <TableHead className="px-4 py-3 min-w-[90px]">{t('items.owner')}</TableHead>
        <TableHead className="px-4 py-3 min-w-[90px]">{t('items.location')}</TableHead>
        <TableHead className="px-4 py-3 min-w-[110px] text-center">{t('items.statusLabel')}</TableHead>
        <TableHead className="px-4 py-3 min-w-[95px] text-center">{t('items.conditionLabel')}</TableHead>
        <TableHead className="px-4 py-3 min-w-[110px] text-right whitespace-nowrap">{t('items.salePrice')}</TableHead>
        <TableHead className="px-4 py-3 min-w-[110px] text-right whitespace-nowrap">{t('items.minSalePrice')}</TableHead>
        {canViewCost && <TableHead className="px-4 py-3 min-w-[110px] text-right whitespace-nowrap">{t('items.cost')}</TableHead>}
        <TableHead className="w-12 px-3 text-center" />
      </TableRow>
    </TableHeader>
  );
}

function ItemRow({ item, canViewCost }: { item: Item; canViewCost: boolean }) {
  const navigate = useNavigate();
  const canReceiveBatch = useAuthStore((state) => state.hasPermission('receive_batch'));

  return (
    <TableRow
      key={item.id}
      onClick={() => navigate(`/items/${item.id}`)}
      className="border-b border-hairline-silver/40 hover:bg-studio-mist/70 transition-colors cursor-pointer group"
    >
      <TableCell className="px-4 py-3 font-medium text-ink tracking-tight whitespace-nowrap">
        {item.productModel.name}
      </TableCell>
      <TableCell className="px-4 py-3 text-slate text-xs whitespace-nowrap">
        {item.productModel.category.name}
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
        {formatMoney(item.salePrice)}
      </TableCell>
      <TableCell className="px-4 py-3 text-right font-mono text-xs text-slate whitespace-nowrap tabular-nums">
        {formatMoney(item.minSalePrice)}
      </TableCell>
      {canViewCost && (
        <TableCell className="px-4 py-3 text-right font-mono text-xs text-ink font-medium whitespace-nowrap tabular-nums">
          {formatMoney(item.cost)}
        </TableCell>
      )}
      <TableCell className="px-3 py-3 text-center" onClick={(e) => e.stopPropagation()}>
        <ItemRowActions itemId={item.id} canPrint={canReceiveBatch} />
      </TableCell>
    </TableRow>
  );
}

/** Modern ERP inventory items table with integrated sticky header, quick actions, and pagination. */
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
    <div className="rounded-[24px] border border-hairline-silver/70 bg-gallery-white overflow-hidden shadow-none">
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
