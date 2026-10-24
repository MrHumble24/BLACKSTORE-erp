import { useTranslation } from 'react-i18next';
import { formatMoney } from '@/shared/lib';
import type { InvestorMoney } from '@/entities/investor';
import { InfoCard } from './InfoCard';

/**
 * Investor money trail (F25): deposits, payouts, money sent abroad, fees, what is not yet sent and
 * the unsold stock at cost. Rendered only when the server returned the block (view_cost, not OWN).
 */
export function InvestorMoneyCards({ money }: { money: InvestorMoney }) {
  const { t } = useTranslation();
  // Negative = the shop sent more than the investor put in; shown, never clamped.
  const unsentNegative = Number(money.unsentDeposits) < 0;

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      <InfoCard label={t('investors.money.deposits')} value={formatMoney(money.deposits)} />
      <InfoCard label={t('investors.money.payouts')} value={formatMoney(money.payouts)} />
      <InfoCard label={t('investors.money.sentToSuppliers')} value={formatMoney(money.sentToSuppliers)} />
      <InfoCard label={t('investors.money.feesCharged')} value={formatMoney(money.feesCharged)} />
      <InfoCard
        label={t('investors.money.unsentDeposits')}
        value={formatMoney(money.unsentDeposits)}
        valueClassName={unsentNegative ? 'text-launch-orange font-bold' : 'text-ink font-bold'}
      />
      <InfoCard
        label={t('investors.money.unsoldStock')}
        value={t('investors.money.unsoldValue', {
          count: money.unsoldItems,
          cost: formatMoney(money.unsoldAtCost),
        })}
      />
      <InfoCard
        label={t('investors.money.defective')}
        value={t('investors.money.defectiveCount', { count: money.defectiveItems })}
      />
    </div>
  );
}
