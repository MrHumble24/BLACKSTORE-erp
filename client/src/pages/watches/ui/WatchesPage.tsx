import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Plus } from 'lucide-react';
import { Button, TablePagination } from '@/shared/ui';
import { useWatches, type Watch } from '@/entities/watch';
import { WatchFormDialog } from '@/features/manage-watches';
import { WatchesTable } from './WatchesTable';

const PAGE_SIZE = 20;

/** Watches page (F34, manage_watches): what the Telegram Watcher looks for. */
export function WatchesPage() {
  const { t } = useTranslation();
  const [page, setPage] = useState(1);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Watch | null>(null);
  const { data: watchPage, isLoading } = useWatches(page, PAGE_SIZE);

  const openDialog = (watch: Watch | null) => {
    setEditing(watch);
    setDialogOpen(true);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-ink">{t('watches.title')}</h1>
          <p className="text-xs text-slate mt-0.5">{t('watches.subtitle')}</p>
        </div>
        <Button onClick={() => openDialog(null)} className="gap-1.5 text-xs">
          <Plus className="h-4 w-4" />
          {t('watches.addWatch')}
        </Button>
      </div>
      <WatchesTable watches={watchPage?.items ?? []} isLoading={isLoading} onEdit={openDialog} />
      {watchPage && watchPage.total > 0 && (
        <TablePagination
          page={page}
          totalPages={Math.max(1, Math.ceil(watchPage.total / watchPage.pageSize))}
          total={watchPage.total}
          onPageChange={setPage}
        />
      )}
      <WatchFormDialog open={dialogOpen} onOpenChange={setDialogOpen} watch={editing} />
    </div>
  );
}
