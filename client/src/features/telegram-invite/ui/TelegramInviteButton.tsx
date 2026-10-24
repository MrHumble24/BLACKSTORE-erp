import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import { Send } from 'lucide-react';
import { Button } from '@/shared/ui';
import { getApiErrorMessage } from '@/shared/api';
import type { TelegramLinkResult } from '@/shared/types';
import { TelegramInviteDialog } from './TelegramInviteDialog';

interface TelegramInviteButtonProps {
  name: string;
  /** Mints (or returns) the invite link for this person. */
  request: () => Promise<TelegramLinkResult>;
  /** Called when the dialog closes; the page refreshes the record so "Linked" can appear. */
  onClose?: () => void;
}

/** Button that mints the Telegram invite link and opens the QR/link dialog for an unlinked person. */
export function TelegramInviteButton({ name, request, onClose }: TelegramInviteButtonProps) {
  const { t } = useTranslation();
  const [link, setLink] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const handleClick = async () => {
    setBusy(true);
    try {
      const result = await request();
      if (result.linked) return onClose?.();
      if (!result.link) return toast.error(t('telegramInvite.noBot'));
      setLink(result.link);
    } catch (err) {
      toast.error(getApiErrorMessage(err) ?? t('common.error'));
    } finally {
      setBusy(false);
    }
  };

  const handleOpenChange = (next: boolean) => {
    if (next) return;
    setLink(null);
    onClose?.();
  };

  return (
    <>
      <Button variant="outline" size="sm" onClick={handleClick} disabled={busy} className="h-8 gap-1.5 text-xs">
        <Send className="h-3.5 w-3.5" />
        {t('telegramInvite.button')}
      </Button>
      <TelegramInviteDialog open={link !== null} onOpenChange={handleOpenChange} name={name} link={link} />
    </>
  );
}
