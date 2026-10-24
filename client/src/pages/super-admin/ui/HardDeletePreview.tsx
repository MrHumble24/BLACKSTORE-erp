import { useTranslation } from 'react-i18next';
import { AlertTriangle } from 'lucide-react';
import { formatMoney } from '@/shared/lib';
import type { HardDeleteReport } from '@/entities/super-admin';

/** One labelled number in the counts grid. */
function CountStat({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-2xl border border-launch-orange/20 bg-launch-orange/5 p-3">
      <p className="font-sf-pro-display text-xl font-semibold text-ink">{value}</p>
      <p className="text-[11px] text-slate">{label}</p>
    </div>
  );
}

/** Comma-joined list of affected names, or a dash when empty. */
function NameList({ label, names }: { label: string; names: string[] }) {
  const { t } = useTranslation();
  return (
    <div className="space-y-1">
      <p className="text-xs font-medium text-ink">{label}</p>
      <p className="text-xs text-slate">{names.length ? names.join(', ') : t('hardDelete.none')}</p>
    </div>
  );
}

/** Renders the full, irreversible blast radius of a pending hard delete. */
export function HardDeletePreview({ report }: { report: HardDeleteReport }) {
  const { t } = useTranslation();
  const { counts } = report;

  return (
    <div className="space-y-5">
      <div className="flex items-start gap-2 rounded-2xl bg-launch-orange/10 border border-launch-orange/20 p-3">
        <AlertTriangle className="h-4 w-4 shrink-0 text-launch-orange mt-0.5" />
        <p className="text-xs font-medium text-launch-orange tracking-[-0.01em]">
          {t('hardDelete.irreversible')}
        </p>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <CountStat label={t('hardDelete.counts.productModels')} value={counts.productModels} />
        <CountStat label={t('hardDelete.counts.items')} value={counts.items} />
        <CountStat label={t('hardDelete.counts.accessoryStock')} value={counts.accessoryStock} />
        <CountStat label={t('hardDelete.counts.itemIdentifiers')} value={counts.itemIdentifiers} />
      </div>

      <div className="space-y-2 text-xs text-ink">
        <p>{t('hardDelete.salesLine', { count: report.salesCount })}</p>
        <p>
          {t('hardDelete.paymentsLine', {
            count: report.salePaymentCount,
            sum: formatMoney(report.salePaymentSum),
          })}
        </p>
        <p>
          {t('hardDelete.returnsLine', {
            count: report.returnsCount,
            sum: formatMoney(report.returnRefundSum),
          })}
        </p>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <NameList label={t('hardDelete.customers')} names={report.customers} />
        <NameList label={t('hardDelete.investors')} names={report.investors} />
      </div>
    </div>
  );
}
