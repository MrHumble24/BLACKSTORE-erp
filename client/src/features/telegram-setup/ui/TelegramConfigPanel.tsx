import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import { Bot, RefreshCw } from 'lucide-react';
import { Button, FormError } from '@/shared/ui';
import { useSubmitWithError } from '@/shared/lib';
import {
  useUpdateTelegramSettings,
  useTelegramChats,
  type TelegramConfig,
  type TelegramFeatures,
} from '@/entities/integrations';
import { ChatIdField } from './ChatIdField';
import { FeatureToggles } from './FeatureToggles';
import { DisconnectButton } from './DisconnectButton';
import { TelegramConnectForm } from './TelegramConnectForm';

/**
 * Connected state: shows the bot and lets the owner edit chat ids and toggles, then Save
 * WITHOUT re-entering the token (PATCH /settings keeps the stored bot). The token field is
 * only shown behind the explicit "Change bot" action, which re-verifies and replaces the bot.
 */
export function TelegramConfigPanel({ config }: { config: TelegramConfig }) {
  const { t } = useTranslation();
  const [backupChatId, setBackupChatId] = useState(config.backupChatId);
  const [alertChatId, setAlertChatId] = useState(config.alertChatId);
  const [enabled, setEnabled] = useState(config.enabled);
  const [features, setFeatures] = useState<TelegramFeatures>(config.features);
  const [changingBot, setChangingBot] = useState(false);

  const { data: chats = [] } = useTelegramChats(true);
  const update = useUpdateTelegramSettings();
  const { error, runWithCatch } = useSubmitWithError();

  const onSave = () =>
    void runWithCatch(async () => {
      await update.mutateAsync({ backupChatId, alertChatId, enabled, features });
      toast.success(t('telegram.saveSuccess'));
    });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Bot className="h-5 w-5 shrink-0 text-pricing-blue" />
          <div className="space-y-0.5">
            <p className="text-sm font-medium text-ink">{config.botName}</p>
            <p className="text-xs text-slate">@{config.botUsername}</p>
          </div>
        </div>
        <DisconnectButton />
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <ChatIdField
          label={t('telegram.backupChatId')}
          value={backupChatId}
          onChange={setBackupChatId}
          chats={chats}
          disabled={update.isPending}
        />
        <ChatIdField
          label={t('telegram.alertChatId')}
          value={alertChatId}
          onChange={setAlertChatId}
          chats={chats}
          disabled={update.isPending}
        />
      </div>

      <FeatureToggles
        enabled={enabled}
        features={features}
        onEnabledChange={setEnabled}
        onFeatureChange={(key, value) => setFeatures((f) => ({ ...f, [key]: value }))}
        disabled={update.isPending}
      />

      <div className="space-y-4">
        <FormError message={error} />
        <Button onClick={onSave} disabled={update.isPending}>
          {update.isPending ? t('common.loading') : t('common.save')}
        </Button>
      </div>

      <div className="space-y-4 border-t border-hairline-silver/60 pt-5">
        {changingBot ? (
          <>
            <p className="text-sm font-medium text-ink">{t('telegram.changeBotTitle')}</p>
            <p className="text-xs text-slate">{t('telegram.changeBotHint')}</p>
            <TelegramConnectForm onConnected={() => setChangingBot(false)} />
            <Button variant="ghost" onClick={() => setChangingBot(false)}>
              {t('common.cancel')}
            </Button>
          </>
        ) : (
          <Button variant="secondary" className="gap-1.5" onClick={() => setChangingBot(true)}>
            <RefreshCw className="h-3.5 w-3.5" />
            <span>{t('telegram.changeBot')}</span>
          </Button>
        )}
      </div>
    </div>
  );
}
