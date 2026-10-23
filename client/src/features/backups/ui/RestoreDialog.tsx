import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import { Dialog, DialogContent, DialogFormFooter, DialogHeader, DialogTitle, FormError, TextField } from '@/shared/ui';
import { useSubmitWithError } from '@/shared/lib';
import { useRestoreBackup, type Backup } from '@/entities/backup';

interface RestoreDialogProps {
  backup: Backup | null;
  onOpenChange: (open: boolean) => void;
}

/** Destructive restore dialog (FR-31): confirm by retyping the exact file name. */
export function RestoreDialog({ backup, onOpenChange }: RestoreDialogProps) {
  const { t } = useTranslation();

  return (
    <Dialog open={backup !== null} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[480px] p-7">
        <DialogHeader>
          <DialogTitle>{t('backups.restoreTitle')}</DialogTitle>
        </DialogHeader>
        {backup && (
          <RestoreContent key={backup.fileName} backup={backup} onClose={() => onOpenChange(false)} />
        )}
      </DialogContent>
    </Dialog>
  );
}

/** Confirm step: the database is replaced by the dump; a safety backup is taken first. */
function RestoreContent({ backup, onClose }: { backup: Backup; onClose: () => void }) {
  const { t } = useTranslation();
  const [confirm, setConfirm] = useState('');
  // The contract compares the typed string with the file name as-is (no trim).
  const canRestore = confirm === backup.fileName;
  const { mutateAsync, isPending } = useRestoreBackup();
  const { error, runWithCatch } = useSubmitWithError();

  const onRestore = () => {
    void runWithCatch(async () => {
      // The toast carries the safety backup name so the Admin can keep a copy of it.
      const result = await mutateAsync({ fileName: backup.fileName, confirm });
      toast.success(t('backups.restoreSuccess', { name: result.safetyBackup }));
      onClose();
    });
  };

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        onRestore();
      }}
      className="space-y-4 pt-2"
    >
      <div className="space-y-0.5">
        <p className="text-[11px] text-slate">{t('backups.fileName')}</p>
        <p className="text-xs font-medium text-ink">{backup.fileName}</p>
      </div>
      <p className="rounded-2xl border border-amber-300 bg-amber-50 p-3 text-xs font-medium text-amber-900">
        {t('backups.restoreWarning')}
      </p>
      <FormError message={error} />
      <TextField
        id="restore-confirm"
        label={t('backups.confirmLabel')}
        value={confirm}
        onChange={(e) => setConfirm(e.target.value)}
        disabled={isPending}
      />
      <DialogFormFooter
        onClose={onClose}
        isPending={isPending}
        submitLabel={t('backups.restore')}
        destructive
        submitDisabled={!canRestore}
      />
    </form>
  );
}
