import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { useForm, useWatch } from 'react-hook-form';
import type { UseFormRegister, FieldErrors } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { toast } from 'sonner';
import { TriangleAlert } from 'lucide-react';
import { Button, FormError, TextField } from '@/shared/ui';
import { getApiErrorMessage, getApiErrorStatus } from '@/shared/api';
import { normalizeMoney } from '@/shared/lib';
import { useCategories, type Category } from '@/entities/category';
import { useInvestors } from '@/entities/investor';
import { useLocations } from '@/entities/location';
import {
  useItemByCode,
  buildIdentifiers,
  formatAttributes,
  ItemIdentifierInputs,
  ItemDynamicAttributes,
  type ItemStatus,
} from '@/entities/item';
import {
  createWalkInPurchaseSchema,
  type WalkInPurchaseFormValues,
} from '../model/walk-in.schema';
import { useCreateWalkInPurchase } from '../api';
import type { CreateWalkInPurchasePayload } from '../api';
import { WalkInSellerFields, WalkInModelFields } from './WalkInFormFields';

/** Item found in the system by an identifier being typed (FR-25). */
interface DuplicateWarning {
  id: number;
  status: ItemStatus;
}

/** Amber warning banner shown when an identifier already belongs to an item. */
function DuplicateWarningBanner({ warning }: { warning: DuplicateWarning | null }) {
  const { t } = useTranslation();
  if (!warning) return null;

  return (
    <div className="rounded-2xl bg-amber-50 border border-amber-300 p-3 flex items-start gap-2 text-xs font-medium text-amber-900">
      <TriangleAlert className="h-4 w-4 shrink-0 text-amber-600" />
      <span>
        {t('walkIn.alreadyInSystem', {
          item: `#${warning.id}`,
          status: t(`items.status.${warning.status}`),
        })}
      </span>
    </div>
  );
}

/** Price-paid input: staff type the cash handed to the seller (never shown again, FR-25). */
function PricePaidField({
  register,
  errors,
  disabled,
}: {
  register: UseFormRegister<WalkInPurchaseFormValues>;
  errors: FieldErrors<WalkInPurchaseFormValues>;
  disabled: boolean;
}) {
  const { t } = useTranslation();

  return (
    <TextField
      id="walk-in-price"
      label={`${t('walkIn.pricePaid')} *`}
      inputMode="decimal"
      placeholder="0.00"
      {...register('pricePaid')}
      disabled={disabled}
      error={errors.pricePaid?.message}
      hint={t('walkIn.pricePaidHelp')}
      className="max-w-[240px]"
    />
  );
}

/** Maps valid form values onto the walk-in purchase API payload. */
function buildWalkInPayload(
  values: WalkInPurchaseFormValues,
  selectedCategory: Category | undefined,
): CreateWalkInPurchasePayload {
  return {
    seller: { name: values.sellerName.trim(), phone: values.sellerPhone.trim() },
    productModelId: values.productModelId,
    locationId: values.locationId,
    investorId: values.investorId,
    identifiers: buildIdentifiers(values),
    condition: values.condition,
    attributes: formatAttributes(values.attributes, selectedCategory?.attributes),
    pricePaid: normalizeMoney(values.pricePaid),
  };
}

/** Default walk-in values; investorId=0 is replaced by the business investor once loaded. */
const DEFAULT_WALK_IN_VALUES: WalkInPurchaseFormValues = {
  categoryId: 0,
  productModelId: 0,
  investorId: 0,
  locationId: 0,
  condition: 'NEW',
  imei: '',
  imei2: '',
  serial: '',
  attributes: {},
  sellerName: '',
  sellerPhone: '',
  pricePaid: '',
};

/** Looks an identifier up via /items/by-code and keeps the last hit as a warning (FR-25). */
function useDuplicateCheck() {
  const [warning, setWarning] = useState<DuplicateWarning | null>(null);
  const lookup = useItemByCode();

  const checkIdentifier = (value: string) => {
    const code = value.trim();
    if (code.length < 4) {
      setWarning(null);
      return;
    }
    lookup.mutate(code, {
      onSuccess: (item) => setWarning({ id: item.id, status: item.status }),
      onError: (err) => {
        if (getApiErrorStatus(err) === 404) setWarning(null);
      },
    });
  };

  return { warning, checkIdentifier };
}

