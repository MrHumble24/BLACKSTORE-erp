import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Search } from 'lucide-react';
import { Input, TablePagination } from '@/shared/ui';
import { usePartners } from '@/entities/partner';
import { PartnersTable } from './PartnersTable';

/** Current tab of /partners: search plus the paginated partners table (held, credit, owed, overdue). */
export function CurrentPartnersTab() {
  const { t } = useTranslation();
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);

  const { data: partnersPage, isLoading } = usePartners(search, page, 20);

  const totalPages = Math.max(
    1,
    Math.ceil((partnersPage?.total ?? 0) / (partnersPage?.pageSize ?? 20)),
  );

  return (
    <div className="space-y-6">
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
    </div>
  );
}
