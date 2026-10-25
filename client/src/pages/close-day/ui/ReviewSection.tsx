import { useTranslation } from 'react-i18next';
import { Receipt, RotateCcw, ShoppingBag, TrendingUp } from 'lucide-react';
import { Badge, Card } from '@/shared/ui';
import { cn, money } from '@/shared/lib';
import { SaleConfirmBadge, useSale } from '@/entities/sale';
import type { CurrentBusinessDay, FlagRefType } from '@/entities/business-day';
import type { CloseDayForm } from '../model/useCloseDayForm';
import { CARD, NUM } from './constants';
import { FlaggableRow } from './FlaggableRow';

/** Lazy sale detail (line items + payment breakdown), fetched only when a sale row is expanded. */
function SaleDetailPanel({ saleId }: { saleId: number }) {
  const { t } = useTranslation();
  const { data, isLoading } = useSale(saleId);
  if (isLoading) return <p className="px-1 text-[11px] text-slate/70">{t('common.loading')}</p>;
  if (!data) return null;
  return (
    <div className="space-y-2 rounded-xl border border-hairline-silver/50 bg-studio-mist/40 p-3 dark:bg-control-gray/25">
      <div className="space-y-1">
        {data.items.map((it) => {
          const code = it.item?.identifiers[0]?.value;
          return (
            <div key={it.id} className="flex items-center justify-between gap-3 text-xs">
              <span className="min-w-0 truncate font-medium text-ink">
                {it.productModel.name}
                {it.quantity > 1 ? ` ×${it.quantity}` : ''}
                {code ? <span className="ml-1 text-[11px] font-normal text-slate">({code})</span> : ''}
              </span>
              <span className={cn('shrink-0 font-sf-pro-display tabular-nums text-slate', NUM)}>{money(it.unitPrice)}</span>
            </div>
          );
        })}
      </div>
      <div className="flex flex-wrap items-center gap-2 border-t border-hairline-silver/40 pt-2 text-[11px]">
        {data.payments.map((p) => (
          <span key={p.id} className="inline-flex items-center gap-1 rounded-md bg-card px-2 py-0.5 border border-hairline-silver/60 text-slate">
            <span>{p.method === 'CASH' ? t('closeDay.methodCash') : t('closeDay.methodCard')}:</span>
            <span className="font-semibold text-ink font-sf-pro-display tabular-nums">{money(p.amount)}</span>
          </span>
        ))}
      </div>
    </div>
  );
}

interface ReviewTileProps {
  icon: React.ReactNode;
  iconBg: string;
  title: string;
  count: number;
  totalSum?: number;
  emptyText: string;
  /** Optional header button shown beside the count chip (e.g. Confirm all). */
  action?: React.ReactNode;
  children: React.ReactNode;
}

/** One review card (also used by the waiting tiles): a titled, scrollable list with a count/sum chip and an empty state. */
export function ReviewTile({ icon, iconBg, title, count, totalSum, emptyText, action, children }: ReviewTileProps) {
  return (
    <Card className={cn(CARD, 'flex flex-col p-6')}>
      <div className="mb-3.5 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className={cn('flex h-8 w-8 items-center justify-center rounded-xl', iconBg)}>
            {icon}
          </div>
          <h3 className="font-sf-pro-display text-[15px] font-semibold tracking-[-0.01em] text-ink">{title}</h3>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="border-hairline-silver/60 bg-control-gray/40 text-[11px] font-medium tabular-nums text-slate">
            {count > 0 && totalSum != null ? `${count} · ${money(totalSum.toFixed(2))}` : count}
          </Badge>
          {action}
        </div>
      </div>
      {count === 0 ? (
        <div className="flex flex-1 items-center justify-center py-8 text-center">
          <p className="text-xs text-slate/70">{emptyText}</p>
        </div>
      ) : (
        <div className="-mx-1 max-h-72 space-y-1 overflow-y-auto pr-1">{children}</div>
      )}
    </Card>
  );
}

