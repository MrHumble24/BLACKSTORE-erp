import { z } from 'zod';

/** Creates a localized Zod schema for the location form (name + type). */
export function createLocationSchema(t: (k: string) => string) {
  return z.object({
    name: z.string().trim().min(1, { message: t('validation.nameRequired') }),
    type: z.enum(['WAREHOUSE', 'SHOP'], {
      message: t('locations.validation.typeRequired'),
    }),
  });
}

export type LocationFormValues = z.infer<ReturnType<typeof createLocationSchema>>;
