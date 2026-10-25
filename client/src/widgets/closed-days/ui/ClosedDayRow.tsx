import { useTranslation } from 'react-i18next';
import { Clock, Pencil, User } from 'lucide-react';
import { Button, TableCell, TableRow } from '@/shared/ui';
import { formatDate, formatTime, money } from '@/shared/lib';
import { VarianceBadge, type ClosedDaySnapshot } from '@/entities/business-day';

const MONEY_CELL = 'text-right font-sf-pro-display text-xs font-semibold tabular-nums tracking-[-0.01em] text-ink';

/** Expected, counted and variance cells for one drawer; a missing variance reads as a dash. */
function DrawerCells({
  expected, counted, diff, bgClass, isLast,
}: {
  expected: string | null;
  counted: string | null;
  diff: string | null;
  bgClass: string;
  isLast?: boolean;
}) {
  return (
    <>
      <TableCell className={`${MONEY_CELL} ${bgClass}`}>{money(expected)}</TableCell>
      <TableCell className={`${MONEY_CELL} ${bgClass}`}>{money(counted)}</TableCell>
      <TableCell className={`text-right ${bgClass} ${isLast ? 'border-r border-hairline-silver/40' : ''}`}>
        {diff == null ? <span className="text-xs text-slate/50">—</span> : <VarianceBadge diff={Number(diff)} />}
      </TableCell>
    </>
  );
}

/** One closed day: when, the frozen expected vs counted per drawer, who closed it, the note and Edit. */
export function ClosedDayRow({ day, onEdit }: { day: ClosedDaySnapshot; onEdit: (day: ClosedDaySnapshot) => void }) {
  const { t } = useTranslation();
  return (
    <TableRow className="border-b border-hairline-silver/40 transition-colors hover:bg-studio-mist/60 dark:hover:bg-control-gray/25">
      <TableCell className="whitespace-nowrap py-3">
        <p className="font-sf-pro-display text-xs font-semibold text-ink">{formatDate(day.closedAt)}</p>
        <div className="flex items-center gap-1 text-[11px] tabular-nums text-slate">
          <Clock className="h-3 w-3 opacity-60" />
          <span>{formatTime(day.openedAt)} → {formatTime(day.closedAt)}</span>
        </div>
      </TableCell>
      <DrawerCells expected={day.expectedCash} counted={day.countedCash} diff={day.cashVariance} bgClass="bg-emerald-500/[0.015]" isLast />
      <DrawerCells expected={day.expectedCard} counted={day.countedCard} diff={day.cardVariance} bgClass="bg-apple-blue/[0.015]" isLast />
      <TableCell className="py-3">
        <div className="flex items-center gap-1.5 text-xs text-slate">
          <User className="h-3.5 w-3.5 shrink-0 opacity-60" />
          <span className="truncate">{day.closedBy?.name ?? '—'}</span>
        </div>
      </TableCell>
      <TableCell className="max-w-[200px] truncate text-xs text-slate py-3" title={day.note ?? undefined}>
        {day.note || '—'}
      </TableCell>
      <TableCell className="text-right py-3">
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => onEdit(day)}
          className="h-8 gap-1.5 rounded-xl px-2.5 text-xs text-slate hover:bg-control-gray/50 hover:text-ink"
        >
          <Pencil className="h-3.5 w-3.5" />
          {t('common.edit')}
        </Button>
      </TableCell>
    </TableRow>
  );
}

