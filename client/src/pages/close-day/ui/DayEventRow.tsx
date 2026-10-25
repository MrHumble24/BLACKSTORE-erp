import { useTranslation } from 'react-i18next';
import type { TFunction } from 'i18next';
import { Badge } from '@/shared/ui';
import { cn, formatTime, money } from '@/shared/lib';
import type { DayEvent, DayEventKind } from '@/entities/business-day';
import type { CloseDayForm } from '../model/useCloseDayForm';
import { EVENT_GRID } from './constants';
import { FlaggableRow } from './FlaggableRow';

const IN = 'border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-300';
const OUT = 'border-launch-orange/30 bg-launch-orange/10 text-launch-orange dark:bg-launch-orange/20 dark:text-launch-orange';
const STOCK = 'border-slate/30 bg-slate/10 text-slate dark:bg-slate/20 dark:text-slate-300';
const OTHER = 'border-apple-blue/30 bg-apple-blue/10 text-apple-blue dark:bg-apple-blue/20 dark:text-blue-300';

/** Badge colour per kind: money in, money out, stock movement, or other (sales, whose money arrives as payments). */
const KIND_TONE: Record<DayEventKind, string> = {
  PAYMENT: IN, INCOME: IN, INVESTOR_DEPOSIT: IN, SALE_CONFIRMED: IN,
  RETURN: OUT, EXPENSE: OUT, WALK_IN_PAYOUT: OUT, SUPPLIER_PAYMENT: OUT, INVESTOR_PAYOUT: OUT,
  BATCH_RECEIVED: STOCK, WALK_IN_PURCHASE: STOCK, STOCK_RECEIVED: STOCK, HANDOVER: STOCK, CONSIGNMENT_RETURNED: STOCK,
  TRANSFER: STOCK, STOCK_COUNT: STOCK,
  SALE: OTHER, CONSIGNMENT_SOLD: OTHER,
};

/** "+$200.00" / "−$150.00" from the server's signed decimal string. */
function signed(value: string): string {
  return `${value.startsWith('-') ? '−' : '+'}${money(value.replace(/^[+-]/, ''))}`;
}

/** The drawer column: cash effect in green/orange, a card effect in slate, or a dash. */
function DrawerEffect({ event }: { event: DayEvent }) {
  const { t } = useTranslation();
  if (event.cash) {
    const out = event.cash.startsWith('-');
    return (
      <span className={cn('font-sf-pro-display font-semibold tracking-[-0.01em]', out ? 'text-launch-orange' : 'text-emerald-600 dark:text-emerald-400')}>
        {signed(event.cash)}
      </span>
    );
  }
  if (event.card) {
    return (
      <span className="font-sf-pro-display text-slate">
        {t('closeDay.methodCard')} {signed(event.card)}
      </span>
    );
  }
  return <span className="text-slate/40">—</span>;
}

/** The secondary line: raw subtitle plus the translated structured fields, joined by dots. */
function secondaryLine(event: DayEvent, t: TFunction): string {
  const { subtitle, count, method, fee, finished } = event;
  return [
    subtitle,
    count != null ? t('closeDay.itemsCount', { n: count }) : null,
    method ? t(method === 'CASH' ? 'closeDay.methodCash' : 'closeDay.methodCard') : null,
    fee ? t('closeDay.fee', { amount: money(fee) }) : null,
    finished != null ? t(finished ? 'closeDay.countFinished' : 'closeDay.countInProgress') : null,
  ].filter(Boolean).join(' · ');
}

/** The cells of one event: time, kind, title/subtitle, who, amount, drawer effect. */
function EventCells({ event }: { event: DayEvent }) {
  const { t } = useTranslation();
  const secondary = secondaryLine(event, t);
  return (
    <div className={cn(EVENT_GRID, 'text-xs')}>
      <span className="font-sf-pro-display text-[11px] font-medium text-slate">{formatTime(event.time)}</span>
      <Badge variant="outline" className={cn('w-fit text-[11px] font-medium', KIND_TONE[event.kind])}>
        {t(`closeDay.kind.${event.kind}`)}
      </Badge>
      <div className="min-w-0">
        <p className="truncate font-medium text-ink">{event.title}</p>
        {secondary && <p className="truncate text-[11px] text-slate/80">{secondary}</p>}
      </div>
      <span className="truncate text-slate">{event.user?.name ?? '—'}</span>
      <span className="text-right font-sf-pro-display font-semibold tabular-nums text-ink">{money(event.amount)}</span>
      <span className="text-right"><DrawerEffect event={event} /></span>
    </div>
  );
}

/** One feed row; rows backed by a flaggable record get the same flag control as the review tiles. */
export function DayEventRow({ event, form }: { event: DayEvent; form: CloseDayForm }) {
  if (event.refType && event.refId !== null) {
    return (
      <FlaggableRow refType={event.refType} refId={event.refId} form={form}>
        <EventCells event={event} />
      </FlaggableRow>
    );
  }
  return (
    <div className="flex items-center gap-2 rounded-xl px-3 py-2.5 transition-colors hover:bg-studio-mist/50 dark:hover:bg-control-gray/20">
      <div className="min-w-0 flex-1"><EventCells event={event} /></div>
      {/* Spacer the width of the flag button so columns stay aligned with flaggable rows. */}
      <span className="w-[28px] shrink-0" />
    </div>
  );
}

