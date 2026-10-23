import { useTranslation } from 'react-i18next';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/shared/ui';
import type { CategoryAttribute } from '@/entities/category';
import { AttributeFormContent } from './AttributeFormContent';

interface AttributeFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  categoryId: number;
  attribute?: CategoryAttribute | null;
  defaultSortOrder?: number;
}

/** Dialog for adding a category attribute or editing an existing one. */
export function AttributeFormDialog({
  open,
  onOpenChange,
  categoryId,
  attribute,
  defaultSortOrder,
}: AttributeFormDialogProps) {
  const { t } = useTranslation();

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[480px] p-7">
        <DialogHeader>
          <DialogTitle>
            {attribute ? t('categories.editAttribute') : t('categories.addAttribute')}
          </DialogTitle>
        </DialogHeader>
        {open && (
          <AttributeFormContent
            key={attribute ? `edit-${attribute.id}` : 'create'}
            categoryId={categoryId}
            attribute={attribute ?? null}
            defaultSortOrder={defaultSortOrder}
            onClose={() => onOpenChange(false)}
          />
        )}
      </DialogContent>
    </Dialog>
  );
}
