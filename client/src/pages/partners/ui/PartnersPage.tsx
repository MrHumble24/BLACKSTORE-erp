import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Plus, Search } from 'lucide-react';
import { Button, Input, TablePagination } from '@/shared/ui';
import { usePartners } from '@/entities/partner';
import { PartnerFormDialog } from '@/features/manage-partners';
import { PartnersTable } from './PartnersTable';

interface PartnersHeaderProps {
  onAdd: () => void;
}

function PartnersHeader({ onAdd }: PartnersHeaderProps) {
  const { t } = useTranslation();
  return (
    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
      <div>
        <h1 className="text-xl font-bold tracking-tight text-ink">{t('partners.title')}</h1>
        <p className="text-xs text-slate mt-0.5">{t('partners.subtitle')}</p>
      </div>
      <Button onClick={onAdd} className="gap-1.5 h-8 text-xs">
        <Plus className="h-4 w-4" />
        <span>{t('partners.addPartner')}</span>
      </Button>
    </div>
  );
}

/** Main partners listing page with search, stats table and partner creation dialog. */
export function PartnersPage() {
  const { t } = useTranslation();
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [dialogOpen, setDialogOpen] = useState(false);

  const { data: partnersPage, isLoading } = usePartners(search, page, 20);

  const totalPages = Math.max(
    1,
    Math.ceil((partnersPage?.total ?? 0) / (partnersPage?.pageSize ?? 20)),
  );

  return (
    <div className="space-y-6">
      <PartnersHeader onAdd={() => setDialogOpen(true)} />
      <div className="flex items-center gap-3">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate" />
          <Input
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            placeholder={t('partners.searchPlaceholder')}
            className="pl-9 h-8 text-xs rounded-full"
          />
        </div>
      </div>
      {isLoading ? (
        <div className="p-12 text-center text-xs text-slate">{t('common.loading')}</div>
      ) : (
        <PartnersTable partners={partnersPage?.items ?? []} />
      )}
      {partnersPage && partnersPage.total > 0 && (
        <TablePagination
          page={page}
          totalPages={totalPages}
          total={partnersPage.total}
          onPageChange={setPage}
        />
      )}
      <PartnerFormDialog open={dialogOpen} onOpenChange={setDialogOpen} />
    </div>
  );
}
