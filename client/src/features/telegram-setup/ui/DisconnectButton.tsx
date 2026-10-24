import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import { Unplug } from 'lucide-react';
import {
  Button,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFormFooter,
  DialogHeader,
  DialogTitle,
} from '@/shared/ui';
import { getApiErrorMessage } from '@/shared/api';
import { useClearTelegramConfig } from '@/entities/integrations';

/** "Disconnect" action: clears the stored Telegram config after a confirm dialog. */
export function DisconnectButton() {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const { mutate, isPending } = useClearTelegramConfig();

  const onConfirm = () =>
    mutate(undefined, {
      onSuccess: () => {
        toast.success(t('telegram.disconnectSuccess'));
        setOpen(false);
      },
      onError: (err) => toast.error(getApiErrorMessage(err) ?? t('common.error')),
    });

  return (
    <>
      <Button variant="destructive" className="gap-1.5" onClick={() => setOpen(true)}>
        <Unplug className="h-3.5 w-3.5" />
        <span>{t('telegram.disconnect')}</span>
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-[440px] p-7">
          <DialogHeader>
            <DialogTitle>{t('telegram.disconnectTitle')}</DialogTitle>
            <DialogDescription>{t('telegram.disconnectWarning')}</DialogDescription>
          </DialogHeader>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              onConfirm();
            }}
          >
            <DialogFormFooter
              onClose={() => setOpen(false)}
              isPending={isPending}
              submitLabel={t('telegram.disconnect')}
              destructive
            />
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}
