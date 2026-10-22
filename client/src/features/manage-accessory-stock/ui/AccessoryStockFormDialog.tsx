import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFormFooter,
  FormError,
} from '@/shared/ui';
import { useCategories } from '@/entities/category';
import { useProductModels } from '@/entities/product-model';
import { useLocations } from '@/entities/location';
import { useAddAccessoryStock } from '@/entities/accessory-stock';
import { useAuthStore } from '@/entities/session';
import { getApiErrorMessage } from '@/shared/api';
import { AccessorySelectFields } from './AccessorySelectFields';
import { AccessoryQtyFields } from './AccessoryQtyFields';

interface AccessoryStockFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

interface StockFormValues {
  categoryId: number;
  productModelId: number;
  locationId: number;
  quantity: string;
  unitCost: string;
}

function useAccessoryStockForm(onClose: () => void) {
  const { t } = useTranslation();
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const canManagePrices = useAuthStore((state) => state.hasPermission('manage_prices'));
  const { mutate: addStock, isPending } = useAddAccessoryStock();

  const form = useForm<StockFormValues>({
    defaultValues: {
      categoryId: 0,
      productModelId: 0,
      locationId: 0,
      quantity: '1',
      unitCost: '',
    },
  });

  const submit = (values: StockFormValues) => {
    setErrorMessage(null);
    const qty = Number(values.quantity);
    if (!values.productModelId) return setErrorMessage(t('accessories.validation.modelRequired'));
    if (!values.locationId) return setErrorMessage(t('accessories.validation.locationRequired'));
    if (!qty || qty <= 0 || !Number.isInteger(qty)) {
      return setErrorMessage(t('accessories.validation.quantityPositive'));
    }

    addStock(
      {
        productModelId: values.productModelId,
        locationId: values.locationId,
        quantity: qty,
        ...(canManagePrices && values.unitCost.trim() ? { unitCost: values.unitCost.trim() } : {}),
      },
      {
        onSuccess: () => {
          toast.success(t('accessories.stockAddedSuccess'));
          onClose();
        },
        onError: (err) => setErrorMessage(getApiErrorMessage(err) ?? t('common.error')),
      },
    );
  };

  return { form, errorMessage, canManagePrices, isPending, submit };
}

function AccessoryStockContent({ onClose }: { onClose: () => void }) {
  const { form, errorMessage, canManagePrices, isPending, submit } = useAccessoryStockForm(onClose);
  const { handleSubmit, setValue, watch } = form;

  const categoryId = watch('categoryId');
  const productModelId = watch('productModelId');
  const locationId = watch('locationId');
  const quantity = watch('quantity');
  const unitCost = watch('unitCost');

  const { data: categories = [] } = useCategories();
  const nonSerializedCategories = categories.filter((c) => !c.isSerialized);
  const { data: models = [] } = useProductModels(categoryId || undefined);
  const { data: locations = [] } = useLocations();

  return (
    <form onSubmit={handleSubmit(submit)} className="space-y-4 pt-2">
      <FormError message={errorMessage} />

      <AccessorySelectFields
        categoryId={categoryId}
        onCategoryChange={(catId) => {
          setValue('categoryId', catId);
          setValue('productModelId', 0);
        }}
        categories={nonSerializedCategories}
        productModelId={productModelId}
        onModelChange={(id) => setValue('productModelId', id)}
        models={models}
        locationId={locationId}
        onLocationChange={(id) => setValue('locationId', id)}
        locations={locations}
        disabled={isPending}
      />

      <AccessoryQtyFields
        quantity={quantity}
        onQuantityChange={(q) => setValue('quantity', q)}
        unitCost={unitCost}
        onUnitCostChange={(c) => setValue('unitCost', c)}
        canManagePrices={canManagePrices}
        disabled={isPending}
      />

      <DialogFormFooter onClose={onClose} isPending={isPending} />
    </form>
  );
}

/** Dialog for entering accessory stock quantities into locations. */
export function AccessoryStockFormDialog({
  open,
  onOpenChange,
}: AccessoryStockFormDialogProps) {
  const { t } = useTranslation();

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[480px] p-7">
        <DialogHeader>
          <DialogTitle>{t('accessories.addStock')}</DialogTitle>
        </DialogHeader>
        {open && <AccessoryStockContent onClose={() => onOpenChange(false)} />}
      </DialogContent>
    </Dialog>
  );
}
