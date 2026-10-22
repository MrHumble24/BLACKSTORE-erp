import { useTranslation } from 'react-i18next';
import { RotateCcw } from 'lucide-react';
import {
  Button,
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
} from '@/shared/ui';
import { formatMoney, formatDate } from '@/shared/lib';
import type { SaleItem } from '@/entities/sale';

interface SaleItemRowProps {
  line: SaleItem;
  onReturn: (item: SaleItem) => void;
}

function SaleItemRow({ line, onReturn }: SaleItemRowProps) {
  const { t } = useTranslation();
  return (
    <TableRow>
      <TableCell className="font-medium text-ink text-xs">{line.productModel.name}</TableCell>
      <TableCell className="font-mono text-xs text-slate">
        {line.item?.identifiers[0]?.value ?? '—'}
      </TableCell>
      <TableCell className="text-center font-mono text-xs">{line.quantity}</TableCell>
      <TableCell className="text-right font-mono text-xs">{formatMoney(line.unitPrice)}</TableCell>
      <TableCell className="text-right font-mono text-xs font-semibold">
        {formatMoney(Number(line.unitPrice) * line.quantity)}
      </TableCell>
      <TableCell className="text-xs text-slate">
        {line.warrantyUntil ? formatDate(line.warrantyUntil) : '—'}
      </TableCell>
      <TableCell className="text-center font-mono text-xs text-slate">
        {line.returnedQuantity}
      </TableCell>
      <TableCell className="text-right">
        {line.returnedQuantity < line.quantity && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onReturn(line)}
            className="h-7 text-xs text-launch-orange hover:text-launch-orange hover:bg-launch-orange/10 gap-1"
          >
            <RotateCcw className="h-3 w-3" />
            {t('sales.returnAction')}
          </Button>
        )}
      </TableCell>
    </TableRow>
  );
}

interface SaleItemsCardProps {
  items: SaleItem[];
  onReturn: (item: SaleItem) => void;
}

/** Card rendering table of sold items with individual return action triggers. */
export function SaleItemsCard({ items, onReturn }: SaleItemsCardProps) {
  const { t } = useTranslation();

  return (
    <Card className="border-hairline-silver/70 shadow-sm">
      <CardHeader className="py-3 px-4 border-b border-hairline-silver/60">
        <CardTitle className="text-sm font-semibold">{t('sales.itemsTitle')}</CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        <Table>
          <TableHeader>
            <TableRow className="bg-control-gray/30 text-[11px]">
              <TableHead>{t('sell.tableModel')}</TableHead>
              <TableHead>{t('sell.tableCode')}</TableHead>
              <TableHead className="text-center">{t('sell.tableQty')}</TableHead>
              <TableHead className="text-right">{t('sales.unitPrice')}</TableHead>
              <TableHead className="text-right">{t('sales.total')}</TableHead>
              <TableHead>{t('sales.warrantyUntil')}</TableHead>
              <TableHead className="text-center">{t('sales.returnedQty')}</TableHead>
              <TableHead className="w-24 text-right" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {items.map((line) => (
              <SaleItemRow key={line.id} line={line} onReturn={onReturn} />
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
