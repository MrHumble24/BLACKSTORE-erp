import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import { ActiveToggleButton } from '@/shared/ui';
import { getApiErrorMessage } from '@/shared/api';
import { useUpdateProductModel } from '../api';
import type { ProductModel } from '../model/types';

interface ProductModelActiveToggleProps {
  productModel: ProductModel;
}

/** Activates or deactivates a product model instead of deleting it (BR-12). */
export function ProductModelActiveToggle({ productModel }: ProductModelActiveToggleProps) {
  const { t } = useTranslation();
  const { mutate: update, isPending } = useUpdateProductModel();

  const handleToggle = () => {
    update(
      { id: productModel.id, payload: { isActive: !productModel.isActive } },
      {
        onSuccess: () => toast.success(t('productModels.updatedSuccess')),
        onError: (err) => toast.error(getApiErrorMessage(err) ?? t('common.error')),
      },
    );
  };

  return (
    <ActiveToggleButton
      isActive={productModel.isActive}
      isPending={isPending}
      onToggle={handleToggle}
    />
  );
}
