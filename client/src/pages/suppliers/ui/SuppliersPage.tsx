import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Plus } from 'lucide-react';
import { Button } from '@/shared/ui';
import { useSuppliers } from '@/entities/supplier';
import { SupplierFormDialog } from '@/features/manage-suppliers';
import { SuppliersTable } from './SuppliersTable';

/** Master data page for suppliers (who the stock is bought from), gated by manage_suppliers. */
export function SuppliersPage() {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const { data: suppliers = [], isLoading } = useSuppliers(true);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="space-y-1">
          <h1 className="text-2xl md:text-3xl font-semibold font-sf-pro-display tracking-tight text-ink">
            {t('suppliers.title')}
          </h1>
          <p className="text-xs text-slate">{t('suppliers.subtitle')}</p>
        </div>
        <Button
          onClick={() => setOpen(true)}
          className="gap-2 bg-pricing-blue hover:bg-pricing-blue/90 text-white rounded-full text-xs font-medium px-5 h-9 shrink-0 shadow-none border-0 cursor-pointer"
        >
          <Plus className="h-3.5 w-3.5" />
          <span>{t('suppliers.addSupplier')}</span>
        </Button>
      </div>

      <SuppliersTable suppliers={suppliers} isLoading={isLoading} />

      <SupplierFormDialog open={open} onOpenChange={setOpen} />
    </div>
  );
}
