import { useTranslation } from 'react-i18next';
import type { UseFormReturn } from 'react-hook-form';
import { SelectField, TextField } from '@/shared/ui';
import type { Investor } from '@/entities/investor';
import type { Location } from '@/entities/location';
import type { SupplierSummary } from '@/entities/supplier';
import type { BatchFormValues } from '../model/batch.schema';

interface BatchFormFieldsProps {
  form: UseFormReturn<BatchFormValues>;
  suppliers: SupplierSummary[];
  investors: Investor[];
  locations: Location[];
  withCostFields: boolean;
  disabled: boolean;
  /** The PATCH contract has no supplier/owner/location, so they lock when editing. */
  isEditing: boolean;
}

type Form = UseFormReturn<BatchFormValues>;

/** Supplier dropdown (batch header, required). */
function SupplierSelect({ form, suppliers, disabled }: { form: Form; suppliers: SupplierSummary[]; disabled: boolean }) {
  const { t } = useTranslation();

  return (
    <SelectField
      label={t('batches.supplier')}
      required
      value={form.watch('supplierId') ? String(form.watch('supplierId')) : ''}
      onValueChange={(val) => form.setValue('supplierId', Number(val), { shouldValidate: true })}
      disabled={disabled}
      placeholder={t('batches.selectSupplier')}
      error={form.formState.errors.supplierId?.message}
      options={suppliers.map((s) => ({ value: String(s.id), label: s.name }))}
    />
  );
}

/** Owner (investor) dropdown with the business code appended. */
function OwnerSelect({ form, investors, disabled }: { form: Form; investors: Investor[]; disabled: boolean }) {
  const { t } = useTranslation();

  return (
    <SelectField
      label={t('batches.owner')}
      required
      value={form.watch('investorId') ? String(form.watch('investorId')) : ''}
      onValueChange={(val) => form.setValue('investorId', Number(val), { shouldValidate: true })}
      disabled={disabled}
      placeholder={t('items.selectOwner')}
      error={form.formState.errors.investorId?.message}
      options={investors.map((i) => ({ value: String(i.id), label: `${i.name} (${i.code})` }))}
    />
  );
}

/** Storage location dropdown. */
function LocationSelect({ form, locations, disabled }: { form: Form; locations: Location[]; disabled: boolean }) {
  const { t } = useTranslation();

  return (
    <SelectField
      label={t('batches.location')}
      required
      value={form.watch('locationId') ? String(form.watch('locationId')) : ''}
      onValueChange={(val) => form.setValue('locationId', Number(val), { shouldValidate: true })}
      disabled={disabled}
      placeholder={t('items.selectLocation')}
      error={form.formState.errors.locationId?.message}
      options={locations.map((l) => ({ value: String(l.id), label: l.name }))}
    />
  );
}

/** Arrival date input (defaults to today on create). */
function ArrivalDateInput({ form, disabled }: { form: Form; disabled: boolean }) {
  const { t } = useTranslation();

  return (
    <TextField
      id="batch-arrival-date"
      label={`${t('batches.arrivalDate')} *`}
      type="date"
      hint={t('investors.dateHelp')}
      {...form.register('arrivalDate')}
      disabled={disabled}
    />
  );
}

/** Free-text note of the batch header. */
function NoteInput({ form, disabled }: { form: Form; disabled: boolean }) {
  const { t } = useTranslation();

  return <TextField id="batch-note" label={t('batches.note')} {...form.register('note')} disabled={disabled} />;
}

/** Extra cost total input, visible to manage_prices users on edit only. */
function ExtraCostInput({ form, disabled }: { form: Form; disabled: boolean }) {
  const { t } = useTranslation();

  return (
    <TextField
      id="batch-extra-cost"
      label={t('batches.extraCostTotal')}
      inputMode="decimal"
      placeholder="0.00"
      {...form.register('extraCostTotal')}
      disabled={disabled}
      error={form.formState.errors.extraCostTotal?.message}
    />
  );
}

/** Cost split method dropdown (NONE / EQUAL / BY_PRICE), manage_prices only. */
function SplitMethodSelect({ form, disabled }: { form: Form; disabled: boolean }) {
  const { t } = useTranslation();

  return (
    <SelectField
      label={t('batches.costSplitMethod')}
      required
      value={form.watch('costSplitMethod') ?? 'NONE'}
      onValueChange={(val) => form.setValue('costSplitMethod', val as BatchFormValues['costSplitMethod'])}
      disabled={disabled}
      error={form.formState.errors.costSplitMethod?.message}
      options={[
        { value: 'NONE', label: t('batches.split.NONE') },
        { value: 'EQUAL', label: t('batches.split.EQUAL') },
        { value: 'BY_PRICE', label: t('batches.split.BY_PRICE') },
      ]}
    />
  );
}

/** Batch form fields: header selects + date, note and the edit-only cost block. */
export function BatchFormFields({
  form,
  suppliers,
  investors,
  locations,
  withCostFields,
  disabled,
  isEditing,
}: BatchFormFieldsProps) {
  return (
    <div className="space-y-3">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <SupplierSelect form={form} suppliers={suppliers} disabled={disabled || isEditing} />
        <OwnerSelect form={form} investors={investors} disabled={disabled || isEditing} />
        <LocationSelect form={form} locations={locations} disabled={disabled || isEditing} />
        <ArrivalDateInput form={form} disabled={disabled} />
      </div>
      <NoteInput form={form} disabled={disabled} />
      {withCostFields && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <ExtraCostInput form={form} disabled={disabled} />
          <SplitMethodSelect form={form} disabled={disabled} />
        </div>
      )}
    </div>
  );
}
