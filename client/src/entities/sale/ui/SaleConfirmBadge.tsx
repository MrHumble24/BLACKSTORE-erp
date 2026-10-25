import { useTranslation } from 'react-i18next';
import { Check } from 'lucide-react';
import { Badge } from '@/shared/ui';

/** Small "Confirmed" tick or amber "Waiting" badge for a sale's daily-close confirmation (F33). */
export function SaleConfirmBadge({ confirmedAt }: { confirmedAt: string | null }) {
  const { t } = useTranslation();
  if (confirmedAt) {
    return (
      <span className="inline-flex shrink-0 items-center gap-1 text-[11px] font-medium text-emerald-600 dark:text-emerald-400">
        <Check className="h-3 w-3" />
        {t('sales.statusConfirmed')}
      </span>
    );
  }
  return (
    <Badge
      variant="outline"
      className="shrink-0 rounded-full border-launch-orange/30 bg-launch-orange/10 px-2 py-0 text-[11px] font-medium text-launch-orange"
    >
      {t('sales.statusWaiting')}
    </Badge>
  );
}
