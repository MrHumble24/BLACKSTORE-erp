import { useTranslation } from 'react-i18next';
import { Plus } from 'lucide-react';
import { Button, Card, CardHeader, CardTitle, CardContent } from '@/shared/ui';
import type { Item } from '@/entities/item';
import { LabelPrintButton } from '@/features/print-label';

interface Props {
  item: Item;
  canAddIdentifier: boolean;
  /** receive_batch only: labels print via the system-code flow (FR-15). */
  canPrintLabel: boolean;
  onAddIdentifier: () => void;
}

/** Card showing registered identifiers (IMEI, Serial, etc.) for a device item. */
export function ItemIdentifiersCard({ item, canAddIdentifier, canPrintLabel, onAddIdentifier }: Props) {
  const { t } = useTranslation();

  return (
    <Card className="rounded-[28px] border border-hairline-silver/70 bg-gallery-white p-6 shadow-none">
      <CardHeader className="p-0 pb-4 flex flex-row items-center justify-between">
        <CardTitle className="text-base font-semibold text-ink">{t('items.identifiers')}</CardTitle>
        <div className="flex items-center gap-2">
          {canPrintLabel && <LabelPrintButton item={item} />}
          {canAddIdentifier && (
            <Button
              variant="outline"
              size="sm"
              onClick={onAddIdentifier}
              className="h-7.5 px-3 rounded-full text-xs gap-1.5"
            >
              <Plus className="h-3 w-3" />
              <span>{t('items.addIdentifier')}</span>
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent className="p-0 space-y-2">
        {item.identifiers.map((id) => (
          <div
            key={id.id}
            className="flex items-center justify-between bg-studio-mist/60 rounded-xl px-3.5 py-2 text-xs font-mono"
          >
            <span className="text-slate font-medium">{id.type}</span>
            <span className="text-ink font-semibold">{id.value}</span>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
