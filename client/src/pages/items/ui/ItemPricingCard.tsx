import { useTranslation } from 'react-i18next';
import { DollarSign } from 'lucide-react';
import { Button, Card, CardHeader, CardTitle, CardContent } from '@/shared/ui';
import type { Item } from '@/entities/item';
import { formatMoney } from '@/shared/lib';

interface Props {
  item: Item;
  canViewCost: boolean;
  canManagePrices: boolean;
  onEditPrices: () => void;
}

/** Card showing sale prices and optional cost if authorized. */
export function ItemPricingCard({
  item,
  canViewCost,
  canManagePrices,
  onEditPrices,
}: Props) {
  const { t } = useTranslation();

  return (
    <Card className="rounded-[28px] border border-hairline-silver/70 bg-gallery-white p-6 shadow-none">
      <CardHeader className="p-0 pb-4 flex flex-row items-center justify-between">
        <CardTitle className="text-base font-semibold text-ink">{t('items.pricing')}</CardTitle>
        {canManagePrices && (
          <Button
            variant="outline"
            size="sm"
            onClick={onEditPrices}
            className="h-7.5 px-3 rounded-full text-xs gap-1.5"
          >
            <DollarSign className="h-3 w-3" />
            <span>{t('items.editPrices')}</span>
          </Button>
        )}
      </CardHeader>
      <CardContent className="p-0 grid grid-cols-2 gap-4 text-xs font-mono">
        <div>
          <span className="text-slate">{t('items.salePrice')}:</span>
          <div className="font-semibold text-ink text-sm mt-0.5">{formatMoney(item.salePrice)}</div>
        </div>
        <div>
          <span className="text-slate">{t('items.minSalePrice')}:</span>
          <div className="font-semibold text-slate text-sm mt-0.5">{formatMoney(item.minSalePrice)}</div>
        </div>
        {canViewCost && (
          <>
            <div>
              <span className="text-slate">{t('items.purchasePrice')}:</span>
              <div className="font-semibold text-ink text-sm mt-0.5">
                {formatMoney(item.purchasePrice)}
              </div>
            </div>
            <div>
              <span className="text-slate">{t('items.totalCost')}:</span>
              <div className="font-semibold text-ink text-sm mt-0.5">{formatMoney(item.cost)}</div>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
