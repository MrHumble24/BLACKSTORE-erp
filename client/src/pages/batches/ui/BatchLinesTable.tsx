import { useTranslation } from 'react-i18next';
import { Pencil } from 'lucide-react';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
  Button, TableLoadingRow, TableEmptyRow,
} from '@/shared/ui';
import { formatMoney } from '@/shared/lib';
import { useAuthStore } from '@/entities/session';
import { ItemStatusBadge, type ItemStatus } from '@/entities/item';
import type { BatchLine } from '@/entities/batch';

/** Code cell: a device shows its first identifier, accessory lines show the unit count. */
function codeDisplay(line: BatchLine): string {
  if (line.item) {
    return line.item.identifiers[0]?.value ?? `#${line.item.id}`;
  }
  return `× ${line.quantity}`;
}

function statusOf(line: BatchLine): ItemStatus | null {
  return line.item ? line.item.status : null;
}

interface SetPriceButtonProps {
  line: BatchLine;
  onClick: (line: BatchLine) => void;
}

/** Small outline action shown to manage_prices users on every line. */
function SetPriceButton({ line, onClick }: SetPriceButtonProps) {
  const { t } = useTranslation();
  return (
    <Button
      variant="outline"
      size="sm"
      onClick={() => onClick(line)}
      className="h-7 px-3 rounded-full border-hairline-silver bg-gallery-white text-ink hover:bg-studio-mist text-xs gap-1"
    >
      <Pencil className="h-3 w-3 text-apple-blue" />
      <span>{t('batches.setPrice')}</span>
    </Button>
  );
}

/** One line row; unit price and extra cost appear only with view_cost. */
function LineRow({
  line,
  canViewCost,
  canManagePrices,
  onSetPrice,
}: {
  line: BatchLine;
  canViewCost: boolean;
  canManagePrices: boolean;
  onSetPrice: (line: BatchLine) => void;
}) {
  const status = statusOf(line);

  return (
    <TableRow className="border-b border-hairline-silver/40 hover:bg-studio-mist/60">
      <TableCell className="text-xs font-medium text-ink">{line.productModel.name}</TableCell>
      <TableCell className="text-xs text-slate">{codeDisplay(line)}</TableCell>
      <TableCell>{status && <ItemStatusBadge status={status} />}</TableCell>
      {canViewCost && (
        <>
          <TableCell className="text-right text-xs font-medium text-ink">
            {formatMoney(line.unitPrice ?? null)}
          </TableCell>
          <TableCell className="text-right text-xs text-ink">
            {formatMoney(line.extraCost ?? null)}
          </TableCell>
        </>
      )}
      <TableCell className="text-right">
        {canManagePrices && <SetPriceButton line={line} onClick={onSetPrice} />}
      </TableCell>
    </TableRow>
  );
}

interface BatchLinesTableProps {
  lines: BatchLine[];
  isLoading: boolean;
  onSetPrice: (line: BatchLine) => void;
}

/** Batch lines table: model, code or qty, status; cost columns view_cost, set price manage_prices. */
export function BatchLinesTable({ lines, isLoading, onSetPrice }: BatchLinesTableProps) {
  const { t } = useTranslation();
  const canViewCost = useAuthStore((state) => state.hasPermission('view_cost'));
  const canManagePrices = useAuthStore((state) => state.hasPermission('manage_prices'));
  const colSpan = 3 + (canViewCost ? 2 : 0) + 1;

  return (
    <div className="rounded-[28px] border border-hairline-silver/70 bg-gallery-white overflow-hidden shadow-none p-1">
      <Table>
        <TableHeader>
          <TableRow className="border-b border-hairline-silver/60 hover:bg-transparent">
            <TableHead>{t('batches.model')}</TableHead>
            <TableHead>{t('batches.codeOrQty')}</TableHead>
            <TableHead>{t('items.statusLabel')}</TableHead>
            {canViewCost && (
              <>
                <TableHead className="text-right">{t('batches.unitPrice')}</TableHead>
                <TableHead className="text-right">{t('batches.extraCost')}</TableHead>
              </>
            )}
            <TableHead className="text-right">{t('common.actions')}</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {isLoading && <TableLoadingRow colSpan={colSpan} />}
          {!isLoading && lines.length === 0 && (
            <TableEmptyRow colSpan={colSpan} message={t('batches.noLines')} />
          )}
          {!isLoading && lines.map((line) => (
            <LineRow
              key={line.id}
              line={line}
              canViewCost={canViewCost}
              canManagePrices={canManagePrices}
              onSetPrice={onSetPrice}
            />
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
