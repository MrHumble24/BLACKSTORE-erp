import { useTranslation } from 'react-i18next';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/shared/ui';
import type { ProductModel } from '@/entities/product-model';
import { ProductModelFormContent } from './ProductModelFormContent';

interface ProductModelFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  productModel?: ProductModel | null;
  /** Optional preset category for create mode (used on a category detail page). */
  defaultCategoryId?: number;
}

/** Dialog for creating or editing a product model. */
export function ProductModelFormDialog({
  open,
  onOpenChange,
  productModel,
  defaultCategoryId,
}: ProductModelFormDialogProps) {
  const { t } = useTranslation();

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[460px] p-7">
        <DialogHeader>
          <DialogTitle>
            {productModel ? t('productModels.editModel') : t('productModels.addModel')}
          </DialogTitle>
        </DialogHeader>
        {open && (
          <ProductModelFormContent
            key={productModel ? `edit-${productModel.id}` : `create-${defaultCategoryId ?? 'any'}`}
            productModel={productModel ?? null}
            defaultCategoryId={defaultCategoryId}
            onClose={() => onOpenChange(false)}
          />
        )}
      </DialogContent>
    </Dialog>
  );
}
