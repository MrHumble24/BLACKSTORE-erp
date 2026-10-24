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
import { SupplierPaymentFeeSwitch } from './SupplierPaymentFeeSwitch';

interface SupplierPaymentContentProps {
  supplierId: number;
  /** Linked investor (F26): no "Whose money", only "{{name}} pays the fee"; investorId is not sent. */
  linkedInvestorName?: string;
  onClose: () => void;
}

/** Owner fields of the payload: investor + fee payer, or just the fee payer for a linked supplier. */
function ownerFields(values: SupplierPaymentFormValues, linked: boolean) {
  if (linked) return values.feePaidBy === 'INVESTOR' ? { feePaidBy: 'INVESTOR' as const } : {};
  // '' = the business's own money: no investor and no fee payer are sent.
  const investorId = values.investorId ? Number(values.investorId) : undefined;
  return investorId ? { investorId, feePaidBy: values.feePaidBy } : {};
}

/** Form body for recording a supplier payment; wrong amounts are fixed with a correcting entry. */
export function SupplierPaymentContent({
  supplierId,
  linkedInvestorName,
  onClose,
}: SupplierPaymentContentProps) {
  const { t } = useTranslation();
  const [todayIso] = useState(() => getTodayIso());
  const { mutate: createPayment, isPending: creating } = useCreateSupplierPayment();
  const queryClient = useQueryClient();

  const { submit, apiError, isPending } = useCreateOrUpdate({
    create: (payload: CreateSupplierPaymentPayload, opt) =>
      createPayment({ id: supplierId, payload }, {
        ...opt,
        onSuccess: () => {
          // Investor money cards, "Sent to suppliers" and the account statement are computed from these payments.
          void queryClient.invalidateQueries({ queryKey: investorKeys.all });
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
    submit({
      amount: normalizeMoney(values.amount),
      ...(values.fee.trim() ? { fee: normalizeMoney(values.fee) } : {}),
      ...(values.date?.trim() ? { date: values.date.trim() } : {}),
      ...(values.note.trim() ? { note: values.note.trim() } : {}),
      ...ownerFields(values, Boolean(linkedInvestorName)),
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
          collapseMeta={Boolean(linkedInvestorName)}
        />
        {linkedInvestorName ? (
          <SupplierPaymentFeeSwitch
            control={form.control}
            setValue={form.setValue}
            disabled={isPending}
            investorName={linkedInvestorName}
          />
        ) : (
          <SupplierPaymentOwnerFields
            control={form.control}
            setValue={form.setValue}
            disabled={isPending}
          />
        )}
        <DialogFormFooter onClose={onClose} isPending={isPending} />
      </form>
    </Form>
  );
}
