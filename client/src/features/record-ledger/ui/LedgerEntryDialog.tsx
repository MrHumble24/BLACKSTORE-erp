import { useTranslation } from 'react-i18next';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/shared/ui';
import { LedgerEntryContent } from './LedgerEntryContent';

/** Dialog for adding one income/expense ledger entry (manage_expenses). */
export function LedgerEntryDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (o: boolean) => void }) {
  const { t } = useTranslation();

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[480px] p-7">
        <DialogHeader>
          <DialogTitle>{t('ledger.addEntry')}</DialogTitle>
        </DialogHeader>
        {open && <LedgerEntryContent onClose={() => onOpenChange(false)} />}
      </DialogContent>
    </Dialog>
  );
}
