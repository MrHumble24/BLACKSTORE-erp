import { useTranslation } from 'react-i18next';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFormFooter,
  DialogHeader,
  DialogTitle,
} from '@/shared/ui';

interface TelegramUnlinkDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  isPending: boolean;
  onConfirm: () => void;
}

/** Small destructive confirm before removing a person's Telegram link. */
export function TelegramUnlinkDialog({ open, onOpenChange, isPending, onConfirm }: TelegramUnlinkDialogProps) {
  const { t } = useTranslation();

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[440px] p-7">
        <DialogHeader>
          <DialogTitle>{t('telegramInvite.unlinkTitle')}</DialogTitle>
          <DialogDescription>{t('telegramInvite.unlinkWarning')}</DialogDescription>
        </DialogHeader>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            onConfirm();
          }}
        >
          <DialogFormFooter
            onClose={() => onOpenChange(false)}
            isPending={isPending}
            submitLabel={t('telegramInvite.unlink')}
            destructive
          />
        </form>
      </DialogContent>
    </Dialog>
  );
}
