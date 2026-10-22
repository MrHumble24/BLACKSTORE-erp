import { useState, type FormEvent } from 'react';
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
import { useAddSalePayment, type PaymentMethod } from '@/entities/sale';

interface PaymentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  saleId: number;
  balance: string;
}

interface PaymentFieldsProps {
  amount: string;
  balance: string;
  method: PaymentMethod;
  onAmountChange: (a: string) => void;
  onMethodChange: (m: PaymentMethod) => void;
}

function PaymentFields({
  amount,
  balance,
  method,
  onAmountChange,
  onMethodChange,
}: PaymentFieldsProps) {
  const { t } = useTranslation();
  const methodOptions = [
    { value: 'CASH', label: t('sales.methodCash') },
    { value: 'CARD', label: t('sales.methodCard') },
  ];

  return (
    <>
      <div className="rounded-xl bg-control-gray/40 p-3 text-xs flex justify-between items-center">
        <span className="text-slate">{t('paymentDialog.balance')}:</span>
        <span className="font-semibold text-ink">{formatMoney(balance)}</span>
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="payment-amount">{t('paymentDialog.amount')}</Label>
        <Input
          id="payment-amount"
          type="number"
          step="any"
          min="0.01"
          max={balance}
          value={amount}
          onChange={(e) => onAmountChange(e.target.value)}
          required
        />
      </div>
      <SelectField
        label={t('paymentDialog.method')}
        value={method}
        onValueChange={(val: string) => onMethodChange(val as PaymentMethod)}
        options={methodOptions}
      />
    </>
  );
}

interface PaymentDialogContentProps {
  saleId: number;
  balance: string;
  onClose: () => void;
}

function PaymentDialogContent({ saleId, balance, onClose }: PaymentDialogContentProps) {
  const { t } = useTranslation();
  const [amount, setAmount] = useState(balance);
  const [method, setMethod] = useState<PaymentMethod>('CASH');
  const { error, setError, runWithCatch } = useSubmitWithError();
  const addPayment = useAddSalePayment();

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    const numAmount = Number(amount);
    const numBalance = Number(balance);

    if (Number.isNaN(numAmount) || numAmount <= 0 || numAmount > numBalance) {
      setError(t('paymentDialog.amountInvalid'));
      return;
    }

    await runWithCatch(async () => {
      await addPayment.mutateAsync({ saleId, payload: { amount, method } });
      toast.success(t('paymentDialog.success'));
      onClose();
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4 pt-2">
      {error && <FormError message={error} />}
      <PaymentFields
        amount={amount}
        balance={balance}
        method={method}
        onAmountChange={setAmount}
        onMethodChange={setMethod}
      />
      <DialogFormFooter
        onClose={onClose}
        isPending={addPayment.isPending}
        saveText={t('paymentDialog.submit')}
      />
    </form>
  );
}

/** Dialog for recording a payment against a debt sale. */
export function PaymentDialog({ open, onOpenChange, saleId, balance }: PaymentDialogProps) {
  const { t } = useTranslation();

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{t('paymentDialog.title')}</DialogTitle>
        </DialogHeader>
        {open && (
          <PaymentDialogContent
            saleId={saleId}
            balance={balance}
            onClose={() => onOpenChange(false)}
          />
        )}
      </DialogContent>
    </Dialog>
  );
}