/** Right-aligned amount with a secondary line (seller, reason, cash/bank, …). */
export function RowBody({ primary, secondary, amount, amountClass }: { primary: string; secondary?: string; amount: string; amountClass?: string }) {
  return (
    <div className="flex items-baseline justify-between gap-3">
      <div className="min-w-0">
        <p className="truncate text-xs font-medium text-ink">{primary}</p>
        {secondary && <p className="truncate text-[11px] text-slate/80">{secondary}</p>}
      </div>
      <span className={cn('shrink-0 font-sf-pro-display text-xs font-semibold tabular-nums tracking-[-0.01em]', amountClass ?? 'text-ink')}>
        {amount}
      </span>
    </div>
  );
}

function SalesTile({ data, form }: { data: CurrentBusinessDay; form: CloseDayForm }) {
  const { t } = useTranslation();
  const total = data.sales.reduce((sum, s) => sum + Number(s.total || 0), 0);
  return (
    <ReviewTile
      icon={<ShoppingBag className="h-4 w-4 text-apple-blue dark:text-apple-blue" />}
      iconBg="bg-apple-blue/15 dark:bg-apple-blue/25"
      title={t('closeDay.sales')}
      count={data.sales.length}
      totalSum={total}
      emptyText={t('closeDay.noSalesToday')}
    >
      {data.sales.map((s) => (
        <FlaggableRow key={s.id} refType="SALE" refId={s.id} form={form} detail={<SaleDetailPanel saleId={s.id} />}>
          <div className="flex items-center gap-2">
            <div className="min-w-0 flex-1">
              <RowBody primary={`#${s.id}`} secondary={s.seller?.name ?? t('closeDay.unknownSeller')} amount={money(s.total)} />
            </div>
            <SaleConfirmBadge confirmedAt={s.confirmedAt} />
          </div>
        </FlaggableRow>
      ))}
    </ReviewTile>
  );
}

function ReturnsTile({ data, form }: { data: CurrentBusinessDay; form: CloseDayForm }) {
  const { t } = useTranslation();
  const total = data.returns.reduce((sum, r) => sum + Number(r.refundAmount || 0), 0);
  return (
    <ReviewTile
      icon={<RotateCcw className="h-4 w-4 text-destructive" />}
      iconBg="bg-destructive/15 dark:bg-destructive/25"
      title={t('closeDay.returns')}
      count={data.returns.length}
      totalSum={total}
      emptyText={t('closeDay.noReturnsToday')}
    >
      {data.returns.map((r) => (
        <FlaggableRow key={r.id} refType="RETURN" refId={r.id} form={form}>
          <RowBody
            primary={r.item}
            secondary={`${t('closeDay.cashBack')} ${money(r.cashRefund)} · ${r.reason || '—'}`}
            amount={money(r.refundAmount)}
            amountClass="text-destructive font-bold"
          />
        </FlaggableRow>
      ))}
    </ReviewTile>
  );
}

function LedgerTile({
  title, icon, iconBg, rows, refType, form, amountClass, emptyText,
}: {
  title: string;
  icon: React.ReactNode;
  iconBg: string;
  rows: CurrentBusinessDay['expenses'];
  refType: FlagRefType;
  form: CloseDayForm;
  amountClass: string;
  emptyText: string;
}) {
  const { t } = useTranslation();
  const total = rows.reduce((sum, r) => sum + Number(r.amount || 0), 0);
  return (
    <ReviewTile
      icon={icon}
      iconBg={iconBg}
      title={title}
      count={rows.length}
      totalSum={total}
      emptyText={emptyText}
    >
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
    <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
      <SalesTile data={data} form={form} />
      <ReturnsTile data={data} form={form} />
      <LedgerTile
        title={t('closeDay.expenses')}
        icon={<Receipt className="h-4 w-4 text-launch-orange dark:text-launch-orange" />}
        iconBg="bg-launch-orange/15 dark:bg-launch-orange/25"
        rows={data.expenses}
        refType="EXPENSE"
        form={form}
        amountClass="text-launch-orange font-bold"
        emptyText={t('closeDay.noExpensesToday')}
      />
      <LedgerTile
        title={t('closeDay.income')}
        icon={<TrendingUp className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />}
        iconBg="bg-emerald-500/15 dark:bg-emerald-500/25"
        rows={data.income}
        refType="INCOME"
        form={form}
        amountClass="text-emerald-600 dark:text-emerald-400 font-bold"
        emptyText={t('closeDay.noIncomeToday')}
      />
    </div>
  );
}

