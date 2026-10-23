import { useTranslation } from 'react-i18next';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFormFooter, FormError,
} from '@/shared/ui';
import { toast } from 'sonner';
import { getApiErrorMessage } from '@/shared/api';
import { useRemoveBatchLine, type BatchLine } from '@/entities/batch';

interface RemoveLineDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  batchId: number;
  line: BatchLine | null;
}

/** Confirm text per line kind: a device leaves stock entirely, stock just goes down. */
function ConfirmText({ line }: { line: BatchLine }) {
  const { t } = useTranslation();
  if (line.item) {
    const code = line.item.identifiers[0]?.value ?? `#${line.item.id}`;
    return <p className="text-xs text-ink">{t('batches.removeDeviceConfirm', { code })}</p>;
  }
  return (
    <p className="text-xs text-ink">
      {t('batches.removeAccessoryConfirm', { quantity: line.quantity, model: line.productModel.name })}
    </p>
  );
}

/** Destructive confirm for DELETE /batches/:id/lines/:lineId (delete_records only). */
export function RemoveLineDialog({ open, onOpenChange, batchId, line }: RemoveLineDialogProps) {
  const { t } = useTranslation();

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[460px] p-7">
        <DialogHeader>
          <DialogTitle>{t('batches.removeLine')}</DialogTitle>
        </DialogHeader>
        {open && line && (
          <RemoveLineContent
            key={line.id}
            batchId={batchId}
            line={line}
            onClose={() => onOpenChange(false)}
          />
        )}
      </DialogContent>
    </Dialog>
  );
}

interface RemoveLineContentProps {
  batchId: number;
  line: BatchLine;
  onClose: () => void;
}

/** Calls the delete; API 409 "already sold / not enough units" shows inside the dialog. */
function RemoveLineContent({ batchId, line, onClose }: RemoveLineContentProps) {
  const { t } = useTranslation();
  const { mutate: removeLine, isPending, error } = useRemoveBatchLine();

  const onConfirm = () => {
    removeLine(
      { id: batchId, lineId: line.id },
      {
        onSuccess: () => {
          toast.success(t('batches.removeSuccess'));
          onClose();
        },
        // Errors stay visible in the dialog (mutation error renders below).
      },
    );
  };

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        onConfirm();
      }}
      className="space-y-4 pt-2"
    >
      <FormError message={error ? getApiErrorMessage(error) ?? t('common.error') : null} />
      <ConfirmText line={line} />
      <DialogFormFooter
        onClose={onClose}
        isPending={isPending}
        destructive
        submitLabel={t('batches.removeLine')}
      />
    </form>
  );
}