/** Wires the walk-in form: validation, business-owner default, duplicate lookup and submit. */
function useWalkInPurchaseForm(serializedCategories: Category[]) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { mutate: createPurchase, isPending } = useCreateWalkInPurchase();
  const { warning, checkIdentifier } = useDuplicateCheck();
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const { data: investors = [] } = useInvestors();
  const { data: locations = [] } = useLocations();

  const form = useForm<WalkInPurchaseFormValues>({
    resolver: (values, ctx, opt) => {
      const category = serializedCategories.find((c) => c.id === values.categoryId);
      return zodResolver(createWalkInPurchaseSchema(t, category?.attributes ?? []))(values, ctx, opt);
    },
    defaultValues: DEFAULT_WALK_IN_VALUES,
  });
  const categoryId = useWatch({ control: form.control, name: 'categoryId' });
  const selectedCategory = serializedCategories.find((c) => c.id === categoryId);

  // The business (isOwn) investor owns walk-in purchases unless staff picks one explicitly.
  useEffect(() => {
    if (form.getValues('investorId') !== 0) return;
    const business = investors.find((inv) => inv.isOwn);
    if (business) form.setValue('investorId', business.id);
  }, [form, investors]);

  const onSubmit = form.handleSubmit((values) => {
    setErrorMessage(null);
    createPurchase(buildWalkInPayload(values, selectedCategory), {
      // Success toast never contains the price paid (FR-25: staff must not retain it).
      onSuccess: (item) => {
        toast.success(t('walkIn.createdSuccess'));
        navigate(`/items/${item.id}`);
      },
      onError: (err) => {
        // 409 keeps the server's item-aware duplicate message; other statuses get a generic one.
        setErrorMessage(
          getApiErrorMessage(err)
            ?? t(getApiErrorStatus(err) === 409 ? 'items.duplicateIdentifier' : 'common.error'),
        );
      },
    });
  });

  return {
    form, warning, checkIdentifier, errorMessage, isPending, submit: onSubmit,
    selectedCategory, investors, locations,
  };
}

/** Full walk-in purchase page form (FR-25): seller, device, identifiers and price paid. */
export function WalkInPurchaseForm() {
  const { t } = useTranslation();
  const { data: categories = [] } = useCategories();
  const serializedCategories = categories.filter((c) => c.isSerialized);
  const formState = useWalkInPurchaseForm(serializedCategories);
  const { form } = formState;
  const errors = form.formState.errors;
  const attributes = useWatch({ control: form.control, name: 'attributes' }) || {};

  return (
    <form onSubmit={formState.submit} className="space-y-4 max-w-3xl">
      <FormError message={formState.errorMessage} />
      <DuplicateWarningBanner warning={formState.warning} />
      <WalkInSellerFields form={form} errors={errors} disabled={formState.isPending} />
      <WalkInModelFields
        form={form}
        categories={serializedCategories}
        investors={formState.investors}
        locations={formState.locations}
        disabled={formState.isPending}
      />
      {formState.selectedCategory && (
        <ItemDynamicAttributes
          attributes={formState.selectedCategory.attributes}
          values={attributes}
          onChange={(key, val) => form.setValue(`attributes.${key}`, val, { shouldValidate: true })}
          errors={errors}
          disabled={formState.isPending}
        />
      )}
      <ItemIdentifierInputs
        register={form.register}
        errors={errors}
        disabled={formState.isPending}
        onIdentifierBlur={(_, value) => formState.checkIdentifier(value)}
      />
      <PricePaidField
        register={form.register}
        errors={errors}
        disabled={formState.isPending}
      />
      <Button type="submit" disabled={formState.isPending} className="w-full sm:w-auto">
        {formState.isPending ? t('common.loading') : t('walkIn.submit')}
      </Button>
    </form>
  );
}
