import { useTranslation } from 'react-i18next';
import { ShoppingCart } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  Button,
} from '@/shared/ui';
import { formatMoney } from '@/shared/lib';
import type { PaymentMethod } from '@/entities/sale';

interface SellConfirmDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  total: string;
  paymentAmount: string;
  paymentMethod: PaymentMethod;
  isPending: boolean;
  onConfirm: () => void;
}

/** Final confirmation before committing a sale: shows total, paid, change/debt so the cashier can catch a wrong amount. */
export function SellConfirmDialog({
  open,
  onOpenChange,
  total,
  paymentAmount,
  paymentMethod,
  isPending,
  onConfirm,
}: SellConfirmDialogProps) {
  const { t } = useTranslation();

  const diff = (Number(paymentAmount) || 0) - (Number(total) || 0);
  const change = paymentMethod === 'CASH' ? Math.max(0, diff) : 0;
  const debt = Math.max(0, -diff);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md p-6 space-y-4">
        <DialogHeader className="items-center text-center space-y-2">
          <div className="h-12 w-12 rounded-full bg-studio-mist border border-hairline-silver/70 flex items-center justify-center mx-auto">
            <ShoppingCart className="h-6 w-6 text-pricing-blue" />
          </div>
          <DialogTitle className="text-lg font-bold tracking-tight text-ink">
            {t('sell.confirmTitle')}
          </DialogTitle>
          <DialogDescription className="text-xs text-slate max-w-xs mx-auto">
            {t('sell.confirmSubtitle')}
          </DialogDescription>
        </DialogHeader>

        <div className="rounded-2xl border border-hairline-silver/70 bg-studio-mist/40 p-4 space-y-2 text-left">
          <div className="flex justify-between items-center text-xs">
            <span className="text-slate">{t('sell.summaryTotal')}:</span>
            <span className="font-mono font-bold text-sm text-ink tabular-nums">{formatMoney(total)}</span>
          </div>
          <div className="flex justify-between items-center text-xs">
            <span className="text-slate">{t('receipt.paid')}:</span>
            <span className="font-mono font-semibold text-emerald-700 tabular-nums">{formatMoney(paymentAmount)}</span>
          </div>
          <div className="flex justify-between items-center text-xs">
            <span className="text-slate">{t('sell.paymentMethod')}:</span>
            <span className="font-medium text-ink">
              {paymentMethod === 'CASH' ? t('sales.methodCash') : t('sales.methodCard')}
            </span>
          </div>
          {change > 0.005 && (
            <div className="flex justify-between items-center text-xs pt-1 border-t border-hairline-silver/50 text-emerald-700">
              <span className="font-medium">{t('sell.change')}:</span>
              <span className="font-mono font-bold tabular-nums">{formatMoney(change)}</span>
            </div>
          )}
          {debt > 0.005 && (
            <div className="flex justify-between items-center text-xs pt-1 border-t border-hairline-silver/50 text-launch-orange">
              <span className="font-medium">{t('sell.remainingDebt')}:</span>
              <span className="font-mono font-bold tabular-nums">{formatMoney(debt)}</span>
            </div>
          )}
        </div>

        <div className="flex gap-2 pt-1">
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isPending}
            className="flex-1 h-11 rounded-full text-sm font-medium border-hairline-silver/80 bg-gallery-white hover:bg-studio-mist cursor-pointer"
          >
            {t('common.cancel')}
          </Button>
          <Button
            type="button"
            onClick={onConfirm}
            disabled={isPending}
            className="flex-1 h-11 rounded-full text-sm font-semibold bg-pricing-blue hover:bg-[#0077ed] text-gallery-white shadow-sm cursor-pointer"
          >
            {isPending ? t('common.loading') : t('sell.confirmComplete')}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
