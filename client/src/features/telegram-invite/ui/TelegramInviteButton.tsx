import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import { Check, Send } from 'lucide-react';
import { Badge, Button } from '@/shared/ui';
import { getApiErrorMessage } from '@/shared/api';
import type { TelegramLinkResult } from '@/shared/types';
import { TelegramInviteDialog } from './TelegramInviteDialog';

interface TelegramInviteButtonProps {
  name: string;
  linked: boolean;
  /** Mints (or returns) the invite link for this person. */
  request: () => Promise<TelegramLinkResult>;
  /** Called when the dialog closes; the page refreshes the record so "Linked" can appear. */
  onClose?: () => void;
}

/** "Linked" badge when the person already follows the bot, otherwise a button opening the invite dialog. */
export function TelegramInviteButton({ name, linked, request, onClose }: TelegramInviteButtonProps) {
  const { t } = useTranslation();
  const [link, setLink] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  if (linked) {
    return (
      <Badge variant="active" className="gap-1 text-[11px]">
        <Check className="h-3 w-3 text-apple-blue" />
        {t('telegramInvite.linked')}
      </Badge>
    );
  }

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
