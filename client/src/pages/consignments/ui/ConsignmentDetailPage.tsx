import { useState } from 'react';
import { useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { BackLink } from '@/shared/ui';
import { useConsignment, type ConsignmentItem } from '@/entities/consignment';
import { MinPriceDialog, SellItemDialog } from '@/features/consign';
import { ConsignmentHeaderCard } from './ConsignmentHeaderCard';
import { ConsignmentItemsTable } from './ConsignmentItemsTable';
import { ConsignmentDueDateDialog } from './ConsignmentDueDateDialog';

interface ConsignmentItemDialogsProps {
  consignmentId: number;
  minPriceItem: ConsignmentItem | null;
  sellItem: ConsignmentItem | null;
  onClose: () => void;
}

/** Min-price and sell dialogs for the selected consignment line; `itemId` is the line id. */
function ConsignmentItemDialogs({ consignmentId, minPriceItem, sellItem, onClose }: ConsignmentItemDialogsProps) {
  const onOpenChange = (open: boolean) => !open && onClose();
  return (
    <>
      {minPriceItem && (
        <MinPriceDialog
          open
          onOpenChange={onOpenChange}
          consignmentId={consignmentId}
          itemId={minPriceItem.id}
          currentMinPrice={minPriceItem.minPrice}
        />
      )}
      {sellItem && (
        <SellItemDialog
          open
          onOpenChange={onOpenChange}
          consignmentId={consignmentId}
          itemId={sellItem.id}
          minPrice={sellItem.minPrice}
        />
      )}
    </>
  );
}

/** Consignment details page with summary header and items table. */
export function ConsignmentDetailPage() {
  const { t } = useTranslation();
  const { id } = useParams<{ id: string }>();
  const consignmentId = Number(id);

  const [dueDateOpen, setDueDateOpen] = useState(false);
  const [minPriceItem, setMinPriceItem] = useState<ConsignmentItem | null>(null);
  const [sellItem, setSellItem] = useState<ConsignmentItem | null>(null);

  const { data: consignment, isLoading } = useConsignment(consignmentId);

  if (isLoading || !consignment) {
    return (
      <div className="p-12 text-center text-xs text-slate">
        {t(isLoading ? 'common.loading' : 'consign.notFound')}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <BackLink
        to={`/partners/${consignment.partner.id}`}
        label={t('consign.backToPartner', { name: consignment.partner.name })}
      />
      <div className="border-b border-hairline-silver/70 pb-3">
        <h1 className="text-xl font-bold tracking-tight text-ink">
          {t('consign.consignmentTitle', { id: consignment.id })}
        </h1>
      </div>
      <ConsignmentHeaderCard consignment={consignment} onEditDueDate={() => setDueDateOpen(true)} />
      <ConsignmentItemsTable
        consignmentId={consignment.id}
        items={consignment.items}
        onEditMinPrice={setMinPriceItem}
        onSellItem={setSellItem}
      />
      <ConsignmentDueDateDialog
        open={dueDateOpen}
        onOpenChange={setDueDateOpen}
        consignmentId={consignment.id}
        currentDueDate={consignment.dueDate}
      />
      <ConsignmentItemDialogs
        consignmentId={consignment.id}
        minPriceItem={minPriceItem}
        sellItem={sellItem}
        onClose={() => {
          setMinPriceItem(null);
          setSellItem(null);
        }}
      />
    </div>
  );
}
