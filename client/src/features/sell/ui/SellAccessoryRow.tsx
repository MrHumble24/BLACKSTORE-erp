import { useState, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { Plus } from 'lucide-react';
import { Input, Button, SelectField } from '@/shared/ui';
import { useAccessoryStock, type AccessoryStock } from '@/entities/accessory-stock';
import type { AccessoryCartLine } from '../model/types';

interface SellAccessoryRowProps {
  locationId: number | null;
  onAddAccessory: (line: AccessoryCartLine) => void;
}

function useAccessoryRowForm(
  stockList: AccessoryStock[],
  onAddAccessory: (line: AccessoryCartLine) => void,
) {
  const [selectedModelId, setSelectedModelId] = useState<string>('');
  const [quantity, setQuantity] = useState(1);
  const [unitPrice, setUnitPrice] = useState('');

  const selectedStock = useMemo(() => {
    return stockList.find((s) => String(s.productModel.id) === selectedModelId);
  }, [stockList, selectedModelId]);

  const handleAdd = () => {
    if (!selectedStock || quantity <= 0 || !unitPrice.trim()) return;

    onAddAccessory({
      type: 'accessory',
      productModelId: selectedStock.productModel.id,
      modelName: selectedStock.productModel.name,
      quantity,
      unitPrice: unitPrice.trim(),
    });

    setSelectedModelId('');
    setQuantity(1);
    setUnitPrice('');
  };

  return {
    selectedModelId,
    setSelectedModelId,
    quantity,
    setQuantity,
    unitPrice,
    setUnitPrice,
    selectedStock,
    handleAdd,
  };
}

interface AccessoryInputsProps {
  form: ReturnType<typeof useAccessoryRowForm>;
  options: { value: string; label: string }[];
}

function AccessoryInputs({ form, options }: AccessoryInputsProps) {
  const { t } = useTranslation();
  return (
    <>
      <div className="flex-1 min-w-[200px]">
        <SelectField
          label={t('sell.addAccessory')}
          value={form.selectedModelId}
          onValueChange={form.setSelectedModelId}
          options={options}
          placeholder={t('sell.selectAccessory')}
        />
      </div>
      <div className="w-24">
        <Input
          type="number"
          min="1"
          max={form.selectedStock?.quantity ?? 9999}
          value={form.quantity}
          onChange={(e) => form.setQuantity(Math.max(1, Number(e.target.value)))}
          placeholder={t('sell.accessoryQty')}
          className="h-10"
        />
      </div>
      <div className="w-32">
        <Input
          type="number"
          step="any"
          min="0"
          value={form.unitPrice}
          onChange={(e) => form.setUnitPrice(e.target.value)}
          placeholder={t('sell.accessoryPrice')}
          className="h-10"
        />
      </div>
    </>
  );
}

/** Row for selecting an in-stock accessory model, quantity and price to add to the sale. */
export function SellAccessoryRow({
  locationId,
  onAddAccessory,
}: SellAccessoryRowProps) {
  const { t } = useTranslation();
  const { data: stockPage } = useAccessoryStock({ locationId: locationId ?? undefined }, 1, 100);
  const stockList = useMemo(() => (stockPage?.items ?? []).filter((s) => s.quantity > 0), [stockPage]);
  const form = useAccessoryRowForm(stockList, onAddAccessory);
  const options = stockList.map((s) => ({ value: String(s.productModel.id), label: `${s.productModel.name} (${s.quantity})` }));

  return (
    <div className="flex flex-wrap items-end gap-2 pt-2 border-t border-hairline-silver/60">
      <AccessoryInputs form={form} options={options} />
      <Button
        type="button"
        variant="outline"
        onClick={form.handleAdd}
        disabled={!form.selectedStock || !form.unitPrice.trim()}
        className="h-10 gap-1 text-xs"
      >
        <Plus className="h-4 w-4" />
        {t('sell.addAccessory')}
      </Button>
    </div>
  );
}
