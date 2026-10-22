import { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Printer, ArrowLeft } from 'lucide-react';
import { Button } from '@/shared/ui';
import { formatMoney, formatDate } from '@/shared/lib';
import type { Sale } from '@/entities/sale';
import type { ReceiptSettings } from '@/entities/receipt-settings';

interface ReceiptHeaderProps {
  sale: Sale;
  settings?: ReceiptSettings;
}

function ReceiptHeader({ sale, settings }: ReceiptHeaderProps) {
  const { t } = useTranslation();
  return (
    <>
      <div className="text-center pb-4 border-b border-dashed border-hairline-silver/90 space-y-1">
        <h1 className="text-base font-bold font-sans tracking-tight">
          {settings?.shopName || 'BLACKSTORE'}
        </h1>
        {settings?.address && <p className="text-[11px] text-slate">{settings.address}</p>}
        {settings?.phone && <p className="text-[11px] text-slate">{settings.phone}</p>}
      </div>
      <div className="py-3 border-b border-dashed border-hairline-silver/90 space-y-1">
        <div className="flex justify-between">
          <span className="text-slate">{t('receipt.saleNumber')}:</span>
          <span className="font-bold">#{sale.id}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-slate">{t('receipt.date')}:</span>
          <span>{formatDate(sale.createdAt, true)}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-slate">{t('receipt.seller')}:</span>
          <span>{sale.seller.name}</span>
        </div>
        {sale.customer && (
          <div className="flex justify-between">
            <span className="text-slate">{t('receipt.customer')}:</span>
            <span>{sale.customer.name} ({sale.customer.phone})</span>
          </div>
        )}
      </div>
    </>
  );
}

interface ReceiptItemListProps {
  items: Sale['items'];
}

function ReceiptItemList({ items }: ReceiptItemListProps) {
  const { t } = useTranslation();
  return (
    <div className="py-3 border-b border-dashed border-hairline-silver/90 space-y-2">
      {items.map((item) => (
        <div key={item.id} className="space-y-0.5">
          <div className="flex justify-between font-medium">
            <span>{item.productModel.name}</span>
            <span>{formatMoney(Number(item.unitPrice) * item.quantity)}</span>
          </div>
          <div className="flex justify-between text-[11px] text-slate">
            <span>
              {item.quantity} x {formatMoney(item.unitPrice)}
              {item.item?.identifiers[0] && ` (${item.item.identifiers[0].value})`}
            </span>
            {item.warrantyUntil && (
              <span>
                {t('receipt.warranty')}: {formatDate(item.warrantyUntil)}
              </span>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}

interface ReceiptTotalsProps {
  sale: Sale;
  footer?: string;
}

function ReceiptTotals({ sale, footer }: ReceiptTotalsProps) {
  const { t } = useTranslation();
  return (
    <>
      <div className="py-3 border-b border-dashed border-hairline-silver/90 space-y-1">
        <div className="flex justify-between text-sm font-bold">
          <span>{t('receipt.total')}:</span>
          <span>{formatMoney(sale.total)}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-slate">{t('receipt.paid')}:</span>
          <span>{formatMoney(sale.paid)}</span>
        </div>
        {Number(sale.balance) > 0 && (
          <div className="flex justify-between font-semibold text-launch-orange">
            <span>{t('receipt.balance')}:</span>
            <span>{formatMoney(sale.balance)}</span>
          </div>
        )}
      </div>
      {footer && (
        <div className="pt-4 text-center text-[11px] text-slate whitespace-pre-line">
          {footer}
        </div>
      )}
    </>
  );
}

interface ReceiptViewProps {
  sale: Sale;
  settings?: ReceiptSettings;
  onBack?: () => void;
}

/** Printable receipt voucher formatted for standard thermal or paper printing. */
export function ReceiptView({ sale, settings, onBack }: ReceiptViewProps) {
  const { t } = useTranslation();

  useEffect(() => {
    const timer = setTimeout(() => {
      window.print();
    }, 400);
    return () => clearTimeout(timer);
  }, []);

  return (
    <div className="min-h-screen bg-control-gray/30 p-4 sm:p-8 flex flex-col items-center print:bg-white print:p-0">
      <div className="w-full max-w-md flex justify-between items-center mb-4 print:hidden">
        {onBack ? (
          <Button variant="ghost" size="sm" onClick={onBack} className="gap-1.5 text-xs">
            <ArrowLeft className="h-4 w-4" />
            {t('receipt.back')}
          </Button>
        ) : <div />}
        <Button size="sm" onClick={() => window.print()} className="gap-1.5 text-xs">
          <Printer className="h-4 w-4" />
          {t('receipt.print')}
        </Button>
      </div>

      <div className="w-full max-w-md bg-white border border-hairline-silver/80 rounded-2xl p-6 shadow-sm print:shadow-none print:border-none print:p-2 text-ink text-xs font-mono">
        <ReceiptHeader sale={sale} settings={settings} />
        <ReceiptItemList items={sale.items} />
        <ReceiptTotals sale={sale} footer={settings?.footer} />
      </div>
    </div>
  );
}
