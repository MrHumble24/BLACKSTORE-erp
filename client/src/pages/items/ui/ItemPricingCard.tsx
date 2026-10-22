import { useTranslation } from 'react-i18next';
import { DollarSign } from 'lucide-react';
import { Button, Card, CardHeader, CardTitle, CardContent } from '@/shared/ui';
import type { Item } from '@/entities/item';
import { formatMoney } from '@/shared/lib';

interface PriceStatProps {
  label: string;
  value: string | null | undefined;
  muted?: boolean;
}

/** One labelled money stat inside the pricing card. */
function PriceStat({ label, value, muted }: PriceStatProps) {
  return (
    <div>
      <span className="text-slate">{label}:</span>
      <div className={`font-semibold text-sm mt-0.5 ${muted ? 'text-slate' : 'text-ink'}`}>
        {formatMoney(value)}
      </div>
    </div>
  );
}

/** Grid of sale prices plus (authorized only) purchase price and total cost. */
function PriceStats({ item, canViewCost }: { item: Item; canViewCost: boolean }) {
  const { t } = useTranslation();

  return (
    <CardContent className="p-0 grid grid-cols-2 gap-4 text-xs font-mono">
      <PriceStat label={t('items.salePrice')} value={item.salePrice} />
      <PriceStat label={t('items.minSalePrice')} value={item.minSalePrice} muted />
      {canViewCost && (
        <>
          <PriceStat label={t('items.purchasePrice')} value={item.purchasePrice} />
          <PriceStat label={t('items.totalCost')} value={item.cost} />
        </>
      )}
    </CardContent>
  );
}

interface Props {
  item: Item;
  canViewCost: boolean;
  canManagePrices: boolean;
  onEditPrices: () => void;
}

/** Card showing sale prices and optional cost if authorized. */
export function ItemPricingCard({ item, canViewCost, canManagePrices, onEditPrices }: Props) {
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
      <PriceStats item={item} canViewCost={canViewCost} />
    </Card>
  );
}
