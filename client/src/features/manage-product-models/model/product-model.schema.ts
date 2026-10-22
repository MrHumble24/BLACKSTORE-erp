import { z } from 'zod';

/** Creates a localized Zod schema for the product model form (category + name). */
export function createProductModelSchema(t: (k: string) => string) {
  return z.object({
    categoryId: z.number({ message: t('items.validation.categoryRequired') }).positive().int(),
    name: z.string().trim().min(1, { message: t('productModels.validation.nameRequired') }),
  });
}

export type ProductModelFormValues = z.infer<ReturnType<typeof createProductModelSchema>>;
