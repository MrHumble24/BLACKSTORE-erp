import { useTranslation } from 'react-i18next';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFormFooter, FormError, Form, TextField } from '@/shared/ui';
import { normalizeMoney, useCreateOrUpdate } from '@/shared/lib';
import { useUpdateBatchLine, type BatchLine, type UpdateBatchLinePayload } from '@/entities/batch';
import { createLinePriceSchema, type LinePriceValues } from '../model/batch.schema';

interface LinePriceDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  batchId: number;
  line: BatchLine | null;
}

/** Dialog for setting the unit price of one batch line (manage_prices only). */
export function LinePriceDialog({ open, onOpenChange, batchId, line }: LinePriceDialogProps) {
  const { t } = useTranslation();

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[420px] p-7">
        <DialogHeader>
          <DialogTitle>{t('batches.setPrice')}</DialogTitle>
        </DialogHeader>
        {open && line && (
          <LinePriceContent
            key={line.id}
            batchId={batchId}
            line={line}
            onClose={() => onOpenChange(false)}
          />
        )}
      </DialogContent>
    </Dialog>
  );
}

interface LinePriceContentProps {
  batchId: number;
  line: BatchLine;
  onClose: () => void;
}

/** Single unit-price field; device lines also reprice the item, accessory lines adjust avgCost. */
function LinePriceContent({ batchId, line, onClose }: LinePriceContentProps) {
  const { t } = useTranslation();
  const { mutate: updateLine, isPending: saving } = useUpdateBatchLine();

  const { submit, apiError, isPending } = useCreateOrUpdate<UpdateBatchLinePayload>({
    // Update-only dialog: the create branch of useCreateOrUpdate never runs.
    create: () => undefined,
    update: (payload, opt) => updateLine({ id: batchId, lineId: line.id, payload }, opt),
    isPending: saving,
    isEditing: true,
    successMessage: t('batches.linePriceSuccess'),
    onDone: onClose,
  });

  const form = useForm<LinePriceValues>({
    resolver: zodResolver(createLinePriceSchema(t)),
    defaultValues: { unitPrice: line.unitPrice ?? '' },
  });

  const onSubmit = form.handleSubmit((values) => {
    submit({ unitPrice: normalizeMoney(values.unitPrice) });
  });

  return (
    <Form {...form}>
      <form onSubmit={onSubmit} className="space-y-4 pt-2">
        <FormError message={apiError} />
        <TextField
          id="line-unit-price"
          label={`${t('batches.unitPrice')} *`}
          inputMode="decimal"
          placeholder="0.00"
          {...form.register('unitPrice')}
          disabled={isPending}
          error={form.formState.errors.unitPrice?.message}
        />
        <p className="text-[11px] text-slate">{t('batches.lineModel', { model: line.productModel.name })}</p>
        <DialogFormFooter onClose={onClose} isPending={isPending} />
      </form>
    </Form>
  );
}
