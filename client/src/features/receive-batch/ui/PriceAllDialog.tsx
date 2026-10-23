import { useTranslation } from 'react-i18next';
import { useWatch, useForm, type UseFormReturn } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFormFooter, FormError, Form, SelectField, TextField,
} from '@/shared/ui';
import { normalizeMoney, useCreateOrUpdate } from '@/shared/lib';
import { usePriceBatchModel, type Batch, type RepriceModelPayload } from '@/entities/batch';
import { createPriceAllSchema, type PriceAllValues } from '../model/batch.schema';

interface PriceAllDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  batch: Batch;
}

/** Distinct models across the batch lines (device and accessory), for the dropdown. */
function distinctModels(batch: Batch) {
  return [...new Map(batch.lines.map((line) => [line.productModel.id, line.productModel])).values()];
}

/** Dialog that reprices every line of one chosen model (manage_prices only). */
export function PriceAllDialog({ open, onOpenChange, batch }: PriceAllDialogProps) {
  const { t } = useTranslation();

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[460px] p-7">
        <DialogHeader>
          <DialogTitle>{t('batches.priceAllTitle')}</DialogTitle>
        </DialogHeader>
        {open && (
          <PriceAllContent key={String(open)} batch={batch} onClose={() => onOpenChange(false)} />
        )}
      </DialogContent>
    </Dialog>
  );
}

interface PriceAllContentProps {
  batch: Batch;
  onClose: () => void;
}

interface PriceAllFieldsProps {
  form: UseFormReturn<PriceAllValues>;
  models: Batch['lines'][number]['productModel'][];
  isPending: boolean;
}

/** Model dropdown + the unit price that every line of that model receives. */
function PriceAllFields({ form, models, isPending }: PriceAllFieldsProps) {
  const { t } = useTranslation();
  // useWatch re-renders reliably when setValue changes the selected model.
  const productModelId = useWatch({ control: form.control, name: 'productModelId' });

  return (
    <>
      <SelectField
        label={t('batches.model')}
        required
        value={productModelId ? String(productModelId) : ''}
        onValueChange={(val) => form.setValue('productModelId', Number(val), { shouldValidate: true })}
        disabled={isPending}
        error={form.formState.errors.productModelId?.message}
        options={models.map((m) => ({ value: String(m.id), label: m.name }))}
      />
      <TextField
        id="price-all-unit-price"
        label={`${t('batches.unitPrice')} *`}
        inputMode="decimal"
        placeholder="0.00"
        {...form.register('unitPrice')}
        disabled={isPending}
        error={form.formState.errors.unitPrice?.message}
      />
    </>
  );
}

/** Model dropdown + one unit price; the server applies it to every line of that model. */
function PriceAllContent({ batch, onClose }: PriceAllContentProps) {
  const { t } = useTranslation();
  const models = distinctModels(batch);
  const { mutate: priceAll, isPending: saving } = usePriceBatchModel();

  const { submit, apiError, isPending } = useCreateOrUpdate<RepriceModelPayload>({
    // Update-only dialog: the create branch of useCreateOrUpdate never runs.
    create: () => undefined,
    update: (payload, opt) => priceAll({ id: batch.id, payload }, opt),
    isPending: saving,
    isEditing: true,
    successMessage: t('batches.priceAllSuccess'),
    onDone: onClose,
  });

  const form = useForm<PriceAllValues>({
    resolver: zodResolver(createPriceAllSchema(t)),
    defaultValues: { productModelId: models[0]?.id ?? 0, unitPrice: '' },
  });

  const onSubmit = form.handleSubmit((values) => {
    submit({ productModelId: values.productModelId, unitPrice: normalizeMoney(values.unitPrice) });
  });

  return (
    <Form {...form}>
      <form onSubmit={onSubmit} className="space-y-4 pt-2">
        <FormError message={apiError} />
        <PriceAllFields form={form} models={models} isPending={isPending} />
        <DialogFormFooter onClose={onClose} isPending={isPending} />
      </form>
    </Form>
  );
}
