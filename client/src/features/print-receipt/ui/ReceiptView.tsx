import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Printer, ArrowLeft } from 'lucide-react';
import { Button } from '@/shared/ui';
import type { Sale } from '@/entities/sale';
import {
  ReceiptDocument,
  DEFAULT_RECEIPT_SETTINGS,
  type ReceiptSettings,
} from '@/entities/receipt-settings';

interface ReceiptViewProps {
  sale: Sale;
  settings?: ReceiptSettings;
  onBack?: () => void;
}

/** Printable receipt page with 80mm/58mm thermal width selector and auto-print. */
export function ReceiptView({ sale, settings, onBack }: ReceiptViewProps) {
  const { t } = useTranslation();
  const [paperWidth, setPaperWidth] = useState<'80mm' | '58mm'>('80mm');

  useEffect(() => {
    const timer = setTimeout(() => {
      window.print();
    }, 400);
    return () => clearTimeout(timer);
  }, []);

  return (
    <div className="min-h-screen bg-control-gray/30 p-3 sm:p-6 flex flex-col items-center print:bg-white print:p-0">
      <div className="w-full max-w-[80mm] flex flex-wrap justify-between items-center gap-2 mb-4 print:hidden">
        {onBack ? (
          <Button variant="ghost" size="sm" onClick={onBack} className="gap-1.5 text-xs h-8 cursor-pointer">
            <ArrowLeft className="h-4 w-4" />
            {t('receipt.back')}
          </Button>
        ) : (
          <div />
        )}

        <div className="flex items-center gap-2">
          <div className="flex rounded-full bg-gallery-white border border-hairline-silver/80 p-0.5 text-xs">
            <button
              type="button"
              onClick={() => setPaperWidth('80mm')}
              className={`px-2.5 py-1 rounded-full text-[11px] font-medium transition-colors cursor-pointer ${
                paperWidth === '80mm' ? 'bg-ink text-white' : 'text-slate hover:text-ink'
              }`}
            >
              80mm
            </button>
            <button
              type="button"
              onClick={() => setPaperWidth('58mm')}
              className={`px-2.5 py-1 rounded-full text-[11px] font-medium transition-colors cursor-pointer ${
                paperWidth === '58mm' ? 'bg-ink text-white' : 'text-slate hover:text-ink'
              }`}
            >
              58mm
            </button>
          </div>

          <Button
            size="sm"
            onClick={() => window.print()}
            className="gap-1.5 text-xs h-8 bg-pricing-blue hover:bg-pricing-blue/90 text-white cursor-pointer"
          >
            <Printer className="h-4 w-4" />
            {t('receipt.print')}
          </Button>
        </div>
      </div>

      <div
        className={`bg-white border border-hairline-silver/80 rounded-2xl p-5 shadow-sm print:shadow-none print:border-none print:p-1 thermal-receipt transition-all ${
          paperWidth === '58mm' ? 'w-[58mm] max-w-[58mm]' : 'w-[80mm] max-w-[80mm]'
        }`}
      >
        <ReceiptDocument sale={sale} settings={settings ?? DEFAULT_RECEIPT_SETTINGS} />
      </div>
    </div>
  );
}
