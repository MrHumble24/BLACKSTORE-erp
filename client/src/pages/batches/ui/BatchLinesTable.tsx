import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { Pencil, Printer, Trash2 } from 'lucide-react';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
  Button, TableLoadingRow, TableEmptyRow,
} from '@/shared/ui';
import { formatMoney } from '@/shared/lib';
import { useAuthStore } from '@/entities/session';
import { ItemStatusBadge, type ItemStatus } from '@/entities/item';
import type { BatchLine } from '@/entities/batch';
import { useState } from 'react';
import { RemoveLineDialog } from '@/features/receive-batch';

/** Code cell: a device shows all its identifiers, accessory lines show the unit count. */
function codeDisplay(line: BatchLine): string {
  if (line.item) {
    const codes = line.item.identifiers.map((identifier) => identifier.value).join(' · ');
    return codes || `#${line.item.id}`;
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

/** Trash action; a device is only removable while it stayed untouched in stock. */
function DeleteLineButton({ line, onClick }: { line: BatchLine; onClick: (line: BatchLine) => void }) {
  const { t } = useTranslation();
  const removable = !line.item || line.item.status === 'IN_STOCK';
  if (!removable) return null;

  return (
    <Button
      variant="ghost"
      size="sm"
      aria-label={t('batches.removeLine')}
      title={line.item ? t('batches.removeDeviceButton') : t('batches.removeAccessoryButton')}
      onClick={() => onClick(line)}
      className="h-7 w-7 p-0 rounded-full text-slate hover:text-launch-orange hover:bg-launch-orange/10"
    >
      <Trash2 className="h-3.5 w-3.5" />
    </Button>
  );
}

/** One line row; unit price and extra cost appear only with view_cost. */
function LineRow({
  line,
  canViewCost,
  canManagePrices,
  canDelete,
  onSetPrice,
  onDelete,
}: {
  line: BatchLine;
  canViewCost: boolean;
  canManagePrices: boolean;
  canDelete: boolean;
  onSetPrice: (line: BatchLine) => void;
  onDelete: (line: BatchLine) => void;
}) {
  const { t } = useTranslation();
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
        <div className="flex items-center justify-end gap-1.5">
          {line.item && (
            <Link
              to={`/items/${line.item.id}/label`}
              target="_blank"
              rel="noopener noreferrer"
              aria-label={t('labels.print')}
              title={t('labels.print')}
              className="inline-flex h-7 w-7 items-center justify-center rounded-full text-slate hover:text-apple-blue hover:bg-apple-blue/10 transition-colors"
            >
              <Printer className="h-3.5 w-3.5" />
            </Link>
          )}
          {canManagePrices && <SetPriceButton line={line} onClick={onSetPrice} />}
          {canDelete && <DeleteLineButton line={line} onClick={onDelete} />}
        </div>
      </TableCell>
    </TableRow>
  );
}

interface BatchLinesTableProps {
  batchId: number;
  lines: BatchLine[];
  isLoading: boolean;
  /** True when the batch is locked for this user; hides price and remove actions. */
  locked: boolean;
  onSetPrice: (line: BatchLine) => void;
}

/** Batch lines table: model, code or qty, status; cost columns view_cost, set price manage_prices. */
export function BatchLinesTable({
  batchId,
  lines,
  isLoading,
  locked,
  onSetPrice,
}: BatchLinesTableProps) {
  const { t } = useTranslation();
  const canViewCost = useAuthStore((state) => state.hasPermission('view_cost'));
  const canManagePrices = useAuthStore((state) => state.hasPermission('manage_prices')) && !locked;
  const canDelete = useAuthStore((state) => state.hasPermission('delete_records')) && !locked;
  const [lineToRemove, setLineToRemove] = useState<BatchLine | null>(null);
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
              canDelete={canDelete}
              onSetPrice={onSetPrice}
              onDelete={setLineToRemove}
            />
          ))}
        </TableBody>
      </Table>
      <RemoveLineDialog
        open={lineToRemove !== null}
        onOpenChange={(open) => {
          if (!open) setLineToRemove(null);
        }}
        batchId={batchId}
        line={lineToRemove}
      />
    </div>
  );
}
