import { useTranslation } from 'react-i18next';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Form, DialogFormFooter, FormError } from '@/shared/ui';
import { useCreateOrUpdate } from '@/shared/lib';
import {
  useCreateAttribute,
  useUpdateAttribute,
  type CategoryAttribute,
  type CreateAttributePayload,
  type UpdateAttributePayload,
} from '@/entities/category';
import { createAttributeSchema, type AttributeFormValues } from '../model/category.schema';
import { AttributeFormFields } from './AttributeFormFields';

interface AttributeFormContentProps {
  categoryId: number;
  attribute: CategoryAttribute | null;
  onClose: () => void;
}

/** Form setup for the attribute dialog (localized schema + defaults per create/edit). */
function useAttributeForm(t: (k: string) => string, attribute: CategoryAttribute | null) {
  return useForm<AttributeFormValues>({
    resolver: zodResolver(createAttributeSchema(t)),
    defaultValues: {
      key: attribute?.key ?? '',
      label: attribute?.label ?? '',
      type: attribute?.type ?? 'TEXT',
      options: (attribute?.options ?? []).join(', '),
      required: attribute?.required ?? false,
      sortOrder: attribute ? String(attribute.sortOrder) : '0',
    },
  });
}

/** Builds the API payload from sanitized form values (SELECT-only options list). */
function buildPayload(values: AttributeFormValues, isEditing: boolean) {
  const options =
    values.type === 'SELECT'
      ? values.options.split(',').map((v) => v.trim()).filter(Boolean)
      : undefined;
  const sortOrder = values.sortOrder === '' ? undefined : Number(values.sortOrder);

  return isEditing
    ? { label: values.label.trim(), options, required: values.required, sortOrder }
    : {
        key: values.key.trim(),
        label: values.label.trim(),
        type: values.type,
        options,
        required: values.required,
        sortOrder,
      };
}

/** shadcn form body for category attributes; key and type are read-only while editing. */
export function AttributeFormContent({ categoryId, attribute, onClose }: AttributeFormContentProps) {
  const { t } = useTranslation();
  const isEditing = Boolean(attribute);

  const { mutate: create, isPending: isCreating } = useCreateAttribute();
  const { mutate: update, isPending: isUpdating } = useUpdateAttribute();

  const { submit, apiError, isPending } = useCreateOrUpdate({
    create: (p: CreateAttributePayload, opt) => create({ categoryId, payload: p }, opt),
    update: (p: UpdateAttributePayload, opt) => {
      if (attribute) update({ categoryId, attributeId: attribute.id, payload: p }, opt);
    },
    isPending: isCreating || isUpdating,
    isEditing,
    successMessage: t(isEditing ? 'categories.updatedSuccess' : 'categories.attributeCreated'),
    onDone: onClose,
  });

  const form = useAttributeForm(t, attribute);

  const onSubmit = form.handleSubmit((values) => {
    const payload = buildPayload(values, isEditing);
    submit(payload as CreateAttributePayload, payload as UpdateAttributePayload);
  });

  return (
    <Form {...form}>
      <form onSubmit={onSubmit} className="space-y-4 pt-2">
        <FormError message={apiError} />
        <AttributeFormFields attribute={attribute} disabled={isPending} />
        <DialogFormFooter onClose={onClose} isPending={isPending} />
      </form>
    </Form>
  );
}

