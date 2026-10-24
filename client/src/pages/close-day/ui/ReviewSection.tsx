import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ChevronRight, Flag } from 'lucide-react';
import { Card, Input } from '@/shared/ui';
import { cn, money } from '@/shared/lib';
import { useSale } from '@/entities/sale';
import type { CurrentBusinessDay, FlagRefType } from '@/entities/business-day';
import type { CloseDayForm } from '../model/useCloseDayForm';
import { CARD } from './constants';

/**
 * A review row the owner can flag as suspicious with a short reason (collected for the close
 * payload). When `detail` is given, the row's main area expands/collapses to reveal it on click.
 */
function FlaggableRow({
  refType, refId, form, children, detail,
}: {
  refType: FlagRefType;
  refId: number;
  form: CloseDayForm;
  children: React.ReactNode;
  detail?: React.ReactNode;
}) {
  const { t } = useTranslation();
  const reason = form.reasonOf(refType, refId);
  const flagged = reason.trim() !== '';
  const [flagOpen, setFlagOpen] = useState(flagged);
  const [expanded, setExpanded] = useState(false);

  return (
    <div className={cn('rounded-xl px-3 py-2', flagged && 'bg-launch-orange/5 ring-1 ring-launch-orange/30')}>
      <div className="flex items-center gap-2">
        {detail ? (
          <button
            type="button"
            onClick={() => setExpanded((e) => !e)}
            aria-expanded={expanded}
            className="flex min-w-0 flex-1 items-center gap-1.5 text-left"
          >
            <ChevronRight className={cn('h-3.5 w-3.5 shrink-0 text-slate/40 transition-transform', expanded && 'rotate-90')} />
            <div className="min-w-0 flex-1">{children}</div>
          </button>
        ) : (
          <div className="min-w-0 flex-1">{children}</div>
        )}
        <button
          type="button"
          onClick={() => setFlagOpen((o) => !o)}
          aria-label={t('closeDay.flag')}
          className={cn(
            'shrink-0 rounded-full p-1.5 transition-colors',
            flagged ? 'text-launch-orange' : 'text-slate/50 hover:bg-control-gray/60 hover:text-slate',
          )}
        >
          <Flag className="h-3.5 w-3.5" fill={flagged ? 'currentColor' : 'none'} />
        </button>
      </div>
      {expanded && detail && <div className="mt-2">{detail}</div>}
      {flagOpen && (
        <Input
          value={reason}
          onChange={(e) => form.setFlag(refType, refId, e.target.value)}
          placeholder={t('closeDay.flagReason')}
          className="mt-2 h-8 text-xs"
        />
      )}
    </div>
  );
}

