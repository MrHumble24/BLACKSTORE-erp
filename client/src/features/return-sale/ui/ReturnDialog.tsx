import { useState, useMemo, type FormEvent } from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  Input,
  Label,
  SelectField,
  FormError,
  DialogFormFooter,
} from '@/shared/ui';
import { formatMoney, useSubmitWithError } from '@/shared/lib';
import { useCreateSaleReturn, type SaleItem } from '@/entities/sale';

interface ReturnLedgerSummaryProps {
  itemName: string;
  debtCancelled: number;
  cashToHandBack: number;
}

function ReturnLedgerSummary({ itemName, debtCancelled, cashToHandBack }: ReturnLedgerSummaryProps) {
  const { t } = useTranslation();
  return (
    <div className="rounded-xl bg-control-gray/40 p-3 text-xs space-y-1">
      <div className="flex justify-between">
        <span className="text-slate">{t('returnDialog.item')}:</span>
        <span className="font-semibold text-ink">{itemName}</span>
      </div>
      <div className="flex justify-between">
        <span className="text-slate">{t('returnDialog.debtCancelled')}:</span>
        <span className="font-medium text-launch-orange">-{formatMoney(debtCancelled)}</span>
      </div>
      <div className="flex justify-between pt-1 border-t border-hairline-silver/60">
        <span className="text-ink font-medium">{t('returnDialog.cashToHandBack')}:</span>
        <span className="font-bold text-ink">{formatMoney(cashToHandBack)}</span>
      </div>
    </div>
  );
}

function ReturnAccessoryQtyInput({
  maxQty,
  quantity,
  onChange,
}: {
  maxQty: number;
  quantity: number;
  onChange: (val: number) => void;
}) {
  const { t } = useTranslation();
  return (
    <div className="space-y-1.5">
      <Label htmlFor="return-qty">
        {t('returnDialog.quantity')} ({t('returnDialog.maxQty')}: {maxQty})
      </Label>
      <Input
        id="return-qty"
        type="number"
        min="1"
        max={maxQty}
        value={quantity}
        onChange={(e) => onChange(Number(e.target.value))}
        required
      />
    </div>
  );
}

function useReturnDialogSubmit(
  saleId: number,
  saleItemId: number,
  isAccessory: boolean,
  onClose: () => void,
) {
  const { t } = useTranslation();
  const { error, setError, runWithCatch } = useSubmitWithError();
  const createReturn = useCreateSaleReturn();

  const submitReturn = async (payload: {
    quantity: number;
    refundAmount: string;
    result: 'BACK_TO_STOCK' | 'DEFECTIVE';
    reason: string;
    maxAllowedRefund: number;
  }) => {
    const refundNum = Number(payload.refundAmount) || 0;
    if (refundNum < 0 || refundNum > payload.maxAllowedRefund + 0.001) {
      setError(t('returnDialog.amountExceedsMax'));
      return;
    }
    await runWithCatch(async () => {
      await createReturn.mutateAsync({
        saleId,
        payload: {
          saleItemId,
          quantity: isAccessory ? payload.quantity : undefined,
          refundAmount: payload.refundAmount,
          result: payload.result,
          reason: payload.reason.trim() || undefined,
        },
      });
      toast.success(t('returnDialog.success'));
      onClose();
    });
  };

  return { error, submitReturn, isPending: createReturn.isPending };
}

function useReturnDialogFormState(saleItem: SaleItem, existingLineRefunds: number, saleBalance: string) {
  const isAccessory = saleItem.item === null;
  const maxQty = saleItem.quantity - saleItem.returnedQuantity;

  const [quantity, setQuantity] = useState(1);
  const [refundAmount, setRefundAmount] = useState(() => Number(saleItem.unitPrice).toFixed(2));
  const [result, setResult] = useState<'BACK_TO_STOCK' | 'DEFECTIVE'>('BACK_TO_STOCK');
  const [reason, setReason] = useState('');

  const maxAllowedRefund = useMemo(() => {
    return Math.max(0, Number(saleItem.unitPrice) * quantity - existingLineRefunds);
  }, [saleItem.unitPrice, quantity, existingLineRefunds]);

  const handleQtyChange = (val: number) => {
    const clamped = Math.max(1, Math.min(maxQty, val));
    setQuantity(clamped);
    setRefundAmount((Number(saleItem.unitPrice) * clamped).toFixed(2));
  };

  const refundNum = Number(refundAmount) || 0;
  const debtItCancels = Math.min(refundNum, Number(saleBalance) || 0);
  const cashToHandBack = Math.max(0, refundNum - debtItCancels);

  return {
    isAccessory,
    quantity,
    maxQty,
    refundAmount,
    setRefundAmount,
    result,
    setResult,
    reason,
    setReason,
    maxAllowedRefund,
    debtItCancels,
    cashToHandBack,
    handleQtyChange,
  };
}

