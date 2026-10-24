import { useTranslation } from 'react-i18next';
import { TelegramSetupCard } from '@/features/telegram-setup';

/** Super-admin Telegram settings page (/super-admin/telegram, manage_integrations). */
export function TelegramPage() {
  const { t } = useTranslation();

  return (
    <div className="space-y-6">
      <div className="space-y-1">
        <h1 className="text-2xl md:text-3xl font-semibold font-sf-pro-display tracking-tight text-ink">
          {t('superAdmin.title')}
        </h1>
        <p className="text-xs text-slate">{t('superAdmin.subtitle')}</p>
      </div>
      <TelegramSetupCard />
    </div>
  );
}
