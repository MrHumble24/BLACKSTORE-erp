import { useTranslation } from 'react-i18next';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { DialogFormFooter, FormError, Form } from '@/shared/ui';
import { getTodayIso, normalizeMoney, useCreateOrUpdate } from '@/shared/lib';
import { useAuthStore } from '@/entities/session';
import { useInvestors } from '@/entities/investor';
import { useLocations } from '@/entities/location';
import { useSuppliers } from '@/entities/supplier';
import {
  useCreateBatch,
  useUpdateBatch,
  type BatchSummary,
  type CreateBatchPayload,
  type UpdateBatchPayload,
} from '@/entities/batch';
import { createBatchFormSchema, type BatchFormValues } from '../model/batch.schema';
import { BatchFormFields } from './BatchFormFields';

interface BatchFormContentProps {
  batch: BatchSummary | null;
  onClose: () => void;
}

/** Create payload: owner trio required, date and note optional. */
function buildCreatePayload(values: BatchFormValues): CreateBatchPayload {
  return {
    supplierId: values.supplierId,
    investorId: values.investorId,
    locationId: values.locationId,
    ...(values.arrivalDate.trim() ? { arrivalDate: values.arrivalDate.trim() } : {}),
    ...(values.note.trim() ? { note: values.note.trim() } : {}),
  };
}

/** Update payload: header fields always (note as trimmed '' so clears stick);
 * the contract has no supplier/owner/location on PATCH, and extra cost fields
 * only go out with manage_prices. */
function buildUpdatePayload(values: BatchFormValues, withCostFields: boolean): UpdateBatchPayload {
  return {
    arrivalDate: values.arrivalDate.trim() || undefined,
    note: values.note.trim(),
    ...(withCostFields && values.extraCostTotal?.trim()
      ? { extraCostTotal: normalizeMoney(values.extraCostTotal) }
      : {}),
    ...(withCostFields && values.costSplitMethod
      ? { costSplitMethod: values.costSplitMethod as UpdateBatchPayload['costSplitMethod'] }
      : {}),
  };
}

/** Create/update wiring for the batch dialog (localized toasts via useCreateOrUpdate). */
function useBatchSubmit(batch: BatchSummary | null, onDone: () => void) {
  const { t } = useTranslation();
  const isEditing = Boolean(batch);
  const { mutate: create, isPending: isCreating } = useCreateBatch();
  const { mutate: update, isPending: isUpdating } = useUpdateBatch();

  return useCreateOrUpdate({
    create: (p: CreateBatchPayload, opt) => create(p, opt),
    update: (p: UpdateBatchPayload, opt) => {
      if (batch) update({ id: batch.id, payload: p }, opt);
    },
    isPending: isCreating || isUpdating,
    isEditing,
    successMessage: t(isEditing ? 'batches.updatedSuccess' : 'batches.createdSuccess'),
    onDone,
  });
}

/** Form body for creating a batch or editing one (cost fields visible for manage_prices). */
export function BatchFormContent({ batch, onClose }: BatchFormContentProps) {
  const { t } = useTranslation();
  const isEditing = Boolean(batch);
  const canManagePrices = useAuthStore((state) => state.hasPermission('manage_prices'));
  const withCostFields = isEditing && canManagePrices;
  const { submit, apiError, isPending } = useBatchSubmit(batch, onClose);

  // Edit mode keeps deactivated suppliers/owners/locations selectable for existing batches.
  const { data: suppliers = [] } = useSuppliers(isEditing);
  const { data: investors = [] } = useInvestors(isEditing);
  const { data: locations = [] } = useLocations(isEditing);

  const form = useForm<BatchFormValues>({
    resolver: zodResolver(createBatchFormSchema(t, withCostFields)),
    defaultValues: {
      supplierId: batch?.supplier.id ?? 0,
      investorId: batch?.investor.id ?? 0,
      locationId: batch?.location.id ?? 0,
      arrivalDate: (batch?.arrivalDate ?? getTodayIso()).slice(0, 10),
      note: batch?.note ?? '',
      extraCostTotal: batch?.extraCostTotal ?? '',
      costSplitMethod: batch?.costSplitMethod ?? 'NONE',
    },
  });

  const onSubmit = form.handleSubmit((values) => {
    submit(buildCreatePayload(values), buildUpdatePayload(values, withCostFields));
  });

  return (
    <Form {...form}>
      <form onSubmit={onSubmit} className="space-y-4 pt-2">
        <FormError message={apiError} />
        <BatchFormFields
          form={form}
          suppliers={suppliers}
          investors={investors}
          locations={locations}
          withCostFields={withCostFields}
          disabled={isPending}
          isEditing={isEditing}
        />
        <DialogFormFooter onClose={onClose} isPending={isPending} />
      </form>
    </Form>
  );
}
