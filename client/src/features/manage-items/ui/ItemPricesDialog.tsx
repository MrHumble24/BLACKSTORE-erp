import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFormFooter,
  FormError,
  Input,
  Label,
} from '@/shared/ui';
import { useAuthStore } from '@/entities/session';
import { useUpdateItemPrices, type Item } from '@/entities/item';
import { getApiErrorMessage } from '@/shared/api';

interface ItemPricesDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  item: Item | null;
}

function useItemPricesForm(item: Item, onClose: () => void) {
  const { t } = useTranslation();
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const canViewCost = useAuthStore((state) => state.hasPermission('view_cost'));

  const [purchasePrice, setPurchasePrice] = useState(item.purchasePrice ?? '');
  const [salePrice, setSalePrice] = useState(item.salePrice ?? '');
  const [minSalePrice, setMinSalePrice] = useState(item.minSalePrice ?? '');
  const { mutate: updatePrices, isPending } = useUpdateItemPrices();

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    updatePrices(
      {
        id: item.id,
        payload: {
          ...(canViewCost && purchasePrice.trim() ? { purchasePrice: purchasePrice.trim() } : {}),
          ...(salePrice.trim() ? { salePrice: salePrice.trim() } : {}),
          ...(minSalePrice.trim() ? { minSalePrice: minSalePrice.trim() } : {}),
        },
      },
      {
        onSuccess: () => {
          toast.success(t('items.pricesUpdatedSuccess'));
          onClose();
        },
        onError: (err) => setErrorMessage(getApiErrorMessage(err) ?? t('common.error')),
      },
    );
  };

  return {
    canViewCost,
    purchasePrice,
    setPurchasePrice,
    salePrice,
    setSalePrice,
    minSalePrice,
    setMinSalePrice,
    errorMessage,
    isPending,
    submit,
  };
}

interface InputsProps {
  form: ReturnType<typeof useItemPricesForm>;
}

function ItemPricesFormInputs({ form }: InputsProps) {
  const { t } = useTranslation();
  return (
    <>
      {form.canViewCost && (
        <div className="space-y-1">
          <Label htmlFor="edit-purchase-price">
            {t('items.purchasePrice')}
          </Label>
          <Input
            id="edit-purchase-price"
            value={form.purchasePrice}
            onChange={(e) => form.setPurchasePrice(e.target.value)}
            placeholder="0.00"
            disabled={form.isPending}
          />
        </div>
      )}
      <div className="space-y-1">
        <Label htmlFor="edit-sale-price">
          {t('items.salePrice')}
        </Label>
        <Input
          id="edit-sale-price"
          value={form.salePrice}
          onChange={(e) => form.setSalePrice(e.target.value)}
          placeholder="0.00"
          disabled={form.isPending}
        />
      </div>
      <div className="space-y-1">
        <Label htmlFor="edit-min-price">
          {t('items.minSalePrice')}
        </Label>
        <Input
          id="edit-min-price"
          value={form.minSalePrice}
          onChange={(e) => form.setMinSalePrice(e.target.value)}
          placeholder="0.00"
          disabled={form.isPending}
        />
      </div>
    </>
  );
}

function ItemPricesContent({ item, onClose }: { item: Item; onClose: () => void }) {
  const form = useItemPricesForm(item, onClose);

  return (
    <form onSubmit={form.submit} className="space-y-4 pt-2">
      <FormError message={form.errorMessage} />
      <ItemPricesFormInputs form={form} />
      <DialogFormFooter onClose={onClose} isPending={form.isPending} />
    </form>
  );
}

/** Dialog for updating item price controls (requires manage_prices permission). */
export function ItemPricesDialog({ open, onOpenChange, item }: ItemPricesDialogProps) {
  const { t } = useTranslation();

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[460px] p-7">
        <DialogHeader>
          <DialogTitle>{t('items.editPrices')}</DialogTitle>
        </DialogHeader>
        {open && item && (
          <ItemPricesContent
            key={`prices-${item.id}`}
            item={item}
            onClose={() => onOpenChange(false)}
          />
        )}
      </DialogContent>
    </Dialog>
  );
}
