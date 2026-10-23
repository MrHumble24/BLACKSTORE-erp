import { useEffect } from 'react';
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

/** Printable receipt page: print controls plus the shared receipt body. */
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

      <div className="w-full max-w-md bg-white border border-hairline-silver/80 rounded-2xl p-6 shadow-sm print:shadow-none print:border-none print:p-2">
        <ReceiptDocument sale={sale} settings={settings ?? DEFAULT_RECEIPT_SETTINGS} />
      </div>
    </div>
  );
}
