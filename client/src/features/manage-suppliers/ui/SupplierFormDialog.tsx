import { useTranslation } from 'react-i18next';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/shared/ui';
import type { Supplier } from '@/entities/supplier';
import { SupplierFormContent } from './SupplierFormContent';

interface SupplierFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** When provided the dialog edits this supplier, otherwise it creates a new one. */
  supplier?: Supplier | null;
}

/** Dialog for adding or editing a supplier (name, country, phone, note). */
export function SupplierFormDialog({ open, onOpenChange, supplier }: SupplierFormDialogProps) {
  const { t } = useTranslation();

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[480px] p-7">
        <DialogHeader>
          <DialogTitle>
            {supplier ? t('suppliers.editSupplier') : t('suppliers.addSupplier')}
          </DialogTitle>
        </DialogHeader>
        {open && (
          <SupplierFormContent
            key={supplier ? `edit-${supplier.id}` : 'create'}
            supplier={supplier ?? null}
            onClose={() => onOpenChange(false)}
          />
        )}
      </DialogContent>
    </Dialog>
  );
}
