import { useTranslation } from 'react-i18next';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Form, DialogFormFooter, FormError } from '@/shared/ui';
import { useCreateOrUpdate } from '@/shared/lib';
import {
  useCreateCategory,
  useUpdateCategory,
  type Category,
  type CreateCategoryPayload,
  type UpdateCategoryPayload,
} from '@/entities/category';
import { createCategorySchema, type CategoryFormValues } from '../model/category.schema';
import { CategoryFormFields } from './CategoryFormFields';

interface CategoryFormContentProps {
  category: Category | null;
  onClose: () => void;
}

/** shadcn form body for creating and editing categories; API 400s show in the form. */
export function CategoryFormContent({ category, onClose }: CategoryFormContentProps) {
  const { t } = useTranslation();
  const { mutate: create, isPending: isCreating } = useCreateCategory();
  const { mutate: update, isPending: isUpdating } = useUpdateCategory();

  const { submit, apiError, isPending } = useCreateOrUpdate({
    create: (p: CreateCategoryPayload, opt) => create(p, opt),
    update: (p: UpdateCategoryPayload, opt) => {
      if (category) update({ id: category.id, payload: p }, opt);
    },
    isPending: isCreating || isUpdating,
    isEditing: Boolean(category),
    successMessage: t(category ? 'categories.updatedSuccess' : 'categories.createdSuccess'),
    onDone: onClose,
  });

  const form = useForm<CategoryFormValues>({
    resolver: zodResolver(createCategorySchema(t)),
    defaultValues: {
      name: category?.name ?? '',
      isSerialized: category?.isSerialized ?? true,
    },
  });

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit((v) => submit(v))} className="space-y-4 pt-2">
        <FormError message={apiError} />
        <CategoryFormFields disabled={isPending} />
        <DialogFormFooter onClose={onClose} isPending={isPending} />
      </form>
    </Form>
  );
}

