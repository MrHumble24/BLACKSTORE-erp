import { useTranslation } from 'react-i18next';
import { Pencil } from 'lucide-react';
import { Badge, Button, BackLink } from '@/shared/ui';
import type { Supplier } from '@/entities/supplier';

/** Name with active badge, the edit action and the contact line (phone, note). */
export function SupplierDetailHeader({
  supplier,
  onEdit,
}: {
  supplier: Supplier;
  onEdit: () => void;
}) {
  const { t } = useTranslation();

  return (
    <div className="space-y-3">
      <BackLink to="/suppliers" label={t('suppliers.backToList')} />
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <h1 className="text-2xl md:text-3xl font-semibold font-sf-pro-display tracking-tight text-ink">
            {supplier.name}
          </h1>
          <Badge
            variant={supplier.isActive ? 'active' : 'destructive'}
            className="px-2.5 py-0.5 text-[11px]"
          >
            {supplier.isActive ? t('common.active') : t('common.inactive')}
          </Badge>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={onEdit}
          className="h-8 px-4 rounded-full border-hairline-silver bg-gallery-white text-ink hover:bg-studio-mist hover:border-steel text-xs font-normal gap-1.5"
        >
          <Pencil className="h-3 w-3 text-apple-blue" />
          <span>{t('suppliers.editSupplier')}</span>
        </Button>
      </div>
      <p className="text-xs text-slate">
        {t('suppliers.phone')}: {supplier.phone ?? '—'}
        {supplier.note && ` · ${supplier.note}`}
      </p>
    </div>
  );
}
