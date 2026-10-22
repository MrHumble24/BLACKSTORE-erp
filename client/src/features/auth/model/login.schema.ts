// Forms use react-hook-form + @hookform/resolvers + zod on purpose: they are the base of shadcn forms and F02 has bigger forms.
import { z } from 'zod';

/** Creates localized Zod schema for login form validation. */
export function createLoginSchema(t: (key: string) => string) {
  return z.object({
    phone: z
      .string()
      .trim()
      .min(1, { message: t('validation.phoneRequired') })
      .min(7, { message: t('validation.phoneInvalid') }),
    password: z
      .string()
      .min(1, { message: t('validation.passwordRequired') }),
  });
}

export type LoginFormValues = z.infer<ReturnType<typeof createLoginSchema>>;
