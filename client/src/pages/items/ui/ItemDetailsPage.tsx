import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { ArrowLeft } from 'lucide-react';
import { Button } from '@/shared/ui';
import { useAuthStore } from '@/entities/session';
import { useItem } from '@/entities/item';
import {
  ItemEditDialog,
  ItemPricesDialog,
  AddIdentifierDialog,
} from '@/features/manage-items';
import { ItemDeviceInfoCard } from './ItemDeviceInfoCard';
import { ItemIdentifiersCard } from './ItemIdentifiersCard';
import { ItemOwnershipCard } from './ItemOwnershipCard';
import { ItemPricingCard } from './ItemPricingCard';
import { ItemTransfersCard } from './ItemTransfersCard';
import { ItemWalkInCard } from './ItemWalkInCard';

function useItemPermissions(status?: string) {
  const hasPermission = useAuthStore((state) => state.hasPermission);
  const canReceiveBatch = hasPermission('receive_batch');
  const canEditPastRecords = hasPermission('edit_past_records');
  const canManagePrices = hasPermission('manage_prices');
  const canViewCost = hasPermission('view_cost');

  const isPastStatus = ['DEBT', 'SOLD', 'RETURNED', 'DEFECTIVE'].includes(status ?? '');
  const canEdit = canReceiveBatch && (!isPastStatus || canEditPastRecords);

  return { canEdit, canReceiveBatch, canManagePrices, canViewCost };
}

function ItemNotFoundState({ onBack }: { onBack: () => void }) {
  const { t } = useTranslation();
  return (
    <div className="p-8 space-y-4">
      <div className="text-sm font-medium text-slate">{t('items.noItems')}</div>
      <Button
        variant="outline"
        size="sm"
        onClick={onBack}
        className="rounded-full text-xs gap-1.5"
      >
        <ArrowLeft className="h-3.5 w-3.5" />
        <span>{t('common.back')}</span>
      </Button>
    </div>
  );
}

function ItemDetailsHeader({ name, id, onBack }: { name: string; id: number; onBack: () => void }) {
  return (
    <div className="flex items-center gap-3">
      <Button variant="outline" size="icon" onClick={onBack} className="h-8 w-8 rounded-full">
        <ArrowLeft className="h-4 w-4" />
      </Button>
      <div>
        <h1 className="text-xl md:text-2xl font-semibold tracking-tight text-ink">{name}</h1>
        <p className="text-xs text-slate">#{id}</p>
      </div>
    </div>
  );
}

interface DialogsProps {
  item: Parameters<typeof ItemDeviceInfoCard>[0]['item'];
  editOpen: boolean;
  onEditChange: (open: boolean) => void;
  pricesOpen: boolean;
  onPricesChange: (open: boolean) => void;
  identifierOpen: boolean;
  onIdentifierChange: (open: boolean) => void;
}

function ItemDetailsDialogs({
  item,
  editOpen,
  onEditChange,
  pricesOpen,
  onPricesChange,
  identifierOpen,
  onIdentifierChange,
}: DialogsProps) {
  return (
    <>
      <ItemEditDialog open={editOpen} onOpenChange={onEditChange} item={item} />
      <ItemPricesDialog open={pricesOpen} onOpenChange={onPricesChange} item={item} />
      <AddIdentifierDialog open={identifierOpen} onOpenChange={onIdentifierChange} itemId={item.id} />
    </>
  );
}

/** Device item details view displaying attributes, identifiers, ownership, and pricing. */
export function ItemDetailsPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { t } = useTranslation();

  const itemId = Number(id);
  const isValid = !Number.isNaN(itemId) && itemId > 0;
  const { data: item, isLoading, isError } = useItem(isValid ? itemId : 0);
  const { canEdit, canReceiveBatch, canManagePrices, canViewCost } = useItemPermissions(item?.status);

  const [editOpen, setEditOpen] = useState(false);
  const [pricesOpen, setPricesOpen] = useState(false);
  const [identifierOpen, setIdentifierOpen] = useState(false);

  if (isLoading && isValid) {
    return <div className="p-8 text-xs text-slate">{t('common.loading')}</div>;
  }
  if (!isValid || isError || !item) {
    return <ItemNotFoundState onBack={() => navigate('/items')} />;
  }

  return (
    <div className="space-y-6">
      <ItemDetailsHeader name={item.productModel.name} id={item.id} onBack={() => navigate('/items')} />
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <ItemDeviceInfoCard item={item} canEdit={canEdit} onEdit={() => setEditOpen(true)} />
        <div className="space-y-6">
          <ItemIdentifiersCard item={item} canAddIdentifier={canEdit} canPrintLabel={canReceiveBatch} onAddIdentifier={() => setIdentifierOpen(true)} />
          <ItemOwnershipCard item={item} />
          <ItemPricingCard item={item} canViewCost={canViewCost} canManagePrices={canManagePrices} onEditPrices={() => setPricesOpen(true)} />
          {item.walkIn && <ItemWalkInCard walkIn={item.walkIn} />}
          <ItemTransfersCard itemId={item.id} />
        </div>
      </div>
      <ItemDetailsDialogs
        item={item}
        editOpen={editOpen}
        onEditChange={setEditOpen}
        pricesOpen={pricesOpen}
        onPricesChange={setPricesOpen}
        identifierOpen={identifierOpen}
        onIdentifierChange={setIdentifierOpen}
      />
    </div>
  );
}
