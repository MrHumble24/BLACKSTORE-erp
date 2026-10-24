import { useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import { Copy } from 'lucide-react';
import { Button, Dialog, DialogContent, DialogHeader, DialogTitle, Input } from '@/shared/ui';
import { QrCode } from './QrCode';

interface TelegramInviteDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  name: string;
  link: string | null;
}

/** Shows a one-time bot invite link as a QR code plus a copyable read-only input. */
export function TelegramInviteDialog({ open, onOpenChange, name, link }: TelegramInviteDialogProps) {
  const { t } = useTranslation();
  const inputRef = useRef<HTMLInputElement>(null);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(link ?? '');
      toast.success(t('common.copied'));
    } catch {
      // Clipboard API unavailable (plain http on the LAN): select the text for manual copy.
      inputRef.current?.select();
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>{t('telegramInvite.title')}</DialogTitle>
        </DialogHeader>
        <div className="flex flex-col items-center gap-4">
          <p className="text-sm font-medium text-ink">{name}</p>
          <QrCode value={open ? link : null} />
          <div className="flex w-full gap-2">
            <Input ref={inputRef} readOnly value={link ?? ''} className="font-mono text-xs" />
            <Button variant="outline" size="sm" onClick={handleCopy} className="h-9 gap-1.5 text-xs shrink-0">
              <Copy className="h-3.5 w-3.5" />
              {t('telegramInvite.copy')}
            </Button>
          </div>
          <p className="text-xs text-slate text-center">{t('telegramInvite.hint')}</p>
        </div>
      </DialogContent>
    </Dialog>
  );
}
