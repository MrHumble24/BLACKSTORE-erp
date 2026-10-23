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
  paymentMethod: PaymentMethod;
  onChange: (amount: string) => void;
}

function PaymentAmountField({ amount, total, paymentMethod, onChange }: PaymentAmountFieldProps) {
  const { t } = useTranslation();
  const paidNum = Number(amount) || 0;
  const totalNum = Number(total) || 0;
  const diff = paidNum - totalNum;
  const isOverpaying = paymentMethod === 'CASH' && diff > 0.005;
  const isUnderpaying = diff < -0.005 && totalNum > 0;

  return (
    <div className="space-y-1.5">
      <div className="flex justify-between items-center">
        <Label htmlFor="payment-amount" className="text-xs font-medium text-slate">
          {t('sell.paymentAmount')}
        </Label>
        <Button
          type="button"
          variant="link"
          size="sm"
          onClick={() => onChange(total)}
          className="h-5 p-0 text-[11px] text-apple-blue hover:text-apple-blue font-medium cursor-pointer"
        >
          {t('sell.fullPayment')}
        </Button>
      </div>
      <Input
        id="payment-amount"
        type="number"
        step="any"
        min="0"
        value={amount}
        onChange={(e) => onChange(e.target.value)}
        className="h-10 text-sm font-mono tracking-tight rounded-xl bg-gallery-white border-hairline-silver/80"
      />

      {isOverpaying && (
        <div className="flex items-center justify-between p-2.5 rounded-xl bg-emerald-50 border border-emerald-200/80 text-emerald-800 text-xs">
          <span className="font-medium">{t('sell.change')}:</span>
          <span className="font-mono font-bold text-sm tabular-nums">{formatMoney(diff)}</span>
        </div>
      )}

      {isUnderpaying && (
        <div className="flex items-center justify-between p-2.5 rounded-xl bg-amber-50 border border-amber-200/80 text-amber-800 text-xs">
          <span className="font-medium">{t('sell.remainingDebt')}:</span>
          <span className="font-mono font-bold text-sm tabular-nums">{formatMoney(Math.abs(diff))}</span>
        </div>
      )}
    </div>
  );
}

function SellTotalSummary({ total }: { total: string }) {
  const { t } = useTranslation();
  return (
    <div className="rounded-2xl bg-ink text-gallery-white p-4 flex justify-between items-center shadow-none">
      <span className="text-xs uppercase tracking-wider text-slate font-medium">{t('sell.summaryTotal')}</span>
      <span className="text-2xl font-bold font-mono tracking-tight text-gallery-white tabular-nums">
        {formatMoney(total)}
      </span>
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
    <Card className="border-hairline-silver/70 rounded-2xl shadow-none bg-gallery-white overflow-hidden">
      <CardHeader className="pb-3 border-b border-hairline-silver/50">
        <CardTitle className="text-base font-semibold text-ink">{t('sell.paymentTitle')}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4 pt-4">
        {props.error && <FormError message={props.error} />}
        <SellTotalSummary total={props.total} />
        <PaymentMethodToggle method={props.paymentMethod} onChange={props.onPaymentMethodChange} />
        <PaymentAmountField
          amount={props.paymentAmount}
          total={props.total}
          paymentMethod={props.paymentMethod}
          onChange={props.onPaymentAmountChange}
        />
        {isDebt && (
          <div className="text-xs text-amber-800 font-medium bg-amber-50 p-2.5 rounded-xl border border-amber-200/80">
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
      <CardFooter className="pt-2 pb-4">
        <Button
          type="button"
          onClick={props.onSubmit}
          disabled={isSaveDisabled}
          className="w-full h-11 text-sm font-semibold rounded-full bg-pricing-blue hover:bg-[#0077ed] text-gallery-white shadow-none cursor-pointer"
        >
          {props.isPending ? t('common.loading') : t('sell.submit')}
        </Button>
      </CardFooter>
    </Card>
  );
}
