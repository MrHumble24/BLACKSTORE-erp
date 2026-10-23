import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Pencil, ShoppingCart, AlertCircle } from 'lucide-react';
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
  Button,
  Badge,
} from '@/shared/ui';
import { formatMoney, formatDate } from '@/shared/lib';
import { useAuthStore } from '@/entities/session';
import {
  ConsignmentItemStatusBadge,
  type ConsignmentItem,
  type ConsignmentItemStatus,
} from '@/entities/consignment';
import { ReturnItemButton } from '@/features/consign';

interface ItemPriceCellProps {
  minPrice: string;
  isAtPartner: boolean;
  onEdit: () => void;
}

function ItemPriceCell({ minPrice, isAtPartner, onEdit }: ItemPriceCellProps) {
  return (
    <div className="flex items-center justify-end gap-1.5">
      <span className="font-mono font-medium">{formatMoney(minPrice)}</span>
      {isAtPartner && (
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={onEdit}
          className="h-6 w-6 p-0 text-slate hover:text-ink"
        >
          <Pencil className="h-3 w-3" />
        </Button>
      )}
    </div>
  );
}

interface ItemStatusCellProps {
  status: ConsignmentItemStatus;
  overdue: boolean;
  isAtPartner: boolean;
}

function ItemStatusCell({ status, overdue, isAtPartner }: ItemStatusCellProps) {
  const { t } = useTranslation();
  return (
    <TableCell className="text-center">
      <div className="flex items-center justify-center gap-1.5">
        <ConsignmentItemStatusBadge status={status} />
        {overdue && isAtPartner && (
          <Badge variant="destructive" className="h-4 px-1.5 text-[9px] gap-0.5">
            <AlertCircle className="h-2.5 w-2.5" />
            {t('consign.overdueBadge')}
          </Badge>
        )}
      </div>
    </TableCell>
  );
}

function ItemSoldDateCell({ soldAt, saleId }: { soldAt: string | null; saleId: number | null }) {
  if (!soldAt) return <TableCell className="text-xs text-slate">—</TableCell>;
  return (
    <TableCell className="text-xs text-slate">
      <span>
        {formatDate(soldAt)}
        {saleId && (
          <Link to={`/sales/${saleId}`} className="ml-1 text-ink font-mono hover:underline font-semibold">
            #{saleId}
          </Link>
        )}
      </span>
    </TableCell>
  );
}

interface ItemActionsCellProps {
  consignmentId: number;
  item: ConsignmentItem;
  canSell: boolean;
  onSell: (item: ConsignmentItem) => void;
}

function ItemActionsCell({ consignmentId, item, canSell, onSell }: ItemActionsCellProps) {
  const { t } = useTranslation();
  if (item.status !== 'AT_PARTNER') return null;

  return (
    <div className="flex items-center justify-end gap-2">
      {canSell && (
        <Button type="button" size="sm" onClick={() => onSell(item)} className="h-7 text-xs gap-1">
          <ShoppingCart className="h-3 w-3" />
          {t('consign.sellItem')}
        </Button>
      )}
      <ReturnItemButton consignmentId={consignmentId} itemId={item.id} />
    </div>
  );
}

interface ConsignmentItemRowProps {
  consignmentId: number;
  item: ConsignmentItem;
  canSell: boolean;
  onEditMinPrice: (item: ConsignmentItem) => void;
  onSellItem: (item: ConsignmentItem) => void;
}

function ConsignmentItemRow({
  consignmentId,
  item,
  canSell,
  onEditMinPrice,
  onSellItem,
}: ConsignmentItemRowProps) {
  const isAtPartner = item.status === 'AT_PARTNER';
  const code = item.item.identifiers[0]?.value ?? String(item.item.id);

  return (
    <TableRow className="text-xs">
      <TableCell className="font-medium text-ink">
        <Link to={`/items/${item.item.id}`} className="hover:underline">
          {item.item.productModel.name}
        </Link>
      </TableCell>
      <TableCell className="font-mono text-slate">{code}</TableCell>
      <TableCell className="text-right">
        <ItemPriceCell minPrice={item.minPrice} isAtPartner={isAtPartner} onEdit={() => onEditMinPrice(item)} />
      </TableCell>
      <ItemStatusCell status={item.status} overdue={item.overdue} isAtPartner={isAtPartner} />
      <ItemSoldDateCell soldAt={item.soldAt} saleId={item.saleId} />
      <TableCell className="text-right">
        <ItemActionsCell consignmentId={consignmentId} item={item} canSell={canSell} onSell={onSellItem} />
      </TableCell>
    </TableRow>
  );
}

interface ConsignmentItemsTableProps {
  consignmentId: number;
  items: ConsignmentItem[];
  onEditMinPrice: (item: ConsignmentItem) => void;
  onSellItem: (item: ConsignmentItem) => void;
}

/** Consignment items ledger table with inline actions for min price, sale, and return. */
export function ConsignmentItemsTable({
  consignmentId,
  items,
  onEditMinPrice,
  onSellItem,
}: ConsignmentItemsTableProps) {
  const { t } = useTranslation();
  const canSell = useAuthStore((s) => s.hasPermission('sell'));

  return (
    <Card className="border-hairline-silver/70 shadow-sm">
      <CardHeader className="py-3 px-4 border-b border-hairline-silver/60">
        <CardTitle className="text-sm font-semibold">{t('consign.items')}</CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        <Table>
          <TableHeader>
            <TableRow className="bg-control-gray/30 text-[11px]">
              <TableHead>{t('items.model')}</TableHead>
              <TableHead>{t('items.identifiers')}</TableHead>
              <TableHead className="text-right">{t('consign.minPrice')}</TableHead>
              <TableHead className="text-center">{t('sales.filterStatus')}</TableHead>
              <TableHead>{t('consign.soldDate')}</TableHead>
              <TableHead className="w-48 text-right" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {items.map((it) => (
              <ConsignmentItemRow
                key={it.id}
                consignmentId={consignmentId}
                item={it}
                canSell={canSell}
                onEditMinPrice={onEditMinPrice}
                onSellItem={onSellItem}
              />
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
