import { useTranslation } from 'react-i18next';
import { RotateCcw } from 'lucide-react';
import {
  Badge, Button, Table, TableBody, TableCell, TableHead, TableHeader,
  TableRow, TableEmptyRow, TableLoadingRow,
} from '@/shared/ui';
import { formatDateTime } from '@/shared/lib';
import { formatFileSize } from '@/shared/lib';
import type { Backup } from '@/entities/backup';

/** Telegram and second-copy badges of one backup row; '—' when the step did not run. */
function BackupCopiesCell({ backup }: { backup: Backup }) {
  const { t } = useTranslation();

  return (
    <div className="flex flex-wrap items-center gap-1.5">
      {backup.sentToTelegram ? (
        <Badge variant="secondary" className="text-[11px]">{t('backups.telegram')}</Badge>
      ) : (
        <span className="text-xs text-slate">—</span>
      )}
      {backup.secondCopy ? (
        <Badge variant="outline" className="text-[11px]">{t('backups.secondCopy')}</Badge>
      ) : null}
    </div>
  );
}

/** One row: file name, size, created at, delivery badges and the restore button. */
function BackupRow({ backup, onRestore }: { backup: Backup; onRestore: (backup: Backup) => void }) {
  const { t } = useTranslation();

  return (
    <TableRow className="border-b border-hairline-silver/40">
      <TableCell className="text-xs text-ink">{backup.fileName}</TableCell>
      <TableCell className="text-xs text-slate">{formatFileSize(backup.size)}</TableCell>
      <TableCell className="text-xs text-slate">{formatDateTime(backup.createdAt)}</TableCell>
      <TableCell>
        <BackupCopiesCell backup={backup} />
      </TableCell>
      <TableCell className="text-right">
        <Button
          variant="outline"
          size="sm"
          onClick={() => onRestore(backup)}
          className="h-7 px-3 rounded-full border-hairline-silver bg-gallery-white text-ink hover:bg-studio-mist text-xs font-normal gap-1"
        >
          <RotateCcw className="h-3 w-3 text-apple-blue" />
          <span>{t('backups.restore')}</span>
        </Button>
      </TableCell>
    </TableRow>
  );
}

/** Backups table (FR-31): the last 30 files, newest first, each restorable. */
export function BackupsTable({
  backups,
  isLoading,
  onRestore,
}: {
  backups: Backup[];
  isLoading: boolean;
  onRestore: (backup: Backup) => void;
}) {
  const { t } = useTranslation();

  return (
    <div className="rounded-[28px] border border-hairline-silver/70 bg-gallery-white overflow-hidden shadow-none p-1">
      <Table>
        <TableHeader>
          <TableRow className="border-b border-hairline-silver/60 hover:bg-transparent">
            <TableHead>{t('backups.fileName')}</TableHead>
            <TableHead>{t('backups.size')}</TableHead>
            <TableHead>{t('backups.createdAt')}</TableHead>
            <TableHead>{t('backups.status')}</TableHead>
            <TableHead className="w-10" />
          </TableRow>
        </TableHeader>
        <TableBody>
          {isLoading && <TableLoadingRow colSpan={5} />}
          {!isLoading && backups.length === 0 && (
            <TableEmptyRow colSpan={5} message={t('backups.empty')} />
          )}
          {!isLoading &&
            backups.map((backup) => (
              <BackupRow key={backup.fileName} backup={backup} onRestore={onRestore} />
            ))}
        </TableBody>
      </Table>
    </div>
  );
}
