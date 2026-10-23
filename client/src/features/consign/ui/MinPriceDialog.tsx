import { useState, type FormEvent } from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  TextField,
  FormError,
  DialogFormFooter,
} from '@/shared/ui';
import { normalizeMoney, isStrictlyPositiveMoney, useSubmitWithError } from '@/shared/lib';
import { useUpdateConsignmentItemPrice } from '@/entities/consignment';

interface MinPriceDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  consignmentId: number;
  itemId: number;
  currentMinPrice: string;
}

interface MinPriceFormContentProps {
  consignmentId: number;
  itemId: number;
  currentMinPrice: string;
  onClose: () => void;
}

function MinPriceFormContent({
  consignmentId,
  itemId,
  currentMinPrice,
  onClose,
}: MinPriceFormContentProps) {
  const { t } = useTranslation();
  const [minPrice, setMinPrice] = useState(currentMinPrice);
  const { error, setError, runWithCatch } = useSubmitWithError();
  const updatePrice = useUpdateConsignmentItemPrice();

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!isStrictlyPositiveMoney(minPrice)) {
      setError(t('consign.minPriceRequired'));
      return;
    }
    await runWithCatch(async () => {
      await updatePrice.mutateAsync({ consignmentId, itemId, minPrice: normalizeMoney(minPrice) });
      toast.success(t('consign.priceUpdatedSuccess'));
      onClose();
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4 pt-2">
      {error && <FormError message={error} />}
      <TextField
        id="consignment-min-price"
        label={t('consign.minPrice')}
        type="number"
        step="any"
        min="0.01"
        value={minPrice}
        onChange={(e) => setMinPrice(e.target.value)}
        required
        autoFocus
      />
      <DialogFormFooter onClose={onClose} isPending={updatePrice.isPending} />
    </form>
  );
}

/** Dialog for updating minimum price of an item while AT_PARTNER. */
export function MinPriceDialog({
  open,
  onOpenChange,
  consignmentId,
  itemId,
  currentMinPrice,
}: MinPriceDialogProps) {
  const { t } = useTranslation();

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{t('consign.editMinPrice')}</DialogTitle>
        </DialogHeader>
        {open && (
          <MinPriceFormContent
            consignmentId={consignmentId}
            itemId={itemId}
            currentMinPrice={currentMinPrice}
            onClose={() => onOpenChange(false)}
          />
        )}
      </DialogContent>
    </Dialog>
  );
}
