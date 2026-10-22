import { useTranslation } from 'react-i18next';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/shared/ui';
import type { Investor } from '@/entities/investor';
import { InvestorFormContent } from './InvestorFormContent';

interface InvestorFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  investor?: Investor | null;
}

/** Dialog for creating a new investor or editing split settings of an existing one. */
export function InvestorFormDialog({ open, onOpenChange, investor }: InvestorFormDialogProps) {
  const { t } = useTranslation();

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[460px] p-7">
        <DialogHeader>
          <DialogTitle>
            {investor ? t('investors.editInvestor') : t('investors.addInvestor')}
          </DialogTitle>
        </DialogHeader>
        {open && (
          <InvestorFormContent
            key={investor ? `edit-${investor.id}` : 'create'}
            investor={investor ?? null}
            onClose={() => onOpenChange(false)}
          />
        )}
      </DialogContent>
    </Dialog>
  );
}
