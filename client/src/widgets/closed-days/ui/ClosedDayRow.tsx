import { useTranslation } from 'react-i18next';
import { Pencil } from 'lucide-react';
import { Button, TableCell, TableRow } from '@/shared/ui';
import { formatDate, formatTime, money } from '@/shared/lib';
import { VarianceBadge, type ClosedDaySnapshot } from '@/entities/business-day';

const MONEY_CELL = 'text-right font-sf-pro-display text-xs tabular-nums tracking-[-0.02em] text-ink';

/** Expected, counted and variance cells for one drawer; a missing variance reads as a dash. */
function DrawerCells({ expected, counted, diff }: { expected: string | null; counted: string | null; diff: string | null }) {
  return (
    <>
      <TableCell className={MONEY_CELL}>{money(expected)}</TableCell>
      <TableCell className={MONEY_CELL}>{money(counted)}</TableCell>
      <TableCell className="text-right">
        {diff == null ? <span className="text-xs text-slate">—</span> : <VarianceBadge diff={Number(diff)} />}
      </TableCell>
    </>
  );
}

/** One closed day: when, the frozen expected vs counted per drawer, who closed it, the note and Edit. */
export function ClosedDayRow({ day, onEdit }: { day: ClosedDaySnapshot; onEdit: (day: ClosedDaySnapshot) => void }) {
  const { t } = useTranslation();
  return (
    <TableRow className="border-b border-hairline-silver/40 hover:bg-studio-mist/60">
      <TableCell className="whitespace-nowrap">
        <p className="text-xs font-medium text-ink">{formatDate(day.closedAt)}</p>
        <p className="text-[11px] tabular-nums text-slate">{formatTime(day.openedAt)} → {formatTime(day.closedAt)}</p>
      </TableCell>
      <DrawerCells expected={day.expectedCash} counted={day.countedCash} diff={day.cashVariance} />
      <DrawerCells expected={day.expectedCard} counted={day.countedCard} diff={day.cardVariance} />
      <TableCell className="text-xs text-slate">{day.closedBy?.name ?? '—'}</TableCell>
      <TableCell className="max-w-[220px] truncate text-xs text-slate" title={day.note ?? undefined}>
        {day.note || '—'}
      </TableCell>
      <TableCell className="text-right">
        <Button type="button" variant="ghost" size="sm" onClick={() => onEdit(day)} className="h-7 rounded-full px-3 text-xs">
          <Pencil className="h-3.5 w-3.5" />
          {t('common.edit')}
        </Button>
      </TableCell>
    </TableRow>
  );
}
