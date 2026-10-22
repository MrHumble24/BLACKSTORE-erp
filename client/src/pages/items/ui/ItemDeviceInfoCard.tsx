import { useTranslation } from 'react-i18next';
import { Pencil } from 'lucide-react';
import { Button, Card, CardHeader, CardTitle, CardContent } from '@/shared/ui';
import { ItemStatusBadge, ItemConditionBadge, type Item } from '@/entities/item';

interface Props {
  item: Item;
  canEdit: boolean;
  onEdit: () => void;
}

function ItemAttributesGrid({ attributes }: { attributes: Record<string, unknown> }) {
  const { t } = useTranslation();
  if (Object.keys(attributes).length === 0) return null;

  return (
    <div className="pt-3 border-t border-hairline-silver/60">
      <div className="text-xs font-medium text-slate uppercase mb-2">
        {t('items.attributes')}
      </div>
      <div className="grid grid-cols-2 gap-2 text-xs">
        {Object.entries(attributes).map(([k, v]) => (
          <div key={k} className="bg-studio-mist/70 rounded-xl px-3 py-1.5">
            <span className="text-slate capitalize">{k}:</span>{' '}
            <span className="font-medium text-ink">{String(v)}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

/** Card showing product model, category, condition, status, and dynamic attributes. */
export function ItemDeviceInfoCard({ item, canEdit, onEdit }: Props) {
  const { t } = useTranslation();

  return (
    <Card className="rounded-[28px] border border-hairline-silver/70 bg-gallery-white p-6 shadow-none">
      <CardHeader className="p-0 pb-4 flex flex-row items-center justify-between">
        <CardTitle className="text-base font-semibold text-ink">{t('items.deviceInfo')}</CardTitle>
        {canEdit && (
          <Button
            variant="outline"
            size="sm"
            onClick={onEdit}
            className="h-7.5 px-3 rounded-full text-xs gap-1.5"
          >
            <Pencil className="h-3 w-3" />
            <span>{t('common.edit')}</span>
          </Button>
        )}
      </CardHeader>
      <CardContent className="p-0 space-y-3">
        <div className="grid grid-cols-2 gap-4 text-xs">
          <div>
            <span className="text-slate">{t('items.model')}:</span>
            <div className="font-medium text-ink mt-0.5">{item.productModel.name}</div>
          </div>
          <div>
            <span className="text-slate">{t('items.category')}:</span>
            <div className="font-medium text-ink mt-0.5">{item.productModel.category.name}</div>
          </div>
          <div>
            <span className="text-slate">{t('items.conditionLabel')}:</span>
            <div className="mt-0.5">
              <ItemConditionBadge condition={item.condition} />
            </div>
          </div>
          <div>
            <span className="text-slate">{t('items.statusLabel')}:</span>
            <div className="mt-0.5">
              <ItemStatusBadge status={item.status} />
            </div>
          </div>
        </div>

        <ItemAttributesGrid attributes={item.attributes} />
      </CardContent>
    </Card>
  );
}
