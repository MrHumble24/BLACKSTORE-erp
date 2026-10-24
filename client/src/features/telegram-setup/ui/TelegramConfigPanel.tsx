import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import { Button, FormError } from '@/shared/ui';
import { useSubmitWithError } from '@/shared/lib';
import {
  useUpdateTelegramSettings,
  useTelegramChats,
  type TelegramConfig,
} from '@/entities/integrations';
import { BotIdentity } from './BotIdentity';
import { ChatIdField } from './ChatIdField';
import { FeatureToggles } from './FeatureToggles';
import { DisconnectButton } from './DisconnectButton';
import { ChangeBotSection } from './ChangeBotSection';

/** The editable part of the config; the bot itself is replaced through ChangeBotSection. */
type Settings = Pick<TelegramConfig, 'backupChatId' | 'alertChatId' | 'enabled' | 'features'>;

function toSettings({ backupChatId, alertChatId, enabled, features }: TelegramConfig): Settings {
  return { backupChatId, alertChatId, enabled, features };
}

/**
 * Connected state: shows the bot and lets the owner edit chat ids and toggles, then Save
 * WITHOUT re-entering the token (PATCH /settings keeps the stored bot).
 */
export function TelegramConfigPanel({ config }: { config: TelegramConfig }) {
  const { t } = useTranslation();
  const [form, setForm] = useState<Settings>(() => toSettings(config));
  const patch = (p: Partial<Settings>) => setForm((f) => ({ ...f, ...p }));
  const { data: chats = [] } = useTelegramChats(config.enabled); // saved switch, not the toggle
  const update = useUpdateTelegramSettings();
  const { error, runWithCatch } = useSubmitWithError();
  const busy = update.isPending;
  const picker = { chats, telegramEnabled: config.enabled, disabled: busy };
  const onSave = () =>
    void runWithCatch(async () => {
      await update.mutateAsync(form);
      toast.success(t('telegram.saveSuccess'));
    });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4">
        <BotIdentity name={config.botName} username={config.botUsername} />
        <DisconnectButton />
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <ChatIdField
          label={t('telegram.backupChatId')}
          value={form.backupChatId}
          onChange={(v) => patch({ backupChatId: v })}
          {...picker}
        />
        <ChatIdField
          label={t('telegram.alertChatId')}
          value={form.alertChatId}
          onChange={(v) => patch({ alertChatId: v })}
          {...picker}
        />
      </div>
      <FeatureToggles
        enabled={form.enabled}
        features={form.features}
        onEnabledChange={(enabled) => patch({ enabled })}
        onFeatureChange={(key, value) => patch({ features: { ...form.features, [key]: value } })}
        disabled={busy}
      />
      <FormError message={error} />
      <Button onClick={onSave} disabled={busy}>
        {busy ? t('common.loading') : t('common.save')}
      </Button>
      <ChangeBotSection />
    </div>
  );
}
