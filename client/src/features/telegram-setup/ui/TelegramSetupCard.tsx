import { useTranslation } from 'react-i18next';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/shared/ui';
import { useTelegramConfig } from '@/entities/integrations';
import { TelegramConnectForm } from './TelegramConnectForm';
import { TelegramConfigPanel } from './TelegramConfigPanel';

/** Telegram setup card: connect flow when unconfigured, edit panel once connected. */
export function TelegramSetupCard() {
  const { t } = useTranslation();
  const { data: config, isLoading } = useTelegramConfig();

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t('telegram.title')}</CardTitle>
        <CardDescription>{t('telegram.subtitle')}</CardDescription>
      </CardHeader>
      <CardContent>
        {isLoading && <p className="text-sm text-slate">{t('common.loading')}</p>}
        {!isLoading && config && (
          config.configured
            ? <TelegramConfigPanel config={config} />
            : <TelegramConnectForm />
        )}
      </CardContent>
    </Card>
  );
}
