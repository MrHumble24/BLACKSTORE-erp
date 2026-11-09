import { useTranslation } from 'react-i18next';
import { useFormContext } from 'react-hook-form';
import {
  FormField, FormItem, FormLabel, FormControl, FormMessage, FormDescription,
  Input, Textarea, SelectField,
} from '@/shared/ui';
import { useProductModels } from '@/entities/product-model';
import type { Watch } from '@/entities/watch';
import type { WatchFormValues } from '../model/watch.schema';

type LinkedModel = Watch['productModel'];

interface ProductModelFieldProps {
  disabled: boolean;
  /** The edited watch's model; added to the options when it is no longer active so its name shows. */
  current: LinkedModel;
}

/** Optional searchable product-model link (active models, plus the current one if inactive). */
function ProductModelField({ disabled, current }: ProductModelFieldProps) {
  const { t } = useTranslation();
  const { control } = useFormContext<WatchFormValues>();
  const { data: models = [] } = useProductModels();
  const options = models.map((m) => ({ value: String(m.id), label: m.name }));
  if (current && !models.some((m) => m.id === current.id)) {
    options.push({ value: String(current.id), label: current.name });
  }

  return (
    <FormField
      control={control}
      name="productModelId"
      render={({ field }) => (
        <SelectField
          searchable
          label={t('watches.productModel')}
          value={field.value}
          onValueChange={field.onChange}
          disabled={disabled}
          placeholder={t('watches.noProductModel')}
          options={options}
        />
      )}
    />
  );
}

/** Max price (decimal string) and its currency label, side by side. */
function PriceFields({ disabled }: { disabled: boolean }) {
  const { t } = useTranslation();
  const { control } = useFormContext<WatchFormValues>();

  return (
    <div className="grid grid-cols-[1fr_8rem] gap-3">
      <FormField
        control={control}
        name="maxPrice"
        render={({ field }) => (
          <FormItem>
            <FormLabel>{t('watches.maxPrice')}</FormLabel>
            <FormControl>
              <Input inputMode="decimal" disabled={disabled} placeholder="1300.00" {...field} />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />
      <FormField
        control={control}
        name="currency"
        render={({ field }) => (
          <SelectField
            label={t('watches.currency')}
            value={field.value}
            onValueChange={field.onChange}
            disabled={disabled}
            options={[{ value: 'USD', label: 'USD' }, { value: 'UZS', label: 'UZS' }]}
          />
        )}
      />
    </div>
  );
}

/** Name, aliases (one per line), product model, max price and currency inputs. */
export function WatchFormFields({ disabled, currentModel }: { disabled: boolean; currentModel: LinkedModel }) {
  const { t } = useTranslation();
  const { control } = useFormContext<WatchFormValues>();

  return (
    <>
      <FormField
        control={control}
        name="name"
        render={({ field }) => (
          <FormItem>
            <FormLabel>{t('watches.name')}</FormLabel>
            <FormControl>
              <Input disabled={disabled} placeholder={t('watches.namePlaceholder')} {...field} />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />
      <FormField
        control={control}
        name="aliases"
        render={({ field }) => (
          <FormItem>
            <FormLabel>{t('watches.aliases')}</FormLabel>
            <FormControl>
              <Textarea rows={4} disabled={disabled} placeholder={t('watches.aliasesPlaceholder')} {...field} />
            </FormControl>
            <FormDescription>{t('watches.aliasesHint')}</FormDescription>
            <FormMessage />
          </FormItem>
        )}
      />
      <ProductModelField disabled={disabled} current={currentModel} />
      <PriceFields disabled={disabled} />
    </>
  );
}
