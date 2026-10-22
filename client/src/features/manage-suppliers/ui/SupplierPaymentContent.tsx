import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { DialogFormFooter, FormError, Form } from '@/shared/ui';
import { getTodayIso, normalizeMoney, useCreateOrUpdate } from '@/shared/lib';
import { useCreateSupplierPayment } from '@/entities/supplier';
import type { CreateSupplierPaymentPayload } from '@/entities/supplier';
import {
  createSupplierPaymentSchema,
  type SupplierPaymentFormValues,
} from '../model/supplier.schema';
import { SupplierPaymentFields } from './SupplierFormFields';

interface SupplierPaymentContentProps {
  supplierId: number;
  onClose: () => void;
}

/** Form body for recording a supplier payment; wrong amounts are fixed with a correcting entry. */
export function SupplierPaymentContent({ supplierId, onClose }: SupplierPaymentContentProps) {
  const { t } = useTranslation();
  const [todayIso] = useState(() => getTodayIso());
  const { mutate: createPayment, isPending: creating } = useCreateSupplierPayment();

  const { submit, apiError, isPending } = useCreateOrUpdate({
    create: (payload: CreateSupplierPaymentPayload, opt) =>
      createPayment({ id: supplierId, payload }, opt),
    // Create-only dialog: the update branch of useCreateOrUpdate never runs.
    update: () => undefined,
    isPending: creating,
    isEditing: false,
    successMessage: t('suppliers.paymentAddedSuccess'),
    onDone: onClose,
  });

  const form = useForm<SupplierPaymentFormValues>({
    resolver: zodResolver(createSupplierPaymentSchema(t)),
    defaultValues: { amount: '', fee: '', date: todayIso, note: '' },
  });

  const onSubmit = form.handleSubmit((values) => {
    submit({
      amount: normalizeMoney(values.amount),
      ...(values.fee.trim() ? { fee: normalizeMoney(values.fee) } : {}),
      ...(values.date?.trim() ? { date: values.date.trim() } : {}),
      ...(values.note.trim() ? { note: values.note.trim() } : {}),
    });
  });

  return (
    <Form {...form}>
      <form onSubmit={onSubmit} className="space-y-4 pt-2">
        <FormError message={apiError} />
        <SupplierPaymentFields
          register={form.register}
          errors={form.formState.errors}
          disabled={isPending}
        />
        <DialogFormFooter onClose={onClose} isPending={isPending} />
      </form>
    </Form>
  );
}
