import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useBackups, type Backup } from '@/entities/backup';
import { RunBackupButton, RestoreDialog } from '@/features/backups';
import { BackupsTable } from './BackupsTable';

/** Backups page (FR-31, manage_backups): manual run, history table, per-row restore. */
export function BackupsPage() {
  const { t } = useTranslation();
  const [restoreBackup, setRestoreBackup] = useState<Backup | null>(null);
  const { data: backups = [], isLoading } = useBackups();

  return (
    <div className="space-y-6">
      <div className="space-y-1">
        <h1 className="text-2xl md:text-3xl font-semibold font-sf-pro-display tracking-tight text-ink">
          {t('backups.title')}
        </h1>
        <p className="text-xs text-slate">{t('backups.subtitle')}</p>
      </div>

      <div className="flex justify-start">
        <RunBackupButton />
      </div>

      <BackupsTable backups={backups} isLoading={isLoading} onRestore={setRestoreBackup} />

      <RestoreDialog
        backup={restoreBackup}
        onOpenChange={(open) => {
          if (!open) setRestoreBackup(null);
        }}
      />
    </div>
  );
}