function ReturnFields({ form }: { form: ReturnType<typeof useReturnDialogFormState> }) {
  const { t } = useTranslation();
  return (
    <>
      {form.isAccessory && (
        <ReturnAccessoryQtyInput
          maxQty={form.maxQty}
          quantity={form.quantity}
          onChange={form.handleQtyChange}
        />
      )}
      <div className="space-y-1.5">
        <Label htmlFor="return-refund">{t('returnDialog.refundAmount')}</Label>
        <Input
          id="return-refund"
          type="number"
          step="any"
          min="0"
          max={form.maxAllowedRefund}
          value={form.refundAmount}
          onChange={(e) => form.setRefundAmount(e.target.value)}
          required
        />
      </div>
      <SelectField
        label={t('returnDialog.result')}
        value={form.result}
        onValueChange={(val: string) => form.setResult(val as 'BACK_TO_STOCK' | 'DEFECTIVE')}
        options={[
          { value: 'BACK_TO_STOCK', label: t('returnDialog.resultBackToStock') },
          { value: 'DEFECTIVE', label: t('returnDialog.resultDefective') },
        ]}
      />
      <div className="space-y-1.5">
        <Label htmlFor="return-reason">{t('returnDialog.reason')}</Label>
        <Input
          id="return-reason"
          value={form.reason}
          onChange={(e) => form.setReason(e.target.value)}
          placeholder={t('returnDialog.reason')}
        />
      </div>
    </>
  );
}

interface ReturnDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  saleId: number;
  saleBalance: string;
  saleItem: SaleItem | null;
  existingLineRefunds: number;
}

interface ReturnDialogContentProps {
  saleId: number;
  saleBalance: string;
  saleItem: SaleItem;
  existingLineRefunds: number;
  onClose: () => void;
}

function ReturnDialogContent({
  saleId,
  saleBalance,
  saleItem,
  existingLineRefunds,
  onClose,
}: ReturnDialogContentProps) {
  const form = useReturnDialogFormState(saleItem, existingLineRefunds, saleBalance);
  const { error, submitReturn, isPending } = useReturnDialogSubmit(
    saleId,
    saleItem.id,
    form.isAccessory,
    onClose,
  );

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    void submitReturn({
      quantity: form.quantity,
      refundAmount: form.refundAmount,
      result: form.result,
      reason: form.reason,
      maxAllowedRefund: form.maxAllowedRefund,
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4 pt-2">
      {error && <FormError message={error} />}
      <ReturnLedgerSummary
        itemName={saleItem.productModel.name}
        debtCancelled={form.debtItCancels}
        cashToHandBack={form.cashToHandBack}
      />
      <ReturnFields form={form} />
      <DialogFormFooter onClose={onClose} isPending={isPending} />
    </form>
  );
}

/** Dialog for processing item returns with cash-back calculation. */
export function ReturnDialog({
  open,
  onOpenChange,
  saleId,
  saleBalance,
  saleItem,
  existingLineRefunds,
}: ReturnDialogProps) {
  const { t } = useTranslation();

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{t('returnDialog.title')}</DialogTitle>
        </DialogHeader>
        {open && saleItem && (
          <ReturnDialogContent
            saleId={saleId}
            saleBalance={saleBalance}
            saleItem={saleItem}
            existingLineRefunds={existingLineRefunds}
            onClose={() => onOpenChange(false)}
          />
        )}
      </DialogContent>
    </Dialog>
  );
}
