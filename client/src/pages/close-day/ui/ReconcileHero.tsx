import { useTranslation } from 'react-i18next';
import { Banknote, CreditCard } from 'lucide-react';
import { Card, Input, Label } from '@/shared/ui';
import { cn, money } from '@/shared/lib';
import type { CurrentBusinessDay } from '@/entities/business-day';
import type { CloseDayForm } from '../model/useCloseDayForm';
import { variance } from '../model/useCloseDayForm';
import { CARD, NUM } from './constants';
import { VarianceBadge } from './VarianceBadge';

interface CountCardProps {
  icon: React.ReactNode;
  title: string;
  hint: string;
  expected: string;
  counted: string;
  onCounted: (value: string) => void;
  inputId: string;
  span: string;
}

/** One drawer: the system's expected total, the owner's counted input, and the live variance. */
function CountCard({ icon, title, hint, expected, counted, onCounted, inputId, span }: CountCardProps) {
  const { t } = useTranslation();
  const diff = variance(counted, expected);
  return (
    <Card className={cn(CARD, 'flex flex-col p-5 sm:p-6', span)}>
      <div className="flex items-center justify-between gap-3">
        <span className="flex items-center gap-2 text-[13px] font-medium text-slate">{icon}{title}</span>
        <VarianceBadge diff={diff} />
      </div>

      <div className="mt-4 flex items-baseline justify-between gap-3">
        <span className="text-[12px] text-slate">{t('closeDay.expected')}</span>
        <span className={cn('text-[1.6rem] font-semibold', NUM)}>{money(expected)}</span>
      </div>

      <div className="mt-4 space-y-1.5">
        <Label htmlFor={inputId} className="text-[12px] text-slate">{t('closeDay.counted')}</Label>
        <div className="relative">
          <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-lg font-semibold text-slate">$</span>
          <Input
            id={inputId}
            inputMode="decimal"
            placeholder="0.00"
            value={counted}
            onChange={(e) => onCounted(e.target.value)}
            className={cn('h-14 rounded-2xl pl-9 text-2xl font-semibold', NUM)}
          />
        </div>
        <p className="text-[11px] text-slate">{hint}</p>
      </div>
    </Card>
  );
}

interface ReconcileHeroProps {
  data: CurrentBusinessDay;
  form: CloseDayForm;
}

/** The reconciliation hero: counting the cash drawer (the owner's chief worry) beside the card total. */
export function ReconcileHero({ data, form }: ReconcileHeroProps) {
  const { t } = useTranslation();
  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-12">
      <CountCard
        span="lg:col-span-7"
        icon={<Banknote className="h-4 w-4 text-emerald-600" />}
        title={t('closeDay.cashDrawer')}
        hint={t('closeDay.cashHint')}
        expected={data.expectedCash}
        counted={form.countedCash}
        onCounted={form.setCountedCash}
        inputId="counted-cash"
      />
      <CountCard
        span="lg:col-span-5"
        icon={<CreditCard className="h-4 w-4 text-apple-blue" />}
        title={t('closeDay.card')}
        hint={t('closeDay.cardHint')}
        expected={data.expectedCard}
        counted={form.countedCard}
        onCounted={form.setCountedCard}
        inputId="counted-card"
      />
    </div>
  );
}
