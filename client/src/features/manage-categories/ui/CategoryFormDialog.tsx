import { useTranslation } from 'react-i18next';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/shared/ui';
import type { Category } from '@/entities/category';
import { CategoryFormContent } from './CategoryFormContent';

interface CategoryFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  category?: Category | null;
}

/** Dialog for creating a new category or editing an existing one. */
export function CategoryFormDialog({ open, onOpenChange, category }: CategoryFormDialogProps) {
  const { t } = useTranslation();

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[460px] p-7">
        <DialogHeader>
          <DialogTitle>
            {category ? t('categories.editCategory') : t('categories.addCategory')}
          </DialogTitle>
        </DialogHeader>
        {open && (
          <CategoryFormContent
            key={category ? `edit-${category.id}` : 'create'}
            category={category ?? null}
            onClose={() => onOpenChange(false)}
          />
        )}
      </DialogContent>
    </Dialog>
  );
}
