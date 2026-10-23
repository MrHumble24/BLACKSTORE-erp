import { useTranslation } from 'react-i18next';
import { BackLink } from '@/shared/ui';
import { HandoverPanel } from '@/features/consign';

/** Page for initiating a new consignment handover. */
export function NewConsignmentPage() {
  const { t } = useTranslation();

  return (
    <div className="space-y-6">
      <BackLink to="/partners" label={t('partners.backToList')} />
      <div>
        <h1 className="text-xl font-bold tracking-tight text-ink">{t('consign.newHandoverTitle')}</h1>
        <p className="text-xs text-slate mt-0.5">{t('consign.newHandoverSubtitle')}</p>
      </div>
      <HandoverPanel />
    </div>
  );
}
