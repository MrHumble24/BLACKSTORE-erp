import { useState, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFormFooter,
  FormError,
  SelectField,
} from '@/shared/ui';
import { useCategories } from '@/entities/category';
import { useUpdateItem, type Item, type ItemCondition } from '@/entities/item';
import { getApiErrorMessage } from '@/shared/api';
import { ItemDynamicAttributes } from '@/entities/item';

interface ItemEditDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  item: Item | null;
}

function useItemEditForm(item: Item, onClose: () => void) {
  const { t } = useTranslation();
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [condition, setCondition] = useState<ItemCondition>(item.condition);
  const [attributes, setAttributes] = useState<Record<string, string | number>>(
    item.attributes || {},
  );

  const { data: categories = [] } = useCategories();
  const category = useMemo(
    () => categories.find((c) => c.id === item.productModel.category.id),
    [categories, item],
  );

  const { mutate: updateItem, isPending } = useUpdateItem();

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    const formattedAttrs: Record<string, string | number> = {};
    for (const [k, v] of Object.entries(attributes)) {
      if (v === undefined || v === null || String(v).trim() === '') continue;
      const def = category?.attributes.find((a) => a.key === k);
      if (def?.type === 'NUMBER') {
        const num = Number(v);
        if (!Number.isNaN(num)) formattedAttrs[k] = num;
      } else {
        formattedAttrs[k] = String(v).trim();
      }
    }

    updateItem(
      { id: item.id, payload: { condition, attributes: formattedAttrs } },
      {
        onSuccess: () => {
          toast.success(t('items.updatedSuccess'));
          onClose();
        },
        onError: (err) => setErrorMessage(getApiErrorMessage(err) ?? t('common.error')),
      },
    );
  };

  return { condition, setCondition, attributes, setAttributes, category, errorMessage, isPending, submit };
}

function ItemEditContent({ item, onClose }: { item: Item; onClose: () => void }) {
  const { t } = useTranslation();
  const form = useItemEditForm(item, onClose);

  return (
    <form onSubmit={form.submit} className="space-y-4 pt-2">
      <FormError message={form.errorMessage} />

      <SelectField
        label={t('items.conditionLabel')}
        value={form.condition}
        onValueChange={(val) => form.setCondition(val as ItemCondition)}
        disabled={form.isPending}
        options={[
          { value: 'NEW', label: t('items.condition.NEW') },
          { value: 'USED', label: t('items.condition.USED') },
          { value: 'REFURBISHED', label: t('items.condition.REFURBISHED') },
        ]}
      />

      {form.category && (
        <ItemDynamicAttributes
          attributes={form.category.attributes}
          values={form.attributes}
          onChange={(key, val) =>
            form.setAttributes((prev) => ({ ...prev, [key]: val }))
          }
          errors={{}}
          disabled={form.isPending}
        />
      )}

      <DialogFormFooter onClose={onClose} isPending={form.isPending} />
    </form>
  );
}

/** Dialog for updating item condition and dynamic attributes. */
export function ItemEditDialog({ open, onOpenChange, item }: ItemEditDialogProps) {
  const { t } = useTranslation();

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[560px] max-h-[90vh] overflow-y-auto p-7">
        <DialogHeader>
          <DialogTitle>{t('items.editItem')}</DialogTitle>
        </DialogHeader>
        {open && item && (
          <ItemEditContent
            key={`edit-${item.id}`}
            item={item}
            onClose={() => onOpenChange(false)}
          />
        )}
      </DialogContent>
    </Dialog>
  );
}
