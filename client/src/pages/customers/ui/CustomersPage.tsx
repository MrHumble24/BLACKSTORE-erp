import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Plus, Search } from 'lucide-react';
import { Input, Button, TablePagination } from '@/shared/ui';
import { useCustomers } from '@/entities/customer';
import { CustomerFormDialog } from '@/features/manage-customers';
import { CustomersTable } from './CustomersTable';

function CustomerSearchBar({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const { t } = useTranslation();
  return (
    <div className="relative max-w-md">
      <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate" />
      <Input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={t('customers.searchPlaceholder')}
        className="pl-9 h-10 text-xs"
      />
    </div>
  );
}

/** Customers database page with search, creation and pagination. */
export function CustomersPage() {
  const { t } = useTranslation();
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);

  const { data: customerPage, isLoading } = useCustomers(search, page, 20);

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-ink">{t('customers.title')}</h1>
          <p className="text-xs text-slate mt-0.5">{t('customers.subtitle')}</p>
        </div>
        <Button onClick={() => setDialogOpen(true)} className="gap-1.5 text-xs">
          <Plus className="h-4 w-4" />
          {t('customers.addCustomer')}
        </Button>
      </div>

      <CustomerSearchBar value={search} onChange={(val) => { setSearch(val); setPage(1); }} />
      <CustomersTable customers={customerPage?.items ?? []} isLoading={isLoading} />

      {customerPage && customerPage.total > 0 && (
        <TablePagination
          page={page}
          totalPages={Math.max(1, Math.ceil(customerPage.total / customerPage.pageSize))}
          total={customerPage.total}
          onPageChange={setPage}
        />
      )}
      <CustomerFormDialog open={dialogOpen} onOpenChange={setDialogOpen} />
    </div>
  );
}
