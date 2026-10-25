import { useState, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { Plus } from 'lucide-react';
import {
  Input,
  Button,
  Label,
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from '@/shared/ui';
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
      purchasePrice: selectedStock.avgCost ?? null,
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
      <div className="flex-1 min-w-[200px] space-y-1">
        <Label className="text-xs">{t('sell.tableModel')}</Label>
        <Select
          value={form.selectedModelId}
          onValueChange={form.setSelectedModelId}
          disabled={options.length === 0}
        >
          <SelectTrigger className="h-10 bg-gallery-white">
            <SelectValue placeholder={options.length === 0 ? t('sell.noAccessoriesInStock') : t('sell.selectAccessory')} />
          </SelectTrigger>
          <SelectContent>
            {options.map((opt) => (
              <SelectItem key={opt.value} value={opt.value}>
                {opt.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="w-full sm:w-28 space-y-1">
        <div className="flex justify-between items-center">
          <Label className="text-xs">{t('sell.accessoryQty')}</Label>
          {form.selectedStock && (
            <span className="text-[10px] text-slate font-mono">max {form.selectedStock.quantity}</span>
          )}
        </div>
        <Input
          type="number"
          min="1"
          max={form.selectedStock?.quantity ?? 9999}
          value={form.quantity}
          onChange={(e) => form.setQuantity(Math.max(1, Number(e.target.value)))}
          placeholder={t('sell.accessoryQty')}
          className="h-10 text-center font-mono"
        />
      </div>
      <div className="w-full sm:w-36 space-y-1">
        <Label className="text-xs">{t('sell.accessoryPrice')} ($)</Label>
        <Input
          type="number"
          step="any"
          min="0"
          value={form.unitPrice}
          onChange={(e) => form.setUnitPrice(e.target.value)}
          placeholder="0.00"
          className="h-10 font-mono text-right"
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
    <div className="rounded-2xl border border-hairline-silver/70 bg-gallery-white p-4 space-y-3">
      <div className="flex items-center gap-1.5 text-xs font-semibold text-slate uppercase tracking-wider">
        <Plus className="h-3.5 w-3.5" />
        <span>{t('sell.addAccessory')}</span>
      </div>
      <div className="flex flex-col sm:flex-row items-stretch sm:items-end gap-2.5">
        <AccessoryInputs form={form} options={options} />
        <Button
          type="button"
          onClick={form.handleAdd}
          disabled={!form.selectedStock || !form.unitPrice.trim()}
          className="h-10 gap-1.5 text-xs px-4 self-stretch sm:self-auto"
        >
          <Plus className="h-4 w-4" />
          {t('sell.addAccessory')}
        </Button>
      </div>
    </div>
  );
}
