import { useTranslation } from 'react-i18next';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/shared/ui';
import { ItemFormContent } from './ItemFormContent';

interface ItemFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

/** Dialog for creating a new serialized device item. */
export function ItemFormDialog({ open, onOpenChange }: ItemFormDialogProps) {
  const { t } = useTranslation();

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[640px] max-h-[90vh] overflow-y-auto p-7">
        <DialogHeader>
          <DialogTitle>{t('items.addItem')}</DialogTitle>
        </DialogHeader>
        {open && <ItemFormContent onClose={() => onOpenChange(false)} />}
      </DialogContent>
    </Dialog>
  );
}
