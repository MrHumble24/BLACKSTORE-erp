import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useForm, useWatch } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { DialogFormFooter, FormError, Form } from '@/shared/ui';
import { getTodayIso, normalizeMoney, useCreateOrUpdate } from '@/shared/lib';
import {
  useCreateLedgerEntry,
  useLedgerCategories,
  type CreateLedgerEntryPayload,
} from '@/entities/ledger';
import { createLedgerSchema, type LedgerFormValues } from '../model/ledger.schema';
import { LedgerEntryFields } from './LedgerEntryFields';

/** Form body for recording an income or expense entry (create-only; BR-12 bans edits). */
export function LedgerEntryContent({ onClose }: { onClose: () => void }) {
  const { t } = useTranslation();
  const [todayIso] = useState(() => getTodayIso());
  const { data: categories = [] } = useLedgerCategories();
  const { mutate: createEntry, isPending } = useCreateLedgerEntry();

  const { submit, apiError } = useCreateOrUpdate({
    create: (payload: CreateLedgerEntryPayload, opt) => createEntry(payload, opt),
    update: () => undefined,
    isPending,
    isEditing: false,
    successMessage: t('ledger.createdSuccess'),
    onDone: onClose,
  });

  const form = useForm<LedgerFormValues>({
    resolver: zodResolver(createLedgerSchema(t)),
    defaultValues: { type: 'EXPENSE', category: '', amount: '', date: todayIso, note: '', countsInProfit: false },
  });
  const isIncome = useWatch({ control: form.control, name: 'type' }) === 'INCOME';

  const onSubmit = form.handleSubmit((values) => {
    submit({
      type: values.type,
      category: values.category.trim(),
      amount: normalizeMoney(values.amount),
      ...(values.date.trim() ? { date: values.date.trim() } : {}),
      ...(values.note.trim() ? { note: values.note.trim() } : {}),
      ...(values.type === 'INCOME' ? { countsInProfit: values.countsInProfit } : {}),
    });
  });

  return (
    <Form {...form}>
      <form onSubmit={onSubmit} className="space-y-4 pt-2">
        <FormError message={apiError} />
        <LedgerEntryFields
          control={form.control}
          register={form.register}
          errors={form.formState.errors}
          categories={categories}
          isIncome={isIncome}
          disabled={isPending}
        />
        <DialogFormFooter onClose={onClose} isPending={isPending} />
      </form>
    </Form>
  );
}
