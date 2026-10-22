import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import { ActiveToggleButton } from '@/shared/ui';
import { getApiErrorMessage } from '@/shared/api';
import { useUpdateSupplier } from '../api';
import type { SupplierSummary } from '../model/types';

/** Activates or deactivates a supplier from the suppliers table (manage_suppliers). */
export function SupplierActiveToggle({ supplier }: { supplier: SupplierSummary }) {
  const { t } = useTranslation();
  const { mutate: update, isPending } = useUpdateSupplier();

  const handleToggle = () => {
    update(
      { id: supplier.id, payload: { isActive: !supplier.isActive } },
      {
        onSuccess: () => toast.success(t('suppliers.updatedSuccess')),
        onError: (err) => toast.error(getApiErrorMessage(err) ?? t('common.error')),
      },
    );
  };

  return <ActiveToggleButton isActive={supplier.isActive} isPending={isPending} onToggle={handleToggle} />;
}
