import { useTranslation } from 'react-i18next';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { DialogFormFooter, FormError, Form } from '@/shared/ui';
import { useCreateOrUpdate } from '@/shared/lib';
import { useCreateSupplier, useUpdateSupplier, type Supplier } from '@/entities/supplier';
import type { CreateSupplierPayload, UpdateSupplierPayload } from '@/entities/supplier';
import { createSupplierSchema, type SupplierFormValues } from '../model/supplier.schema';
import { SupplierFormFields } from './SupplierFormFields';

interface SupplierFormContentProps {
  supplier: Supplier | null;
  onClose: () => void;
}

/** Maps valid form values onto the trimmed create/update API payload; on update
 * empty fields are sent as trimmed '' so a cleared value can actually be saved. */
function buildSupplierPayload(values: SupplierFormValues, includeEmpty = false) {
  return {
    name: values.name.trim(),
    ...(values.country.trim() || includeEmpty ? { country: values.country.trim() } : {}),
    ...(values.phone.trim() || includeEmpty ? { phone: values.phone.trim() } : {}),
    ...(values.note.trim() || includeEmpty ? { note: values.note.trim() } : {}),
  };
}

/** Form body for creating a supplier or editing an existing one. */
export function SupplierFormContent({ supplier, onClose }: SupplierFormContentProps) {
  const { t } = useTranslation();
  const isEditing = Boolean(supplier);

  const { mutate: create, isPending: isCreating } = useCreateSupplier();
  const { mutate: update, isPending: isUpdating } = useUpdateSupplier();

  const { submit, apiError, isPending } = useCreateOrUpdate({
    create: (p: CreateSupplierPayload, opt) => create(p, opt),
    update: (p: UpdateSupplierPayload, opt) => {
      if (supplier) update({ id: supplier.id, payload: p }, opt);
    },
    isPending: isCreating || isUpdating,
    isEditing,
    successMessage: t(isEditing ? 'suppliers.updatedSuccess' : 'suppliers.createdSuccess'),
    onDone: onClose,
  });

  const form = useForm<SupplierFormValues>({
    resolver: zodResolver(createSupplierSchema(t)),
    defaultValues: {
      name: supplier?.name ?? '',
      country: supplier?.country ?? '',
      phone: supplier?.phone ?? '',
      note: supplier?.note ?? '',
    },
  });

  const onSubmit = form.handleSubmit((values) => {
    submit(buildSupplierPayload(values), buildSupplierPayload(values, isEditing));
  });

  return (
    <Form {...form}>
      <form onSubmit={onSubmit} className="space-y-4 pt-2">
        <FormError message={apiError} />
        <SupplierFormFields
          register={form.register}
          errors={form.formState.errors}
          disabled={isPending}
        />
        <DialogFormFooter onClose={onClose} isPending={isPending} />
      </form>
    </Form>
  );
}
