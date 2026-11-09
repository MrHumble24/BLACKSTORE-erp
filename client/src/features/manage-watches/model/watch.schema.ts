import { z } from 'zod';
import { POSITIVE_MONEY_PATTERN, normalizeMoney } from '@/shared/lib';
import type { CreateWatchPayload, UpdateWatchPayload, Watch } from '@/entities/watch';

const MAX_ALIASES = 30;
const MAX_ALIAS_LENGTH = 60;
/** Whole-part digit cap for maxPrice; mirrors the server Decimal(12,2) column. */
const MAX_PRICE_WHOLE_DIGITS = 10;

/** Empty, or a positive money string whose whole part fits the column. */
function isValidMaxPrice(raw: string): boolean {
  const v = raw.trim();
  return v === '' || (POSITIVE_MONEY_PATTERN.test(v) && v.split(/[.,]/)[0].length <= MAX_PRICE_WHOLE_DIGITS);
}

/** Splits the aliases textarea into trimmed, non-empty lines. */
export function parseAliases(text: string): string[] {
  return text.split('\n').map((line) => line.trim()).filter(Boolean);
}

/** Localized Zod schema for the watch form; limits mirror the server DTO. */
export function createWatchSchema(t: (k: string) => string) {
  return z.object({
    name: z.string().trim().min(1, { message: t('watches.validation.nameRequired') }).max(200),
    aliases: z
      .string()
      .refine((v) => parseAliases(v).length <= MAX_ALIASES, { message: t('watches.validation.tooManyAliases') })
      .refine((v) => parseAliases(v).every((a) => a.length <= MAX_ALIAS_LENGTH), {
        message: t('watches.validation.aliasTooLong'),
      }),
    // '' = no product model linked.
    productModelId: z.string(),
    maxPrice: z
      .string()
      .refine(isValidMaxPrice, { message: t('watches.validation.maxPriceInvalid') }),
    currency: z.enum(['USD', 'UZS']),
  });
}

export type WatchFormValues = z.infer<ReturnType<typeof createWatchSchema>>;

/** Form defaults: empty for create, the watch's values for edit. */
export function watchToFormValues(watch: Watch | null): WatchFormValues {
  return {
    name: watch?.name ?? '',
    aliases: watch?.aliases.join('\n') ?? '',
    productModelId: watch?.productModelId ? String(watch.productModelId) : '',
    maxPrice: watch?.maxPrice ?? '',
    currency: watch?.currency ?? 'USD',
  };
}

/** Builds the PATCH body; empty optional fields become null so an edit can clear them. */
export function toUpdatePayload(values: WatchFormValues): UpdateWatchPayload {
  return {
    name: values.name.trim(),
    aliases: parseAliases(values.aliases),
    productModelId: values.productModelId ? Number(values.productModelId) : null,
    maxPrice: values.maxPrice.trim() ? normalizeMoney(values.maxPrice) : null,
    currency: values.currency,
  };
}

/** Builds the POST body; empty optional fields are left out. */
export function toCreatePayload(values: WatchFormValues): CreateWatchPayload {
  const payload: CreateWatchPayload = {
    name: values.name.trim(),
    aliases: parseAliases(values.aliases),
    currency: values.currency,
  };
  if (values.productModelId) payload.productModelId = Number(values.productModelId);
  if (values.maxPrice.trim()) payload.maxPrice = normalizeMoney(values.maxPrice);
  return payload;
}
