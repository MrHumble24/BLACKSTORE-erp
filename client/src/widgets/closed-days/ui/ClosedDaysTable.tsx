import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Table, TableBody, TableEmptyRow, TableHead, TableHeader, TableLoadingRow, TablePagination, TableRow,
} from '@/shared/ui';
import { CLOSED_DAYS_PAGE_SIZE, useClosedDays, type ClosedDaySnapshot } from '@/entities/business-day';
import { EditClosedDayDialog } from '@/features/edit-closed-day';
import { ClosedDayRow } from './ClosedDayRow';

const COLUMNS = 10;

/** Two-row header: per-drawer groups (cash, card) over expected / counted / variance. */
function ClosedDaysHeader() {
  const { t } = useTranslation();
  const drawerCols = [t('closeDay.expected'), t('closeDay.counted'), t('closeDay.variance')];
  return (
    <TableHeader>
      <TableRow className="hover:bg-transparent">
        <TableHead rowSpan={2}>{t('closeDay.closedAt')}</TableHead>
        <TableHead colSpan={3} className="text-center">{t('closeDay.cashDrawer')}</TableHead>
        <TableHead colSpan={3} className="text-center">{t('closeDay.card')}</TableHead>
        <TableHead rowSpan={2}>{t('closeDay.closedBy')}</TableHead>
        <TableHead rowSpan={2}>{t('closeDay.note')}</TableHead>
        <TableHead rowSpan={2} className="text-right">{t('common.actions')}</TableHead>
      </TableRow>
      <TableRow className="border-b border-hairline-silver/60 hover:bg-transparent">
        {['cash', 'card'].flatMap((drawer) =>
          drawerCols.map((label) => <TableHead key={`${drawer}-${label}`} className="text-right">{label}</TableHead>),
        )}
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
    <div className="overflow-hidden rounded-[28px] border border-hairline-silver/70 bg-card text-card-foreground">
      <Table>
        <ClosedDaysHeader />
        <TableBody>
          {isLoading && <TableLoadingRow colSpan={COLUMNS} />}
          {!isLoading && items.length === 0 && <TableEmptyRow colSpan={COLUMNS} message={t('closeDay.historyEmpty')} />}
          {items.map((day) => <ClosedDayRow key={day.id} day={day} onEdit={setEditing} />)}
        </TableBody>
      </Table>
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
