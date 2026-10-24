import { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { DialogFormFooter, FormError, Form } from '@/shared/ui';
import { getTodayIso, normalizeMoney, useCreateOrUpdate } from '@/shared/lib';
import { useCreateSupplierPayment } from '@/entities/supplier';
import type { CreateSupplierPaymentPayload } from '@/entities/supplier';
import { investorKeys } from '@/entities/investor';
import {
  createSupplierPaymentSchema,
  type SupplierPaymentFormValues,
} from '../model/supplier.schema';
import { SupplierPaymentFields } from './SupplierFormFields';
import { SupplierPaymentOwnerFields } from './SupplierPaymentOwnerFields';

interface SupplierPaymentContentProps {
  supplierId: number;
  onClose: () => void;
}

/** Form body for recording a supplier payment; wrong amounts are fixed with a correcting entry. */
export function SupplierPaymentContent({ supplierId, onClose }: SupplierPaymentContentProps) {
  const { t } = useTranslation();
  const [todayIso] = useState(() => getTodayIso());
  const { mutate: createPayment, isPending: creating } = useCreateSupplierPayment();
  const queryClient = useQueryClient();

  const { submit, apiError, isPending } = useCreateOrUpdate({
    create: (payload: CreateSupplierPaymentPayload, opt) =>
      createPayment({ id: supplierId, payload }, {
        ...opt,
        onSuccess: () => {
          // Investor money cards and "Sent to suppliers" are computed from these payments.
          if (payload.investorId) {
            void queryClient.invalidateQueries({ queryKey: investorKeys.all });
          }
          opt?.onSuccess?.();
        },
      }),
    // Create-only dialog: the update branch of useCreateOrUpdate never runs.
    update: () => undefined,
    isPending: creating,
    isEditing: false,
    successMessage: t('suppliers.paymentAddedSuccess'),
    onDone: onClose,
  });

  const form = useForm<SupplierPaymentFormValues>({
    resolver: zodResolver(createSupplierPaymentSchema(t)),
    defaultValues: {
      amount: '', fee: '', date: todayIso, note: '', investorId: '', feePaidBy: 'BUSINESS',
    },
  });

  const onSubmit = form.handleSubmit((values) => {
    // '' = the business's own money: no investor and no fee payer are sent.
    const investorId = values.investorId ? Number(values.investorId) : undefined;
    submit({
      amount: normalizeMoney(values.amount),
      ...(values.fee.trim() ? { fee: normalizeMoney(values.fee) } : {}),
      ...(values.date?.trim() ? { date: values.date.trim() } : {}),
      ...(values.note.trim() ? { note: values.note.trim() } : {}),
      ...(investorId ? { investorId, feePaidBy: values.feePaidBy } : {}),
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
        <SupplierPaymentOwnerFields
          control={form.control}
          setValue={form.setValue}
          disabled={isPending}
        />
        <DialogFormFooter onClose={onClose} isPending={isPending} />
      </form>
    </Form>
  );
}
