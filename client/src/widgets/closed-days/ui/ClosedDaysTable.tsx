import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Banknote, CreditCard } from 'lucide-react';
import {
  Table, TableBody, TableEmptyRow, TableHead, TableHeader, TableLoadingRow, TablePagination, TableRow,
} from '@/shared/ui';
import { CLOSED_DAYS_PAGE_SIZE, useClosedDays, type ClosedDaySnapshot } from '@/entities/business-day';
import { EditClosedDayDialog } from '@/features/edit-closed-day';
import { ClosedDayRow } from './ClosedDayRow';

const COLUMNS = 10;

/** Two-row header: per-drawer groups (cash, card) with distinct borders and background tones. */
function ClosedDaysHeader() {
  const { t } = useTranslation();
  const drawerCols = [t('closeDay.expected'), t('closeDay.counted'), t('closeDay.variance')];

  return (
    <TableHeader>
      <TableRow className="border-b border-hairline-silver/50 hover:bg-transparent">
        <TableHead rowSpan={2} className="w-[180px] font-semibold text-ink">{t('closeDay.closedAt')}</TableHead>
        <TableHead colSpan={3} className="border-x border-hairline-silver/50 bg-emerald-500/[0.04] text-center font-semibold text-emerald-700 dark:text-emerald-400">
          <div className="flex items-center justify-center gap-1.5">
            <Banknote className="h-3.5 w-3.5" />
            <span>{t('closeDay.cashDrawer')}</span>
          </div>
        </TableHead>
        <TableHead colSpan={3} className="border-r border-hairline-silver/50 bg-apple-blue/[0.04] text-center font-semibold text-apple-blue">
          <div className="flex items-center justify-center gap-1.5">
            <CreditCard className="h-3.5 w-3.5" />
            <span>{t('closeDay.card')}</span>
          </div>
        </TableHead>
        <TableHead rowSpan={2} className="font-semibold text-ink">{t('closeDay.closedBy')}</TableHead>
        <TableHead rowSpan={2} className="font-semibold text-ink">{t('closeDay.note')}</TableHead>
        <TableHead rowSpan={2} className="text-right font-semibold text-ink">{t('common.actions')}</TableHead>
      </TableRow>
      <TableRow className="border-b border-hairline-silver/60 hover:bg-transparent text-[11px]">
        {drawerCols.map((label) => (
          <TableHead key={`cash-${label}`} className="bg-emerald-500/[0.02] text-right font-medium text-slate">
            {label}
          </TableHead>
        ))}
        {drawerCols.map((label) => (
          <TableHead key={`card-${label}`} className="bg-apple-blue/[0.02] text-right font-medium text-slate">
            {label}
          </TableHead>
        ))}
      </TableRow>
    </TableHeader>
  );
}

/** Paginated history of closed days (newest first) with an Edit action to correct the counts (F28). */
export function ClosedDaysTable() {
  const { t } = useTranslation();
  const [page, setPage] = useState(1);
  const [editing, setEditing] = useState<ClosedDaySnapshot | null>(null);
  const { data, isLoading } = useClosedDays(page);
  const items = data?.items ?? [];
  const total = data?.total ?? 0;

  return (
    <div className="overflow-hidden rounded-[28px] border border-hairline-silver/70 bg-card text-card-foreground shadow-2xs">
      <div className="overflow-x-auto">
        <Table>
          <ClosedDaysHeader />
          <TableBody>
            {isLoading && <TableLoadingRow colSpan={COLUMNS} />}
            {!isLoading && items.length === 0 && <TableEmptyRow colSpan={COLUMNS} message={t('closeDay.historyEmpty')} />}
            {items.map((day) => <ClosedDayRow key={day.id} day={day} onEdit={setEditing} />)}
          </TableBody>
        </Table>
      </div>
      {total > 0 && (
        <TablePagination
          page={page}
          totalPages={Math.max(1, Math.ceil(total / CLOSED_DAYS_PAGE_SIZE))}
          total={total}
          onPageChange={setPage}
        />
      )}
      {editing && (
        <EditClosedDayDialog day={editing} onOpenChange={(open) => !open && setEditing(null)} />
      )}
    </div>
  );
}

