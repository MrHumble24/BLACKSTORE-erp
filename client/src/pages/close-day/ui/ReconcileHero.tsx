import { useTranslation } from 'react-i18next';
import { Banknote, Check, Copy, CreditCard, Terminal } from 'lucide-react';
import { Button, Card, Input, Label } from '@/shared/ui';
import { cn, isNonZeroMoney, money } from '@/shared/lib';
import { variance, VarianceBadge, type CashBreakdown, type CurrentBusinessDay } from '@/entities/business-day';
import type { CloseDayForm } from '../model/useCloseDayForm';
import { CARD, NUM } from './constants';

interface CountCardProps {
  icon: React.ReactNode;
  iconBg: string;
  title: string;
  hint: string;
  expected: string;
  counted: string;
  onCounted: (value: string) => void;
  inputId: string;
  children?: React.ReactNode;
}

/** One drawer: the system's expected total, the owner's counted input, and the live variance. */
function CountCard({ icon, iconBg, title, hint, expected, counted, onCounted, inputId, children }: CountCardProps) {
  const { t } = useTranslation();
  const diff = variance(counted, expected);
  const isMatchVal = counted !== '' && diff !== null && Math.abs(diff) < 0.005;

  return (
    <Card className={cn(CARD, 'flex flex-col justify-between p-6 transition-shadow hover:shadow-xs')}>
      <div className="space-y-4">
        {/* Header with icon, title, and variance badge */}
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className={cn('flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl', iconBg)}>
              {icon}
            </div>
            <div>
              <h2 className="font-sf-pro-display text-[15px] font-semibold text-ink">{title}</h2>
              <p className="text-[11px] text-slate">{hint}</p>
            </div>
          </div>
          <VarianceBadge diff={diff} />
        </div>

        {/* Expected Amount */}
        <div className="flex items-baseline justify-between rounded-2xl border border-hairline-silver/40 bg-studio-mist/30 px-4 py-3 dark:bg-control-gray/15">
          <span className="text-xs font-medium text-slate">{t('closeDay.expected')}</span>
          <span className={cn('text-2xl font-bold tracking-tight text-ink sm:text-3xl', NUM)}>
            {money(expected)}
          </span>
        </div>

        {/* Breakdown or context panel */}
        {children}
      </div>

      {/* Counted input area */}
      <div className="mt-5 space-y-2 border-t border-hairline-silver/40 pt-4">
        <div className="flex items-center justify-between">
          <Label htmlFor={inputId} className="text-xs font-medium text-slate">
            {t('closeDay.counted')}
          </Label>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => onCounted(expected)}
            className="h-6 gap-1 rounded-full px-2.5 text-[11px] text-slate hover:bg-studio-mist hover:text-ink dark:hover:bg-control-gray/40"
          >
            {isMatchVal ? <Check className="h-3 w-3 text-emerald-600" /> : <Copy className="h-3 w-3" />}
            {t('closeDay.fillExpected')}
          </Button>
        </div>

        <div className="relative">
          <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 font-sf-pro-display text-xl font-semibold text-slate/70">
            $
          </span>
          <Input
            id={inputId}
            inputMode="decimal"
            placeholder="0.00"
            value={counted}
            onChange={(e) => onCounted(e.target.value)}
            className={cn(
              'h-14 rounded-2xl pl-9 text-2xl font-semibold tracking-tight transition-all',
              'focus-visible:border-apple-blue focus-visible:ring-2 focus-visible:ring-apple-blue/20',
              NUM,
            )}
          />
        </div>
      </div>
    </Card>
  );
}

/** A muted "shown, not counted" line under a breakdown (waiting sales, waiting walk-in payouts). */
function PendingLine({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between text-[11px] text-slate/70">
      <span className="pl-5.5">{label}</span>
      <span className="font-sf-pro-display tabular-nums tracking-[-0.01em]">{money(value)}</span>
    </div>
  );
}

/**
 * How expected cash is built, line by line; the walk-in line is highlighted when money left for it.
 * Waiting sales (F33) and unconfirmed walk-in payouts (F32) are listed last, muted, because they are not counted.
 */
