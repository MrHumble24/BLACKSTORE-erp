import { useState, type FormEvent } from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  TextField,
  FormError,
  DialogFormFooter,
} from '@/shared/ui';
import { getTodayIso, useSubmitWithError } from '@/shared/lib';
import { useUpdateConsignmentDueDate } from '@/entities/consignment';

interface ConsignmentDueDateDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  consignmentId: number;
  currentDueDate: string | null;
}

interface FormContentProps {
  consignmentId: number;
  currentDueDate: string | null;
  onClose: () => void;
}

function DueDateFormContent({ consignmentId, currentDueDate, onClose }: FormContentProps) {
  const { t } = useTranslation();
  const [dueDate, setDueDate] = useState(currentDueDate ?? '');
  const { error, runWithCatch } = useSubmitWithError();
  const updateDueDate = useUpdateConsignmentDueDate();

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    await runWithCatch(async () => {
      await updateDueDate.mutateAsync({ id: consignmentId, dueDate: dueDate || null });
      toast.success(t('consign.dueDateUpdatedSuccess'));
      onClose();
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4 pt-2">
      {error && <FormError message={error} />}
      <TextField
        id="consignment-edit-due-date"
        label={t('consign.dueDate')}
        type="date"
        min={getTodayIso()}
        value={dueDate}
        onChange={(e) => setDueDate(e.target.value)}
        className="h-9 text-xs"
      />
      <DialogFormFooter onClose={onClose} isPending={updateDueDate.isPending} />
    </form>
  );
}

/** Dialog for updating or clearing the due date of an existing consignment. */
export function ConsignmentDueDateDialog({
  open,
  onOpenChange,
  consignmentId,
  currentDueDate,
}: ConsignmentDueDateDialogProps) {
  const { t } = useTranslation();

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{t('consign.editDueDate')}</DialogTitle>
        </DialogHeader>
        {open && (
          <DueDateFormContent
            consignmentId={consignmentId}
            currentDueDate={currentDueDate}
            onClose={() => onOpenChange(false)}
          />
        )}
      </DialogContent>
    </Dialog>
  );
}
