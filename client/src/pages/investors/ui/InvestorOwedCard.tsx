import { useTranslation } from 'react-i18next';
import { Card } from '@/shared/ui';
import { cn, formatMoney } from '@/shared/lib';

/** Label key by sign: + the shop owes the investor, − the investor owes the shop (paid in advance); none while loading. */
function owedLabelKey(owed: number | undefined): string | null {
  if (owed === undefined) return null;
  if (owed > 0) return 'investors.account.weOwe';
  if (owed < 0) return 'investors.account.theyOwe';
  return 'investors.account.settled';
}

/** The one number of the investor account with its plain-words label and a hint on what moves it. */
export function InvestorOwedCard({ name, owed }: { name: string; owed: string | undefined }) {
  const { t } = useTranslation();
  const value = owed === undefined ? undefined : Number(owed);
  const labelKey = owedLabelKey(value);

  return (
    <Card className="p-6">
      <p className="text-sm text-slate">{labelKey ? t(labelKey, { name }) : '\u00a0'}</p>
      <p
        className={cn(
          'mt-1 text-2xl font-semibold font-sf-pro-display tracking-tight',
          value !== undefined && value < 0 ? 'text-launch-orange' : 'text-ink',
        )}
      >
        {value === undefined ? '—' : formatMoney(Math.abs(value))}
      </p>
      <p className="mt-2 text-[11px] text-slate">{t('investors.account.hint')}</p>
    </Card>
  );
}