/** Lazy sale detail (line items + payment breakdown), fetched only when a sale row is expanded. */
function SaleDetailPanel({ saleId }: { saleId: number }) {
  const { t } = useTranslation();
  const { data, isLoading } = useSale(saleId);
  if (isLoading) return <p className="px-1 text-[11px] text-slate/70">{t('common.loading')}</p>;
  if (!data) return null;
  return (
    <div className="space-y-1.5 rounded-lg bg-studio-mist/30 p-2.5">
      <div className="space-y-1">
        {data.items.map((it) => {
          const code = it.item?.identifiers[0]?.value;
          return (
            <div key={it.id} className="flex items-baseline justify-between gap-3 text-[11px]">
              <span className="min-w-0 truncate text-ink">
                {it.productModel.name}{it.quantity > 1 ? ` ×${it.quantity}` : ''}{code ? ` · ${code}` : ''}
              </span>
              <span className="shrink-0 tabular-nums text-slate">{money(it.unitPrice)}</span>
            </div>
          );
        })}
      </div>
      <div className="space-y-0.5 border-t border-hairline-silver/40 pt-1.5">
        {data.payments.map((p) => (
          <div key={p.id} className="flex items-baseline justify-between gap-3 text-[11px] text-slate/80">
            <span>{p.method === 'CASH' ? t('closeDay.methodCash') : t('closeDay.methodCard')}</span>
            <span className="tabular-nums">{money(p.amount)}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

/** One review card: a titled, scrollable list with a count chip and an empty state. */
function ReviewTile({ title, count, children }: { title: string; count: number; children: React.ReactNode }) {
  const { t } = useTranslation();
  return (
    <Card className={cn(CARD, 'flex flex-col p-5')}>
      <div className="mb-3 flex items-center justify-between">
        <h3 className="text-[13px] font-semibold tracking-[-0.01em] text-ink">{title}</h3>
        <span className="rounded-full bg-control-gray px-2 py-0.5 text-[11px] font-medium tabular-nums text-slate">{count}</span>
      </div>
      {count === 0 ? (
        <p className="py-3 text-center text-[12px] text-slate/70">{t('closeDay.noneToday')}</p>
      ) : (
        <div className="-mx-1 max-h-72 space-y-0.5 overflow-y-auto pr-1">{children}</div>
      )}
    </Card>
  );
}

/** Right-aligned amount with a secondary line (seller, reason, cash/bank, …). */
function RowBody({ primary, secondary, amount, amountClass }: { primary: string; secondary?: string; amount: string; amountClass?: string }) {
  return (
    <div className="flex items-baseline justify-between gap-3">
      <div className="min-w-0">
        <p className="truncate text-[13px] text-ink">{primary}</p>
        {secondary && <p className="truncate text-[11px] text-slate/80">{secondary}</p>}
      </div>
      <span className={cn('shrink-0 text-[13px] font-semibold tabular-nums', amountClass ?? 'text-ink')}>{amount}</span>
    </div>
  );
}

function SalesTile({ data, form }: { data: CurrentBusinessDay; form: CloseDayForm }) {
  const { t } = useTranslation();
  return (
    <ReviewTile title={t('closeDay.sales')} count={data.sales.length}>
      {data.sales.map((s) => (
        <FlaggableRow key={s.id} refType="SALE" refId={s.id} form={form} detail={<SaleDetailPanel saleId={s.id} />}>
          <RowBody primary={`#${s.id}`} secondary={s.seller?.name ?? t('closeDay.unknownSeller')} amount={money(s.total)} />
        </FlaggableRow>
      ))}
    </ReviewTile>
  );
}

function ReturnsTile({ data, form }: { data: CurrentBusinessDay; form: CloseDayForm }) {
  const { t } = useTranslation();
  return (
    <ReviewTile title={t('closeDay.returns')} count={data.returns.length}>
      {data.returns.map((r) => (
        <FlaggableRow key={r.id} refType="RETURN" refId={r.id} form={form}>
          <RowBody
            primary={r.item}
            secondary={`${t('closeDay.cashBack')} ${money(r.cashRefund)} · ${r.reason || '—'}`}
            amount={money(r.refundAmount)}
            amountClass="text-destructive"
          />
        </FlaggableRow>
      ))}
    </ReviewTile>
  );
}

function LedgerTile({
  title, rows, refType, form, amountClass,
}: {
  title: string;
  rows: CurrentBusinessDay['expenses'];
  refType: FlagRefType;
  form: CloseDayForm;
  amountClass: string;
}) {
  const { t } = useTranslation();
  return (
    <ReviewTile title={title} count={rows.length}>
      {rows.map((e) => (
        <FlaggableRow key={e.id} refType={refType} refId={e.id} form={form}>
          <RowBody
            primary={e.category}
            secondary={e.inCash ? t('closeDay.fromCash') : t('closeDay.fromBank')}
            amount={money(e.amount)}
            amountClass={amountClass}
          />
        </FlaggableRow>
      ))}
    </ReviewTile>
  );
}

/** The four review lists (sales, returns, expenses, income), each row flaggable, in a bento grid. */
export function ReviewSection({ data, form }: { data: CurrentBusinessDay; form: CloseDayForm }) {
  const { t } = useTranslation();
  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
      <SalesTile data={data} form={form} />
      <ReturnsTile data={data} form={form} />
      <LedgerTile title={t('closeDay.expenses')} rows={data.expenses} refType="EXPENSE" form={form} amountClass="text-launch-orange" />
      <LedgerTile title={t('closeDay.income')} rows={data.income} refType="INCOME" form={form} amountClass="text-emerald-600" />
    </div>
  );
}
