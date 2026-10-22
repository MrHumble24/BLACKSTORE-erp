import { z } from 'zod';

/** Creates a localized Zod schema for the category form (name + serialization switch). */
export function createCategorySchema(t: (k: string) => string) {
  return z.object({
    name: z.string().trim().min(1, { message: t('validation.nameRequired') }),
    isSerialized: z.boolean(),
  });
}

export type CategoryFormValues = z.infer<ReturnType<typeof createCategorySchema>>;

const ATTRIBUTE_TYPES = ['TEXT', 'NUMBER', 'SELECT'] as const;

function validateSelectOptions(
  options: string,
  ctx: z.RefinementCtx,
  t: (k: string) => string,
) {
  const items = options.split(',').map((v) => v.trim()).filter(Boolean);
  if (items.length === 0) {
    ctx.addIssue({ code: 'custom', path: ['options'], message: t('categories.validation.optionsRequired') });
    return;
  }
  if (items.length > 50) {
    ctx.addIssue({ code: 'custom', path: ['options'], message: t('categories.validation.optionsMaxCount') });
    return;
  }
  if (items.some((item) => item.length > 50)) {
    ctx.addIssue({ code: 'custom', path: ['options'], message: t('categories.validation.optionsMaxLength') });
  }
}

/** Localized value for labelTextKey: "categories.label" etc., resolved by the caller via t(). */
export function createAttributeSchema(t: (k: string) => string) {
  return z
    .object({
      key: z
        .string()
        .trim()
        .min(1, { message: t('categories.validation.keyRequired') })
        .max(50, { message: t('categories.validation.keyMax') })
        .regex(/^[a-z][a-z0-9_]*$/, { message: t('categories.validation.keyFormat') }),
      label: z
        .string()
        .trim()
        .min(1, { message: t('categories.validation.labelRequired') })
        .max(100, { message: t('categories.validation.labelMax') }),
      type: z.enum(ATTRIBUTE_TYPES, { message: t('categories.validation.typeRequired') }),
      options: z.string(),
      required: z.boolean(),
      sortOrder: z
        .string()
        .refine((v) => /^\d+$/.test(v) || v === '', { message: t('categories.validation.orderInvalid') }),
    })
    .superRefine((values, ctx) => {
      if (values.type === 'SELECT') {
        validateSelectOptions(values.options, ctx, t);
      }
    });
}

export type AttributeFormValues = z.infer<ReturnType<typeof createAttributeSchema>>;
