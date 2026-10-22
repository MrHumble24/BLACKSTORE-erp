import { useTranslation } from 'react-i18next';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Form, DialogFormFooter, FormError } from '@/shared/ui';
import { useCreateOrUpdate } from '@/shared/lib';
import {
  useCreateProductModel,
  useUpdateProductModel,
  type ProductModel,
} from '@/entities/product-model';
import {
  createProductModelSchema,
  type ProductModelFormValues,
} from '../model/product-model.schema';
import { ProductModelFormFields } from './ProductModelFormFields';

interface ProductModelFormContentProps {
  productModel: ProductModel | null;
  /** Preset category for create mode (category detail page); ignored while editing. */
  defaultCategoryId?: number;
  onClose: () => void;
}

/** Form setup for the product model dialog (localized schema + defaults). */
function useProductModelForm(
  t: (k: string) => string,
  productModel: ProductModel | null,
  defaultCategoryId?: number,
) {
  return useForm<ProductModelFormValues>({
    resolver: zodResolver(createProductModelSchema(t)),
    defaultValues: {
      categoryId: productModel?.categoryId ?? defaultCategoryId ?? 0,
      name: productModel?.name ?? '',
    },
  });
}

/** shadcn form body for creating and editing product models. */
export function ProductModelFormContent({
  productModel,
  defaultCategoryId,
  onClose,
}: ProductModelFormContentProps) {
  const { t } = useTranslation();
  const { mutate: create, isPending: isCreating } = useCreateProductModel();
  const { mutate: update, isPending: isUpdating } = useUpdateProductModel();

  const { submit, apiError, isPending } = useCreateOrUpdate({
    create: (p: { categoryId: number; name: string }, opt) => create(p, opt),
    update: (p: { name: string }, opt) => {
      if (productModel) update({ id: productModel.id, payload: p }, opt);
    },
    isPending: isCreating || isUpdating,
    isEditing: Boolean(productModel),
    successMessage: t(productModel ? 'productModels.updatedSuccess' : 'productModels.createdSuccess'),
    onDone: onClose,
  });

  const form = useProductModelForm(t, productModel, defaultCategoryId);

  const onSubmit = form.handleSubmit((values) => {
    submit(
      { categoryId: values.categoryId, name: values.name.trim() },
      { name: values.name.trim() },
    );
  });

  return (
    <Form {...form}>
      <form onSubmit={onSubmit} className="space-y-4 pt-2">
        <FormError message={apiError} />
        <ProductModelFormFields disabled={isPending} isEditing={Boolean(productModel)} />
        <DialogFormFooter onClose={onClose} isPending={isPending} />
      </form>
    </Form>
  );
}

