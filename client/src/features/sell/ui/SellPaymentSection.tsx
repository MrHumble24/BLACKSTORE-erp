import { useTranslation } from 'react-i18next';
import { CreditCard, Banknote } from 'lucide-react';
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
  CardFooter,
  Input,
  Label,
  Button,
  FormError,
} from '@/shared/ui';
import { formatMoney } from '@/shared/lib';
import type { PaymentMethod } from '@/entities/sale';
import { SellCustomerPicker, type InlineCustomer } from './SellCustomerPicker';

interface PaymentMethodToggleProps {
  method: PaymentMethod;
  onChange: (m: PaymentMethod) => void;
}

function PaymentMethodToggle({ method, onChange }: PaymentMethodToggleProps) {
  const { t } = useTranslation();
  return (
    <div className="space-y-1.5">
      <Label className="text-xs">{t('sell.paymentMethod')}</Label>
      <div className="grid grid-cols-2 gap-2">
        <Button
          type="button"
          variant={method === 'CASH' ? 'default' : 'outline'}
          onClick={() => onChange('CASH')}
          className="h-10 gap-2 text-xs"
        >
          <Banknote className="h-4 w-4" />
          {t('sales.methodCash')}
        </Button>
        <Button
          type="button"
          variant={method === 'CARD' ? 'default' : 'outline'}
          onClick={() => onChange('CARD')}
          className="h-10 gap-2 text-xs"
        >
          <CreditCard className="h-4 w-4" />
          {t('sales.methodCard')}
        </Button>
      </div>
    </div>
  );
}

interface PaymentAmountFieldProps {
  amount: string;
  total: string;
  onChange: (amount: string) => void;
}

function PaymentAmountField({ amount, total, onChange }: PaymentAmountFieldProps) {
  const { t } = useTranslation();
  return (
    <div className="space-y-1.5">
      <div className="flex justify-between items-center">
        <Label htmlFor="payment-amount" className="text-xs">{t('sell.paymentAmount')}</Label>
        <Button
          type="button"
          variant="link"
          size="sm"
          onClick={() => onChange(total)}
          className="h-5 p-0 text-[11px] text-apple-blue"
        >
          {t('sell.fullPayment')}
        </Button>
      </div>
      <Input
        id="payment-amount"
        type="number"
        step="any"
        min="0"
        max={total}
        value={amount}
        onChange={(e) => onChange(e.target.value)}
        className="h-10 text-sm font-mono"
      />
    </div>
  );
}

function SellTotalSummary({ total }: { total: string }) {
  const { t } = useTranslation();
  return (
    <div className="rounded-xl bg-control-gray/50 p-4 flex justify-between items-center">
      <span className="text-sm font-medium text-slate">{t('sell.summaryTotal')}</span>
      <span className="text-2xl font-bold tracking-tight text-ink">{formatMoney(total)}</span>
    </div>
  );
}

interface SellPaymentSectionProps {
  total: string;
  paymentMethod: PaymentMethod;
  onPaymentMethodChange: (m: PaymentMethod) => void;
  paymentAmount: string;
  onPaymentAmountChange: (amount: string) => void;
  customerId: number | null;
  onCustomerIdChange: (id: number | null) => void;
  inlineCustomer: InlineCustomer | null;
  onInlineCustomerChange: (data: InlineCustomer | null) => void;
  dueDate: string;
  onDueDateChange: (d: string) => void;
  canManagePrices: boolean;
  hasPriceBelowMin: boolean;
  hasLines: boolean;
  isPending: boolean;
  onSubmit: () => void;
  error: string | null;
}

function useSellPaymentState(props: SellPaymentSectionProps) {
  const paidCents = Math.round((Number(props.paymentAmount) || 0) * 100);
  const totalCents = Math.round((Number(props.total) || 0) * 100);
  const isDebt = props.hasLines && paidCents < totalCents;
  const hasCustomer =
    Boolean(props.customerId) ||
    Boolean(props.inlineCustomer?.name.trim() && props.inlineCustomer?.phone.trim());

  const isSaveDisabled =
    !props.hasLines ||
    props.isPending ||
    (props.hasPriceBelowMin && !props.canManagePrices) ||
    (isDebt && !hasCustomer);

  return { isDebt, isSaveDisabled };
}

/** Payment calculation, method selection and customer/debt binding card. */
export function SellPaymentSection(props: SellPaymentSectionProps) {
  const { t } = useTranslation();
  const { isDebt, isSaveDisabled } = useSellPaymentState(props);

  return (
    <Card className="border-hairline-silver/70 shadow-sm">
      <CardHeader className="pb-3">
        <CardTitle className="text-base">{t('sell.paymentTitle')}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {props.error && <FormError message={props.error} />}
        <SellTotalSummary total={props.total} />
        <PaymentMethodToggle method={props.paymentMethod} onChange={props.onPaymentMethodChange} />
        <PaymentAmountField amount={props.paymentAmount} total={props.total} onChange={props.onPaymentAmountChange} />
        {isDebt && (
          <div className="text-xs text-launch-orange font-medium bg-launch-orange/10 p-2.5 rounded-lg border border-launch-orange/20">
            {t('sell.debtNotice')}
          </div>
        )}
        <SellCustomerPicker
          isRequired={isDebt}
          selectedCustomerId={props.customerId}
          onSelectCustomer={props.onCustomerIdChange}
          inlineCustomer={props.inlineCustomer}
          onInlineCustomerChange={props.onInlineCustomerChange}
          dueDate={props.dueDate}
          onDueDateChange={props.onDueDateChange}
        />
      </CardContent>
      <CardFooter className="pt-2">
        <Button
          type="button"
          onClick={props.onSubmit}
          disabled={isSaveDisabled}
          className="w-full h-11 text-sm font-medium"
        >
          {props.isPending ? t('common.loading') : t('sell.submit')}
        </Button>
      </CardFooter>
    </Card>
  );
}
