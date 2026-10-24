import { useTranslation } from 'react-i18next';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/shared/ui';
import { SupplierPaymentContent } from './SupplierPaymentContent';

interface SupplierPaymentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  supplierId: number;
  /** Set when the supplier is an investor's account (F26): the fee switch replaces "Whose money". */
  linkedInvestorName?: string;
}

/** Dialog for recording a payment (or negative correction) for a supplier. */
export function SupplierPaymentDialog({
  open,
  onOpenChange,
  supplierId,
  linkedInvestorName,
}: SupplierPaymentDialogProps) {
  const { t } = useTranslation();

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[480px] p-7">
        <DialogHeader>
          <DialogTitle>{t('suppliers.addPayment')}</DialogTitle>
        </DialogHeader>
        {open && (
          <SupplierPaymentContent
            key={supplierId}
            supplierId={supplierId}
            linkedInvestorName={linkedInvestorName}
            onClose={() => onOpenChange(false)}
          />
        )}
      </DialogContent>
    </Dialog>
  );
}
