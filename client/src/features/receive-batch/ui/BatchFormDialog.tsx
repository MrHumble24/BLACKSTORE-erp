import { useTranslation } from 'react-i18next';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/shared/ui';
import type { BatchSummary } from '@/entities/batch';
import { BatchFormContent } from './BatchFormContent';

interface BatchFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** When provided the dialog edits this batch, otherwise it creates a new one. */
  batch?: BatchSummary | null;
}

/** Dialog for adding a batch (supplier, owner, location, date, note) or editing it. */
export function BatchFormDialog({ open, onOpenChange, batch }: BatchFormDialogProps) {
  const { t } = useTranslation();

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[560px] p-7">
        <DialogHeader>
          <DialogTitle>
            {batch ? t('batches.editBatch') : t('batches.newBatch')}
          </DialogTitle>
        </DialogHeader>
        {open && (
          <BatchFormContent
            key={batch ? `edit-${batch.id}` : 'create'}
            batch={batch ?? null}
            onClose={() => onOpenChange(false)}
          />
        )}
      </DialogContent>
    </Dialog>
  );
}
