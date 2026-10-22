import { useTranslation } from 'react-i18next';
import { Card, CardHeader, CardTitle, CardContent } from '@/shared/ui';
import type { Item } from '@/entities/item';

interface Props {
  item: Item;
}

/** Ownership card showing investor and current location. */
export function ItemOwnershipCard({ item }: Props) {
  const { t } = useTranslation();

  return (
    <Card className="rounded-[28px] border border-hairline-silver/70 bg-gallery-white p-6 shadow-none">
      <CardHeader className="p-0 pb-4">
        <CardTitle className="text-base font-semibold text-ink">{t('items.ownership')}</CardTitle>
      </CardHeader>
      <CardContent className="p-0 grid grid-cols-2 gap-4 text-xs">
        <div>
          <span className="text-slate">{t('items.owner')}:</span>
          <div className="font-medium text-ink mt-0.5">
            {item.investor.name} ({item.investor.code})
          </div>
        </div>
        <div>
          <span className="text-slate">{t('items.location')}:</span>
          <div className="font-medium text-ink mt-0.5">
            {item.location.name} ({t(`locations.type.${item.location.type}`)})
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
