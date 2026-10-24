import { useTranslation } from 'react-i18next';
import { CheckCircle2, Printer, Plus, ArrowRight } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  Button,
} from '@/shared/ui';
import { formatMoney } from '@/shared/lib';
import type { Sale } from '@/entities/sale';

interface SaleCompletedDialogProps {
  sale: Sale | null;
  onNewSale: () => void;
  onViewDetails: () => void;
}

/** Modal displayed immediately upon successful sale creation to offer one-click print or new sale. */
export function SaleCompletedDialog({
  sale,
  onNewSale,
  onViewDetails,
}: SaleCompletedDialogProps) {
  const { t } = useTranslation();

  if (!sale) return null;

  const hasDebt = Number(sale.balance) > 0;

  const handlePrint = () => {
    window.open(`/sales/${sale.id}/receipt`, '_blank');
  };

  return (
    <Dialog open={Boolean(sale)} onOpenChange={(open) => { if (!open) onNewSale(); }}>
      <DialogContent className="sm:max-w-md p-6 text-center space-y-4">
        <DialogHeader className="items-center text-center space-y-2">
          <div className="h-14 w-14 rounded-full bg-emerald-50 border border-emerald-100 flex items-center justify-center mx-auto">
            <CheckCircle2 className="h-8 w-8 text-emerald-600" />
          </div>
          <DialogTitle className="text-xl font-bold tracking-tight text-ink">
            {t('sell.saleSuccessTitle')}
          </DialogTitle>
          <DialogDescription className="text-xs text-slate max-w-xs mx-auto">
            {t('sell.saleSuccessSubtitle')}
          </DialogDescription>
        </DialogHeader>

        <div className="rounded-2xl border border-hairline-silver/70 bg-studio-mist/40 p-4 space-y-2 text-left">
          <div className="flex justify-between items-center text-xs">
            <span className="text-slate">{t('receipt.saleNumber')}:</span>
            <span className="font-mono font-bold text-ink">#{sale.id}</span>
          </div>
          <div className="flex justify-between items-center text-xs">
            <span className="text-slate">{t('sell.summaryTotal')}:</span>
            <span className="font-mono font-bold text-sm text-ink">{formatMoney(sale.total)}</span>
          </div>
          <div className="flex justify-between items-center text-xs">
            <span className="text-slate">{t('receipt.paid')}:</span>
            <span className="font-mono font-semibold text-emerald-700">{formatMoney(sale.paid)}</span>
          </div>
          {hasDebt && (
            <div className="flex justify-between items-center text-xs pt-1 border-t border-hairline-silver/50 text-launch-orange">
              <span className="font-medium">{t('sell.remainingDebt')}:</span>
              <span className="font-mono font-bold">{formatMoney(sale.balance)}</span>
            </div>
          )}
          {sale.customer && (
            <div className="flex justify-between items-center text-[11px] text-slate pt-1">
              <span>{t('sell.customer')}:</span>
              <span className="font-medium text-ink">{sale.customer.name}</span>
            </div>
          )}
        </div>

        <div className="flex flex-col gap-2 pt-2">
          <Button
            type="button"
            onClick={handlePrint}
            className="w-full h-11 rounded-full gap-2 text-sm font-semibold bg-pricing-blue hover:bg-pricing-blue/90 text-white cursor-pointer shadow-sm"
          >
            <Printer className="h-4 w-4" />
            <span>{t('sell.printReceipt')}</span>
          </Button>

          <Button
            type="button"
            variant="outline"
            onClick={onNewSale}
            className="w-full h-10 rounded-full gap-2 text-xs font-medium border-hairline-silver/80 bg-gallery-white hover:bg-studio-mist cursor-pointer"
          >
            <Plus className="h-4 w-4" />
            <span>{t('sell.newSale')}</span>
          </Button>

          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={onViewDetails}
            className="text-xs text-slate hover:text-ink gap-1.5 cursor-pointer mt-1"
          >
            <span>{t('sell.viewDetails')}</span>
            <ArrowRight className="h-3.5 w-3.5" />
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
