import { useTranslation } from 'react-i18next';
import { BackLink } from '@/shared/ui';
import { ImportPanel } from '@/features/import-stock';

/** How-it-works text above the import panel (FR-7). */
function HowItWorks() {
  const { t } = useTranslation();

  return (
    <div className="space-y-1">
      <h1 className="text-2xl md:text-3xl font-semibold font-sf-pro-display tracking-tight text-ink">
        {t('importStock.title')}
      </h1>
      <p className="text-xs text-slate">{t('importStock.subtitle')}</p>
      <ul className="list-disc pl-5 space-y-1 text-xs text-slate">
        <li>{t('importStock.howTemplate')}</li>
        <li>{t('importStock.howErrors')}</li>
      </ul>
    </div>
  );
}

/** Stock import page (FR-7, manage_prices). */
export function ImportPage() {
  const { t } = useTranslation();

  return (
    <div className="space-y-6">
      <BackLink to="/items" label={t('importStock.backToList')} />
      <HowItWorks />
      <ImportPanel />
    </div>
  );
}
