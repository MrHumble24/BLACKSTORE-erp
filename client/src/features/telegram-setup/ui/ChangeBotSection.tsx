import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { RefreshCw } from 'lucide-react';
import { Button } from '@/shared/ui';
import { TelegramConnectForm } from './TelegramConnectForm';

/** "Change bot" footer: reveals the token form that re-verifies and replaces the stored bot. */
export function ChangeBotSection() {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  return (
    <div className="space-y-4 border-t border-hairline-silver/60 pt-5">
      {open ? (
        <>
          <p className="text-sm font-medium text-ink">{t('telegram.changeBotTitle')}</p>
          <p className="text-xs text-slate">{t('telegram.changeBotHint')}</p>
          <TelegramConnectForm onConnected={() => setOpen(false)} />
          <Button variant="ghost" onClick={() => setOpen(false)}>
            {t('common.cancel')}
          </Button>
        </>
      ) : (
        <Button variant="secondary" className="gap-1.5" onClick={() => setOpen(true)}>
          <RefreshCw className="h-3.5 w-3.5" />
          <span>{t('telegram.changeBot')}</span>
        </Button>
      )}
    </div>
  );
}
