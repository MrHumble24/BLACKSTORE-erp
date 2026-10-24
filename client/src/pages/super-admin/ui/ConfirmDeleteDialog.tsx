import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/shared/ui';
import { getApiErrorMessage, getApiErrorStatus } from '@/shared/api';
import { useHardDelete, type HardDeletePreviewRequest } from '@/entities/super-admin';
import { ConfirmDeleteForm } from './ConfirmDeleteForm';

interface ConfirmDeleteDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  target: HardDeletePreviewRequest;
  /** Called after a successful delete so the page can reset the flow. */
  onDeleted: () => void;
}

// The owner must type this exact word before the delete button enables.
const CONFIRM_WORD = 'DELETE';

/** Final step: typed confirmation + the super admin's password, then execute. */
export function ConfirmDeleteDialog({ open, onOpenChange, target, onDeleted }: ConfirmDeleteDialogProps) {
  const { t } = useTranslation();
  const { mutateAsync, isPending } = useHardDelete();
  const [confirmText, setConfirmText] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);

  const canSubmit = confirmText.trim().toUpperCase() === CONFIRM_WORD && password.length > 0;

  const reset = () => {
    setConfirmText('');
    setPassword('');
    setError(null);
  };

  const handleOpenChange = (next: boolean) => {
    if (!next) reset();
    onOpenChange(next);
  };

  const handleSubmit = async () => {
    setError(null);
    try {
      await mutateAsync({ ...target, password });
      toast.success(t('hardDelete.success'));
      reset();
      onDeleted();
    } catch (err) {
      setError(
        getApiErrorStatus(err) === 401
          ? t('hardDelete.wrongPassword')
          : getApiErrorMessage(err) || t('common.error'),
      );
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t('hardDelete.confirmTitle')}</DialogTitle>
          <DialogDescription>{t('hardDelete.confirmDescription')}</DialogDescription>
        </DialogHeader>
        <ConfirmDeleteForm
          confirmWord={CONFIRM_WORD}
          confirmText={confirmText}
          onConfirmTextChange={setConfirmText}
          password={password}
          onPasswordChange={setPassword}
          error={error}
          isPending={isPending}
          canSubmit={canSubmit}
          onSubmit={() => void handleSubmit()}
          onCancel={() => handleOpenChange(false)}
        />
      </DialogContent>
    </Dialog>
  );
}
