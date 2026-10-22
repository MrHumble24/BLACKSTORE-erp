import { useTranslation } from 'react-i18next';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/shared/ui';
import { AccessoryLineFields } from './AccessoryLineFields';

interface AccessoryLineDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  batchId: number;
}

/** Dialog for adding a serialized-independent accessory line to a batch. */
export function AccessoryLineDialog({ open, onOpenChange, batchId }: AccessoryLineDialogProps) {
  const { t } = useTranslation();

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[480px] p-7">
        <DialogHeader>
          <DialogTitle>{t('batches.addAccessory')}</DialogTitle>
        </DialogHeader>
        {open && (
          <AccessoryLineFields batchId={batchId} onClose={() => onOpenChange(false)} />
        )}
      </DialogContent>
    </Dialog>
  );
}
