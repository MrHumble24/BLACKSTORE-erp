import { useTranslation } from 'react-i18next';
import { useFormContext, useWatch } from 'react-hook-form';
import { FormField, FormItem, FormLabel, FormControl, SelectField, Switch } from '@/shared/ui';
import type { Investor } from '@/entities/investor';
import { useSuppliers } from '@/entities/supplier';
import type { InvestorFormValues } from '../model/investor.schema';

/** Radix Select rejects '' as an item value, so "not linked" uses this sentinel. */
const NONE = 'none';

/** Create only: "Sends us devices" switch, on by default (nearly every investor ships). */
function ShipsDevicesSwitch({ disabled }: { disabled: boolean }) {
  const { t } = useTranslation();
  const { control } = useFormContext<InvestorFormValues>();
  return (
    <FormField
      control={control}
      name="shipsDevices"
      render={({ field }) => (
        <FormItem className="flex items-center justify-between gap-4">
          <FormLabel>{t('investors.shipsDevices')}</FormLabel>
          <FormControl>
            <Switch checked={field.value} onCheckedChange={field.onChange} disabled={disabled} />
          </FormControl>
        </FormItem>
      )}
    />
  );
}

/**
 * Edit only: which supplier record this investor ships under. Unlinked active suppliers plus the
 * currently linked one (it may be inactive); the server also rejects a supplier linked elsewhere.
 */
function SupplierRecordSelect({ disabled, investor }: { disabled: boolean; investor: Investor }) {
  const { t } = useTranslation();
  const { control, setValue } = useFormContext<InvestorFormValues>();
  const { data: suppliers = [] } = useSuppliers();
  // useWatch (not watch) so the select re-renders on setValue.
  const supplierId = useWatch({ control, name: 'supplierId' });
  const linked = investor.supplier;
  const options = suppliers
    .filter((s) => s.investorId === null || s.id === linked?.id)
    .map((s) => ({ value: String(s.id), label: s.name }));
  if (linked && !options.some((o) => o.value === String(linked.id))) {
    options.unshift({ value: String(linked.id), label: linked.name });
  }

  return (
    <SelectField
      label={t('investors.supplierRecord')}
      value={supplierId || NONE}
      onValueChange={(val) => setValue('supplierId', val === NONE ? '' : val, { shouldDirty: true })}
      disabled={disabled}
      options={[{ value: NONE, label: t('investors.supplierNone') }, ...options]}
    />
  );
}

/** Supplier link fields (F26): the switch when creating, the record select when editing; none for OWN. */
export function InvestorLinkFields({ disabled, investor }: { disabled: boolean; investor: Investor | null }) {
  if (!investor) return <ShipsDevicesSwitch disabled={disabled} />;
  if (investor.isOwn) return null;
  return <SupplierRecordSelect disabled={disabled} investor={investor} />;
}
