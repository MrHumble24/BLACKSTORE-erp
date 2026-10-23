import { useTranslation } from 'react-i18next';
import { useFormContext, useWatch } from 'react-hook-form';
import {
  FormField, FormItem, FormLabel, FormControl, FormMessage, FormDescription,
  Input, Switch, SelectField,
} from '@/shared/ui';
import { ATTRIBUTE_TYPE_LABELS, type AttributeType, type CategoryAttribute } from '@/entities/category';
import type { AttributeFormValues } from '../model/category.schema';

/** Options for the attribute type select. */
const TYPE_OPTIONS: AttributeType[] = ['TEXT', 'NUMBER', 'SELECT'];

interface FieldProps {
  disabled: boolean;
}

/** Key field; locks after creation because items store their values under it. */
function AttributeKeyField({ disabled, isEditing }: FieldProps & { isEditing: boolean }) {
  const { t } = useTranslation();
  const { control } = useFormContext<AttributeFormValues>();

  return (
    <FormField
      control={control}
      name="key"
      render={({ field }) => (
        <FormItem>
          <FormLabel>{t('categories.key')}</FormLabel>
          <FormControl>
            <Input disabled={disabled || isEditing} placeholder={t('categories.keyPlaceholder')} {...field} />
          </FormControl>
          <FormMessage />
        </FormItem>
      )}
    />
  );
}

/** Label field (display name of the attribute). */
function AttributeLabelField({ disabled }: FieldProps) {
  const { t } = useTranslation();
  const { control } = useFormContext<AttributeFormValues>();

  return (
    <FormField
      control={control}
      name="label"
      render={({ field }) => (
        <FormItem>
          <FormLabel>{t('categories.label')}</FormLabel>
          <FormControl>
            <Input disabled={disabled} placeholder={t('categories.labelPlaceholder')} {...field} />
          </FormControl>
          <FormMessage />
        </FormItem>
      )}
    />
  );
}

/** Type select; locks after creation (TEXT / NUMBER / SELECT). */
function AttributeTypeField({ disabled, isEditing }: FieldProps & { isEditing: boolean }) {
  const { t } = useTranslation();
  const { control } = useFormContext<AttributeFormValues>();

  return (
    <FormField
      control={control}
      name="type"
      render={({ field, fieldState }) => (
        <SelectField
          label={t('categories.attributeType')}
          value={field.value}
          onValueChange={field.onChange}
          disabled={disabled || isEditing}
          placeholder={t('categories.selectType')}
          error={fieldState.error?.message}
          options={TYPE_OPTIONS.map((opt) => ({
            value: opt,
            label: t(ATTRIBUTE_TYPE_LABELS[opt]),
          }))}
        />
      )}
    />
  );
}

/** Comma-separated options list, only relevant for SELECT attributes. */
function AttributeOptionsField({ disabled }: FieldProps) {
  const { t } = useTranslation();
  const { control } = useFormContext<AttributeFormValues>();
  // useWatch (not watch) so this isolated sibling re-renders when the Type
  // select changes — the type Controller lives in a separate component.
  const type = useWatch({ control, name: 'type' });

  if (type !== 'SELECT') {
    return null;
  }

  return (
    <FormField
      control={control}
      name="options"
      render={({ field }) => (
        <FormItem>
          <FormLabel>{t('categories.options')}</FormLabel>
          <FormControl>
            <Input disabled={disabled} placeholder={t('categories.optionsPlaceholder')} {...field} />
          </FormControl>
          <FormDescription>{t('categories.optionsHelp')}</FormDescription>
          <FormMessage />
        </FormItem>
      )}
    />
  );
}

/** Required toggle and sort order fields shared by create and edit. */
function AttributeExtraFields({ disabled }: FieldProps) {
  const { t } = useTranslation();
  const { control } = useFormContext<AttributeFormValues>();

  return (
    <>
      <FormField
        control={control}
        name="required"
        render={({ field }) => (
          <FormItem className="flex items-center justify-between gap-4">
            <FormLabel>{t('categories.requiredLabel')}</FormLabel>
            <FormControl>
              <Switch checked={field.value} onCheckedChange={field.onChange} disabled={disabled} />
            </FormControl>
          </FormItem>
        )}
      />
      <FormField
        control={control}
        name="sortOrder"
        render={({ field }) => (
          <FormItem>
            <FormLabel>{t('categories.order')}</FormLabel>
            <FormControl>
              <Input type="number" min={0} disabled={disabled} {...field} />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />
    </>
  );
}

interface AttributeFormFieldsProps {
  attribute: CategoryAttribute | null;
  disabled: boolean;
}

/** Fields for a category attribute; key and type lock after creation. */
export function AttributeFormFields({ attribute, disabled }: AttributeFormFieldsProps) {
  const isEditing = Boolean(attribute);

  return (
    <>
      <AttributeKeyField disabled={disabled} isEditing={isEditing} />
      <AttributeLabelField disabled={disabled} />
      <AttributeTypeField disabled={disabled} isEditing={isEditing} />
      <AttributeOptionsField disabled={disabled} />
      <AttributeExtraFields disabled={disabled} />
    </>
  );
}
