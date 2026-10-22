import { z } from 'zod';

/** Creates localized Zod schema for user creation and edition. */
export function createUserFormSchema(isEditing: boolean, t: (key: string) => string) {
  return z.object({
    name: z
      .string()
      .trim()
      .min(1, { message: t('validation.nameRequired') })
      .min(2, { message: t('validation.nameMin') }),
    phone: z
      .string()
      .trim()
      .min(1, { message: t('validation.phoneRequired') })
      .min(7, { message: t('validation.phoneInvalid') }),
    password: isEditing
      ? z
          .string()
          .refine((val) => !val || val.length >= 6, {
            message: t('validation.passwordMin'),
          })
      : z
          .string()
          .min(1, { message: t('validation.passwordRequired') })
          .min(6, { message: t('validation.passwordMin') }),
    roleId: z
      .number()
      .positive({ message: t('validation.roleRequired') }),
    language: z.enum(['uz', 'ru', 'en'], {
      message: t('validation.languageRequired'),
    }),
  });
}

export type UserFormValues = z.infer<ReturnType<typeof createUserFormSchema>>;
