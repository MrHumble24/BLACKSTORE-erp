import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import type { UseMutationResult } from '@tanstack/react-query';
import { Check, Unlink } from 'lucide-react';
import { Badge, Button } from '@/shared/ui';
import { getApiErrorMessage } from '@/shared/api';
import { formatDate } from '@/shared/lib';
import { TelegramUnlinkDialog } from './TelegramUnlinkDialog';

interface TelegramLinkStatusProps {
  id: number;
  linkedAt: string | null | undefined;
  /** Name of the staff user who issued the used invite; null for links made before F24. */
  linkedBy: string | null | undefined;
  canUnlink: boolean;
  unlink: UseMutationResult<void, unknown, number>;
  /** Called after a successful unlink; the page re-reads the record so the Send button returns. */
  onDone: () => void;
}

/** "Linked <date> · by <name>" badge for a linked person, plus an Unlink action (confirmed) when allowed. */
export function TelegramLinkStatus({ id, linkedAt, linkedBy, canUnlink, unlink, onDone }: TelegramLinkStatusProps) {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);

  const by = linkedBy ? t('telegramInvite.linkedBy', { name: linkedBy }) : '';
  // Records linked before F24 carry no date; fall back to a plain "Linked".
  const caption = linkedAt ? t('telegramInvite.linkedInfo', { date: formatDate(linkedAt), by }) : t('telegramInvite.linked');

  const onConfirm = () =>
    unlink.mutate(id, {
      onSuccess: () => {
        toast.success(t('telegramInvite.unlinked'));
        setOpen(false);
        onDone();
      },
      onError: (err) => toast.error(getApiErrorMessage(err) ?? t('common.error')),
    });

  return (
    <div className="flex items-center gap-2">
      <Badge variant="active" className="gap-1 text-[11px] font-normal" title={caption}>
        <Check className="h-3 w-3 text-apple-blue" />
        {caption}
      </Badge>
      {canUnlink && (
        <Button variant="ghost" size="sm" onClick={() => setOpen(true)} className="h-7 gap-1 text-xs text-destructive hover:text-destructive">
          <Unlink className="h-3 w-3" />
          {t('telegramInvite.unlink')}
        </Button>
      )}
      <TelegramUnlinkDialog open={open} onOpenChange={setOpen} isPending={unlink.isPending} onConfirm={onConfirm} />
    </div>
  );
}