function CashBreakdownLines({ breakdown }: { breakdown: CashBreakdown }) {
  const { t } = useTranslation();
  const lines = [
    { key: 'sales', label: t('closeDay.breakdownSales'), sign: '+', isAdd: true, value: breakdown.paymentsCash },
    { key: 'income', label: t('closeDay.breakdownIncome'), sign: '+', isAdd: true, value: breakdown.cashIncome },
    { key: 'expenses', label: t('closeDay.breakdownExpenses'), sign: '−', isAdd: false, value: breakdown.cashExpense },
    { key: 'refunds', label: t('closeDay.breakdownRefunds'), sign: '−', isAdd: false, value: breakdown.cashRefunds },
    { key: 'walkIn', label: t('closeDay.breakdownWalkInPaid'), sign: '−', isAdd: false, value: breakdown.walkInPurchases },
  ];

  return (
    <div className="rounded-2xl border border-hairline-silver/60 bg-studio-mist/40 p-3.5 dark:bg-control-gray/25">
      <div className="space-y-1.5">
        {lines.map((l) => {
          const highlight = l.key === 'walkIn' && isNonZeroMoney(l.value);
          return (
            <div
              key={l.key}
              className={cn(
                'flex items-center justify-between text-xs text-slate transition-colors',
                highlight && 'rounded-lg bg-launch-orange/10 px-2 py-1 font-semibold text-launch-orange',
              )}
            >
              <div className="flex items-center gap-1.5">
                <span className={cn(
                  'flex h-4 w-4 items-center justify-center rounded-full text-[10px] font-bold',
                  l.isAdd ? 'bg-emerald-500/15 text-emerald-600' : 'bg-launch-orange/15 text-launch-orange',
                )}>
                  {l.sign}
                </span>
                <span>{l.label}</span>
              </div>
              <span className="font-sf-pro-display tabular-nums tracking-[-0.01em]">{money(l.value)}</span>
            </div>
          );
        })}
        <div className="space-y-1 border-t border-hairline-silver/40 pt-1.5">
          <PendingLine label={t('closeDay.breakdownSalesPending')} value={breakdown.pendingSalesCash} />
          <PendingLine label={t('closeDay.breakdownWalkInPending')} value={breakdown.pendingWalkInPurchases} />
        </div>
      </div>
    </div>
  );
}

/** Card breakdown: confirmed card payments, the waiting card sales (not counted), and the terminal hint. */
function CardBreakdownLines({ breakdown }: { breakdown: CashBreakdown }) {
  const { t } = useTranslation();
  return (
    <div className="rounded-2xl border border-hairline-silver/60 bg-studio-mist/40 p-3.5 dark:bg-control-gray/25">
      <div className="space-y-2.5">
        <div className="flex items-center justify-between text-xs text-slate">
          <div className="flex items-center gap-1.5">
            <span className="flex h-4 w-4 items-center justify-center rounded-full bg-emerald-500/15 text-[10px] font-bold text-emerald-600">
              +
            </span>
            <span>{t('closeDay.cardBreakdownSales')}</span>
          </div>
          <span className="font-sf-pro-display tabular-nums tracking-[-0.01em]">{money(breakdown.paymentsCard)}</span>
        </div>
        <PendingLine label={t('closeDay.breakdownSalesPending')} value={breakdown.pendingSalesCard} />
        <div className="flex items-center gap-2 border-t border-hairline-silver/30 pt-2 text-[11px] text-slate/80">
          <Terminal className="h-3.5 w-3.5 shrink-0 opacity-70" />
          <span>{t('closeDay.cardHintReconcile')}</span>
        </div>
      </div>
    </div>
  );
}

interface ReconcileHeroProps {
  data: CurrentBusinessDay;
  form: CloseDayForm;
}

/** The reconciliation hero: counting the cash drawer beside the card total. */
export function ReconcileHero({ data, form }: ReconcileHeroProps) {
  const { t } = useTranslation();
  return (
    <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
      <CountCard
        icon={<Banknote className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />}
        iconBg="bg-emerald-500/15 dark:bg-emerald-500/25"
        title={t('closeDay.cashDrawer')}
        hint={t('closeDay.cashHint')}
        expected={data.expectedCash}
        counted={form.countedCash}
        onCounted={form.setCountedCash}
        inputId="counted-cash"
      >
        <CashBreakdownLines breakdown={data.breakdown} />
      </CountCard>

      <CountCard
        icon={<CreditCard className="h-5 w-5 text-apple-blue dark:text-apple-blue" />}
        iconBg="bg-apple-blue/15 dark:bg-apple-blue/25"
        title={t('closeDay.card')}
        hint={t('closeDay.cardHint')}
        expected={data.expectedCard}
        counted={form.countedCard}
        onCounted={form.setCountedCard}
        inputId="counted-card"
      >
        <CardBreakdownLines breakdown={data.breakdown} />
      </CountCard>
    </div>
  );
}
