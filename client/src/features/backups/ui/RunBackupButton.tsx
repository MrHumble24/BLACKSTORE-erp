import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import { DatabaseBackup } from 'lucide-react';
import { Button } from '@/shared/ui';
import { getApiErrorMessage } from '@/shared/api';
import { useRunBackup } from '@/entities/backup';

/** "Run backup now" button (FR-31); the toast names the backup file written. */
export function RunBackupButton() {
  const { t } = useTranslation();
  const { mutate: runBackup, isPending } = useRunBackup();

  const onRun = () =>
    runBackup(undefined, {
      onSuccess: (backup) => toast.success(t('backups.runSuccess', { name: backup.fileName })),
      onError: (err) => toast.error(getApiErrorMessage(err) ?? t('common.error')),
    });

  return (
    <Button onClick={onRun} disabled={isPending} className="gap-1.5">
      <DatabaseBackup className="h-3.5 w-3.5" />
      <span>{isPending ? t('common.loading') : t('backups.runNow')}</span>
    </Button>
  );
}
