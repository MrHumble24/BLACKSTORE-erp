import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuthStore } from '@/entities/session';
import type { PaymentMethod } from '@/entities/sale';
import { useSellCart } from '../lib/useSellCart';
import { useSellSubmit } from '../lib/useSellSubmit';
import { SellCartPanel } from './SellCartPanel';
import { SellPaymentSection } from './SellPaymentSection';
import type { InlineCustomer } from './SellCustomerPicker';

function SellScreenHeader() {
  const { t } = useTranslation();
  return (
    <div>
      <h1 className="text-xl font-bold tracking-tight text-ink">{t('sell.title')}</h1>
      <p className="text-xs text-slate mt-0.5">{t('sell.subtitle')}</p>
    </div>
  );
}

interface SellScreenStateProps {
  lines: ReturnType<typeof useSellCart>['lines'];
  total: string;
  totalCents: number;
}

function useSellScreenState({ lines, total, totalCents }: SellScreenStateProps) {
  const [locationId, setLocationId] = useState<number | null>(null);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('CASH');
  const [customAmount, setCustomAmount] = useState<string | null>(null);
  const [customerId, setCustomerId] = useState<number | null>(null);
  const [inlineCustomer, setInlineCustomer] = useState<InlineCustomer | null>(null);
  const [dueDate, setDueDate] = useState<string>('');

  const paymentAmount = customAmount !== null ? customAmount : totalCents > 0 ? total : '0';

  const handleCustomerCreated = (id: number) => {
    setCustomerId(id);
    setInlineCustomer(null);
  };

  const submit = useSellSubmit({
    locationId,
    lines,
    paymentAmount,
    paymentMethod,
    customerId,
    inlineCustomer,
    dueDate,
    onCustomerCreated: handleCustomerCreated,
  });

  return {
    locationId,
    setLocationId,
    paymentMethod,
    setPaymentMethod,
    paymentAmount,
    setCustomAmount,
    customerId,
    setCustomerId,
    inlineCustomer,
    setInlineCustomer,
    dueDate,
    setDueDate,
    ...submit,
  };
}

/** Main POS Sell screen orchestrating barcode scan, accessory picks, and sale submission. */
export function SellScreen() {
  const hasPermission = useAuthStore((s) => s.hasPermission);
  const cart = useSellCart();
  const form = useSellScreenState({ lines: cart.lines, total: cart.total, totalCents: cart.totalCents });

  return (
    <div className="space-y-6">
      <SellScreenHeader />
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
        <SellCartPanel locationId={form.locationId} onLocationChange={form.setLocationId} cart={cart} />
        <div className="lg:col-span-1">
          <SellPaymentSection
            total={cart.total}
            paymentMethod={form.paymentMethod}
            onPaymentMethodChange={form.setPaymentMethod}
            paymentAmount={form.paymentAmount}
            onPaymentAmountChange={form.setCustomAmount}
            customerId={form.customerId}
            onCustomerIdChange={form.setCustomerId}
            inlineCustomer={form.inlineCustomer}
            onInlineCustomerChange={form.setInlineCustomer}
            dueDate={form.dueDate}
            onDueDateChange={form.setDueDate}
            canManagePrices={hasPermission('manage_prices')}
            hasPriceBelowMin={cart.hasPriceBelowMin}
            hasLines={cart.lines.length > 0}
            isPending={form.isPending}
            onSubmit={form.handleSave}
            error={form.error}
          />
        </div>
      </div>
    </div>
  );
}
