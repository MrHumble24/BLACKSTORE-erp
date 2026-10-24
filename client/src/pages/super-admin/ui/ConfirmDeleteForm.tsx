import { useTranslation } from 'react-i18next';
import { DialogFooter, Button, TextField, FormError } from '@/shared/ui';

interface ConfirmDeleteFormProps {
  confirmWord: string;
  confirmText: string;
  onConfirmTextChange: (value: string) => void;
  password: string;
  onPasswordChange: (value: string) => void;
  error: string | null;
  isPending: boolean;
  canSubmit: boolean;
  onSubmit: () => void;
  onCancel: () => void;
}

/** Typed-confirmation + password fields and the destructive submit footer. */
export function ConfirmDeleteForm({
  confirmWord, confirmText, onConfirmTextChange, password, onPasswordChange,
  error, isPending, canSubmit, onSubmit, onCancel,
}: ConfirmDeleteFormProps) {
  const { t } = useTranslation();
  return (
    <form
      className="space-y-4"
      onSubmit={(e) => { e.preventDefault(); if (canSubmit) onSubmit(); }}
    >
      <TextField
        label={t('hardDelete.typeToConfirm', { word: confirmWord })}
        value={confirmText}
        onChange={(e) => onConfirmTextChange(e.target.value)}
        autoComplete="off"
      />
      <TextField
        label={t('hardDelete.passwordLabel')}
        type="password"
        value={password}
        onChange={(e) => onPasswordChange(e.target.value)}
        autoComplete="off"
      />
      <FormError message={error} />
      <DialogFooter className="pt-2 gap-3">
        <Button type="button" variant="outline" onClick={onCancel} disabled={isPending}>
          {t('common.cancel')}
        </Button>
        <Button type="submit" variant="destructive" disabled={isPending || !canSubmit}>
          {isPending ? t('common.loading') : t('hardDelete.deleteForever')}
        </Button>
      </DialogFooter>
    </form>
  );
}
