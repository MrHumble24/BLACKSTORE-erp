import { useState, type FormEvent } from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  SelectField,
  FormError,
  DialogFormFooter,
} from '@/shared/ui';
import { formatMoney, useSubmitWithError } from '@/shared/lib';
import { useSellConsignmentItem } from '@/entities/consignment';
import type { PaymentMethod } from '@/entities/sale';

interface SellItemDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  consignmentId: number;
  itemId: number;
  minPrice: string;
}

interface SellItemFormContentProps {
  consignmentId: number;
  itemId: number;
  minPrice: string;
  onClose: () => void;
}

function SellItemPriceHint({ minPrice }: { minPrice: string }) {
  const { t } = useTranslation();
  return (
    <div className="rounded-xl bg-control-gray/40 p-3 text-xs space-y-1">
      <div className="flex justify-between items-center">
        <span className="text-slate">{t('consign.salePrice')}:</span>
        <span className="font-semibold text-ink font-mono text-sm">{formatMoney(minPrice)}</span>
      </div>
      <p className="text-[11px] text-slate mt-1">{t('consign.priceFixedHint')}</p>
    </div>
  );
}

function useSellItemForm(consignmentId: number, itemId: number, onClose: () => void) {
  const { t } = useTranslation();
  const [paid, setPaid] = useState<string>('true');
  const [method, setMethod] = useState<PaymentMethod>('CASH');
  const { error, runWithCatch } = useSubmitWithError();
  const sellItem = useSellConsignmentItem();

  const isPaid = paid === 'true';

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    await runWithCatch(async () => {
      await sellItem.mutateAsync({
        consignmentId,
        itemId,
        payload: { paid: isPaid, method: isPaid ? method : undefined },
      });
      toast.success(t('consign.soldSuccess'));
      onClose();
    });
  };

  return { paid, setPaid, method, setMethod, isPaid, isPending: sellItem.isPending, error, handleSubmit };
}

function SellItemFormContent({
  consignmentId,
  itemId,
  minPrice,
  onClose,
}: SellItemFormContentProps) {
  const { t } = useTranslation();
  const { paid, setPaid, method, setMethod, isPaid, isPending, error, handleSubmit } =
    useSellItemForm(consignmentId, itemId, onClose);

  const paidOptions = [
    { value: 'true', label: t('consign.paidYes') },
    { value: 'false', label: t('consign.paidNoDebt') },
  ];
  const methodOptions = [
    { value: 'CASH', label: t('sales.methodCash') },
    { value: 'CARD', label: t('sales.methodCard') },
  ];

  return (
    <form onSubmit={handleSubmit} className="space-y-4 pt-2">
      {error && <FormError message={error} />}
      <SellItemPriceHint minPrice={minPrice} />
      <SelectField label={t('consign.paymentStatus')} value={paid} onValueChange={setPaid} options={paidOptions} />
      {isPaid && (
        <SelectField
          label={t('consign.paymentMethod')}
          value={method}
          onValueChange={(val) => setMethod(val as PaymentMethod)}
          options={methodOptions}
        />
      )}
      <DialogFormFooter onClose={onClose} isPending={isPending} />
    </form>
  );
}

/** Dialog for recording the sale of an item currently AT_PARTNER. */
export function SellItemDialog({
  open,
  onOpenChange,
  consignmentId,
  itemId,
  minPrice,
}: SellItemDialogProps) {
  const { t } = useTranslation();

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{t('consign.markAsSold')}</DialogTitle>
        </DialogHeader>
        {open && (
          <SellItemFormContent
            consignmentId={consignmentId}
            itemId={itemId}
            minPrice={minPrice}
            onClose={() => onOpenChange(false)}
          />
        )}
      </DialogContent>
    </Dialog>
  );
}
