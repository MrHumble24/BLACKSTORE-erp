import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  TableLoadingRow,
  TableEmptyRow,
} from '@/shared/ui';
import { useAuthStore } from '@/entities/session';
import { formatMoney } from '@/shared/lib';
import type { BatchSummary } from '../model/types';

/** Table header; cost columns render only for view_cost users (never empty columns). */
function BatchTableHeader({ showSupplier, showSplit, canViewCost }: {
  showSupplier: boolean;
  showSplit: boolean;
  canViewCost: boolean;
}) {
  const { t } = useTranslation();
  return (
    <TableHeader>
      <TableRow className="border-b border-hairline-silver/60 hover:bg-transparent">
        <TableHead>{t('batches.arrivalDate')}</TableHead>
        {showSupplier && <TableHead>{t('batches.supplier')}</TableHead>}
        <TableHead>{t('batches.owner')}</TableHead>
        <TableHead>{t('batches.location')}</TableHead>
        <TableHead className="text-right">{t('batches.devices')}</TableHead>
        <TableHead className="text-right">{t('batches.accessoryUnits')}</TableHead>
        {showSplit && <TableHead>{t('batches.costSplitMethod')}</TableHead>}
        {canViewCost && (
          <>
            <TableHead className="text-right">{t('batches.itemsCost')}</TableHead>
            <TableHead className="text-right">{t('batches.extraCostTotal')}</TableHead>
          </>
        )}
      </TableRow>
    </TableHeader>
  );
}

/** One batch row; clicking opens the batch detail page. */
function BatchRow({ batch, showSupplier, showSplit, canViewCost }: {
  batch: BatchSummary;
  showSupplier: boolean;
  showSplit: boolean;
  canViewCost: boolean;
}) {
  const navigate = useNavigate();
  const { t } = useTranslation();

  return (
    <TableRow
      onClick={() => navigate(`/batches/${batch.id}`)}
      className="border-b border-hairline-silver/40 hover:bg-studio-mist/60 cursor-pointer"
    >
      <TableCell className="text-xs text-slate">{batch.arrivalDate.slice(0, 10)}</TableCell>
      {showSupplier && (
        <TableCell className="text-xs font-medium text-ink">{batch.supplier.name}</TableCell>
      )}
      <TableCell className="text-xs text-ink">{batch.investor.name}</TableCell>
      <TableCell className="text-xs text-slate">{batch.location.name}</TableCell>
      <TableCell className="text-right text-xs text-ink">{batch.deviceCount}</TableCell>
      <TableCell className="text-right text-xs text-ink">{batch.accessoryUnits}</TableCell>
      {showSplit && <TableCell className="text-xs text-slate">{t(`batches.split.${batch.costSplitMethod}`)}</TableCell>}
      {canViewCost && (
        <>
          <TableCell className="text-right text-xs font-medium text-ink">
            {formatMoney(batch.itemsCost)}
          </TableCell>
          <TableCell className="text-right text-xs font-medium text-ink">
            {formatMoney(batch.extraCostTotal)}
          </TableCell>
        </>
      )}
    </TableRow>
  );
}

interface BatchSummaryTableProps {
  batches: BatchSummary[];
  isLoading: boolean;
  /** Show the supplier column (used on the batches list page). */
  showSupplier?: boolean;
  /** Show the cost-split-method column (used on the batches list page). */
  showSplit?: boolean;
  emptyMessage?: string;
}

/**
 * Batch summary table shared by the batches list page and the supplier detail page.
 * Cost columns (itemsCost, extraCostTotal) render only with view_cost.
 */
export function BatchSummaryTable({
  batches,
  isLoading,
  showSupplier = false,
  showSplit = false,
  emptyMessage,
}: BatchSummaryTableProps) {
  const { t } = useTranslation();
  const canViewCost = useAuthStore((state) => state.hasPermission('view_cost'));
  const colSpan = 3 + (showSupplier ? 1 : 0) + (showSplit ? 1 : 0) + (canViewCost ? 2 : 0) + 2;

  return (
    <div className="rounded-[28px] border border-hairline-silver/70 bg-gallery-white overflow-hidden shadow-none p-1">
      <Table>
        <BatchTableHeader showSupplier={showSupplier} showSplit={showSplit} canViewCost={canViewCost} />
        <TableBody>
          {isLoading && <TableLoadingRow colSpan={colSpan} />}
          {!isLoading && batches.length === 0 && (
            <TableEmptyRow colSpan={colSpan} message={emptyMessage ?? t('batches.noBatches')} />
          )}
          {!isLoading && batches.map((batch) => (
            <BatchRow
              key={batch.id}
              batch={batch}
              showSupplier={showSupplier}
              showSplit={showSplit}
              canViewCost={canViewCost}
            />
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
