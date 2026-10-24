import { useTranslation } from 'react-i18next';
import { formatMoney, formatDate } from '@/shared/lib';
// Type-only import: erased at build, no runtime coupling between entities.
import type { Sale } from '@/entities/sale';
import type { ReceiptSettings } from '../model/types';

/** A text line shown only when visible and non-empty. */
function Line({ show, text, className }: { show: boolean; text: string; className?: string }) {
  if (!show || !text.trim()) return null;
  return <p className={className ?? 'text-[11px] text-slate'}>{text}</p>;
}

function Header({ sale, s }: { sale: Sale; s: ReceiptSettings }) {
  const { t } = useTranslation();
  return (
    <>
      <div className="text-center pb-4 border-b border-dashed border-hairline-silver/90 space-y-1">
        {s.showLogo && s.logo && (
          <img
            src={s.logo}
            alt=""
            className="mx-auto mb-2 max-h-16 w-auto object-contain"
          />
        )}
        <h1 className="text-base font-bold font-sans tracking-tight">
          {s.shopName || 'BLACKSTORE'}
        </h1>
        <Line show={s.showHeaderNote} text={s.headerNote} className="text-[11px] text-slate italic" />
        <Line show={s.showTaxId} text={s.taxId} />
        <Line show={s.showAddress} text={s.address} />
        <Line show={s.showPhone} text={s.phone} />
        <Line show={s.showSecondContact} text={s.secondContact} />
        <Line show={s.showWebsite} text={s.website} />
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
        {s.showCustomer && sale.customer && (
          <div className="flex justify-between">
            <span className="text-slate">{t('receipt.customer')}:</span>
            <span>{sale.customer.name} ({sale.customer.phone})</span>
          </div>
        )}
      </div>
    </>
  );
}

function Items({ sale, showWarranty }: { sale: Sale; showWarranty: boolean }) {
  const { t } = useTranslation();
  return (
    <div className="py-3 border-b border-dashed border-hairline-silver/90 space-y-2">
      {sale.items.map((item) => (
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
            {showWarranty && item.warrantyUntil && (
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

function Totals({ sale, s }: { sale: Sale; s: ReceiptSettings }) {
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
      <Line
        show={s.showFooter}
        text={s.footer}
        className="pt-4 text-center text-[11px] text-slate whitespace-pre-line"
      />
    </>
  );
}

/** The printable receipt body, driven entirely by settings. Shared by the print page and the settings preview. */
export function ReceiptDocument({ sale, settings }: { sale: Sale; settings: ReceiptSettings }) {
  return (
    <div className="bg-white text-black text-xs font-mono">
      <Header sale={sale} s={settings} />
      <Items sale={sale} showWarranty={settings.showWarranty} />
      <Totals sale={sale} s={settings} />
    </div>
  );
}
