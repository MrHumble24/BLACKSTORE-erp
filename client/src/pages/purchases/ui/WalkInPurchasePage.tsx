import { useTranslation } from 'react-i18next';
import { WalkInPurchaseForm } from '@/features/walk-in-purchase';

/** Walk-in purchase page: one form to register a device bought from a walk-in seller (FR-25). */
export function WalkInPurchasePage() {
  const { t } = useTranslation();

  return (
    <div className="space-y-6 max-w-4xl">
      <div className="space-y-1">
        <h1 className="text-2xl md:text-3xl font-semibold font-sf-pro-display tracking-tight text-ink">
          {t('walkIn.title')}
        </h1>
        <p className="text-xs text-slate">{t('walkIn.subtitle')}</p>
      </div>
      <WalkInPurchaseForm />
    </div>
  );
}
