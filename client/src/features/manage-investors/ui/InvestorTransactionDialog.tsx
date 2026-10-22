import { useTranslation } from 'react-i18next';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/shared/ui';
import { InvestorTransactionContent } from './InvestorTransactionContent';

interface InvestorTransactionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  investorId: number;
}

/** Dialog for recording money an investor put in or was paid back. */
export function InvestorTransactionDialog({
  open,
  onOpenChange,
  investorId,
}: InvestorTransactionDialogProps) {
  const { t } = useTranslation();

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[460px] p-7">
        <DialogHeader>
          <DialogTitle>{t('investors.addTransaction')}</DialogTitle>
        </DialogHeader>
        {open && (
          <InvestorTransactionContent
            key={`${investorId}-${open}`}
            investorId={investorId}
            onClose={() => onOpenChange(false)}
          />
        )}
      </DialogContent>
    </Dialog>
  );
}
