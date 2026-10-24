import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import { BadgeCheck, Send } from 'lucide-react';
import { Button, FormError, TextField } from '@/shared/ui';
import { useSubmitWithError } from '@/shared/lib';
import {
  useSaveTelegramConfig,
  useVerifyTelegramBot,
  type TelegramBot,
} from '@/entities/integrations';

/**
 * Connect/replace a bot: paste token → Verify (getMe) → shows the bot → "Add this bot" saves it
 * (PUT, token required). Used both for first-time setup and the "Change bot" reconnect flow.
 * The token lives only in local state during this flow and is cleared once saved.
 * `onConnected` lets a caller close the reconnect panel after a successful save.
 */
export function TelegramConnectForm({ onConnected }: { onConnected?: () => void }) {
  const { t } = useTranslation();
  const [token, setToken] = useState('');
  const [bot, setBot] = useState<TelegramBot | null>(null);
  const verify = useVerifyTelegramBot();
  const save = useSaveTelegramConfig();
  const { error, setError, runWithCatch } = useSubmitWithError();

  const onVerify = () =>
    void runWithCatch(async () => {
      const result = await verify.mutateAsync(token.trim());
      setBot(result);
    });

  const onAdd = () =>
    void runWithCatch(async () => {
      await save.mutateAsync({ token: token.trim() });
      toast.success(t('telegram.addSuccess'));
      // Never keep the token around after saving (the API never returns it either).
      setToken('');
      setBot(null);
      onConnected?.();
    });

  return (
    <div className="space-y-4">
      <TextField
        id="telegram-token"
        label={t('telegram.tokenLabel')}
        type="password"
        autoComplete="off"
        value={token}
        onChange={(e) => {
          setToken(e.target.value);
          setBot(null);
          setError(null);
        }}
        placeholder={t('telegram.tokenPlaceholder')}
        hint={t('telegram.tokenHint')}
        disabled={save.isPending}
      />

      <FormError message={error} />

      {bot && (
        <div className="flex items-center gap-3 rounded-2xl border border-pricing-blue/30 bg-pricing-blue/5 p-4">
          <BadgeCheck className="h-5 w-5 shrink-0 text-pricing-blue" />
          <div className="space-y-0.5">
            <p className="text-sm font-medium text-ink">{bot.name}</p>
            <p className="text-xs text-slate">@{bot.username}</p>
          </div>
        </div>
      )}

      {bot ? (
        <Button onClick={onAdd} disabled={save.isPending} className="gap-1.5">
          <Send className="h-3.5 w-3.5" />
          <span>{save.isPending ? t('common.loading') : t('telegram.addBot')}</span>
        </Button>
      ) : (
        <Button
          variant="secondary"
          onClick={onVerify}
          disabled={verify.isPending || token.trim().length === 0}
        >
          {verify.isPending ? t('common.loading') : t('telegram.verify')}
        </Button>
      )}
    </div>
  );
}
