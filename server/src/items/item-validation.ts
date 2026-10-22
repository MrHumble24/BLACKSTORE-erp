import { BadRequestException } from '@nestjs/common';
import { AttributeType, IdentifierType, ItemStatus, Prisma } from '@prisma/client';

/** Shape of a category attribute definition used for validation. */
export interface AttributeDef {
  key: string;
  type: AttributeType;
  options: string[];
  required: boolean;
}

/** Prisma select for the attribute-definition fields that back AttributeDef. */
export const attributeDefSelect = {
  key: true,
  type: true,
  options: true,
  required: true,
} satisfies Prisma.CategoryAttributeSelect;

/**
 * Validates an attribute map against a category's definitions (FR-3):
 * unknown keys → 400, required keys must be present, SELECT must be in options,
 * NUMBER must be numeric, TEXT a string ≤ 200 chars. Returns the cleaned map.
 */
export function validateAttributes(
  attributes: Record<string, unknown> | undefined,
  defs: AttributeDef[],
): Prisma.InputJsonObject {
  const input = attributes ?? {};
  const known = new Set(defs.map((d) => d.key));
  for (const key of Object.keys(input)) {
    if (!known.has(key)) throw new BadRequestException(`Unknown attribute "${key}"`);
  }
  const result: Record<string, string | number> = {};
  for (const def of defs) {
    const value = input[def.key];
    if (value === undefined || value === null) {
      if (def.required) throw new BadRequestException(`Attribute "${def.key}" is required`);
      continue;
    }
    result[def.key] = validateAttributeValue(def, value);
  }
  return result;
}

function validateAttributeValue(def: AttributeDef, value: unknown): string | number {
  switch (def.type) {
    case AttributeType.NUMBER:
      if (typeof value !== 'number' || Number.isNaN(value)) {
        throw new BadRequestException(`Attribute "${def.key}" must be a number`);
      }
      return value;
    case AttributeType.SELECT:
      if (typeof value !== 'string' || !def.options.includes(value)) {
        throw new BadRequestException(
          `Attribute "${def.key}" must be one of: ${def.options.join(', ')}`,
        );
      }
      return value;
    default:
      if (typeof value !== 'string' || value.length > 200) {
        throw new BadRequestException(`Attribute "${def.key}" must be a string up to 200 chars`);
      }
      return value;
  }
}

const IMEI_RE = /^\d{15}$/;
const CODE_RE = /^[A-Z0-9-]{4,40}$/;

/** Trims and upper-cases an identifier value before save and lookup (FR-2). */
export function normalizeIdentifier(value: string): string {
  return value.trim().toUpperCase();
}

/** Normalizes and format-checks one identifier; returns the value to store. */
export function validateIdentifier(type: IdentifierType, rawValue: string): string {
  const value = normalizeIdentifier(rawValue);
  if (type === IdentifierType.IMEI) {
    if (!IMEI_RE.test(value)) throw new BadRequestException('IMEI must be 15 digits');
  } else if (!CODE_RE.test(value)) {
    throw new BadRequestException(`${type} must be 4–40 chars of A-Z, 0-9 and -`);
  }
  return value;
}

// Per-item identifier caps: dual-SIM phones allow two IMEIs, one SERIAL, one SYSTEM_CODE.
const IDENTIFIER_CAPS: Record<IdentifierType, number> = {
  [IdentifierType.IMEI]: 2,
  [IdentifierType.SERIAL]: 1,
  [IdentifierType.SYSTEM_CODE]: 1,
};

/** 400 if adding newTypes to existingTypes would exceed any per-type cap. */
export function assertIdentifierCaps(
  newTypes: IdentifierType[],
  existingTypes: IdentifierType[],
): void {
  const count = (types: IdentifierType[], t: IdentifierType) =>
    types.filter((x) => x === t).length;
  for (const type of Object.keys(IDENTIFIER_CAPS) as IdentifierType[]) {
    if (count(existingTypes, type) + count(newTypes, type) > IDENTIFIER_CAPS[type]) {
      throw new BadRequestException(`An item may have at most ${IDENTIFIER_CAPS[type]} ${type}`);
    }
  }
}

/** On create an item needs at least one IMEI or SERIAL (FR-2). */
export function assertHasPrimaryIdentifier(types: IdentifierType[]): void {
  if (!types.some((t) => t === IdentifierType.IMEI || t === IdentifierType.SERIAL)) {
    throw new BadRequestException('An item needs at least one IMEI or SERIAL');
  }
}

/** minSalePrice must not exceed salePrice when both are set. */
export function assertPriceOrder(salePrice?: string | null, minSalePrice?: string | null): void {
  if (salePrice == null || minSalePrice == null) return;
  if (new Prisma.Decimal(minSalePrice).gt(new Prisma.Decimal(salePrice))) {
    throw new BadRequestException('minSalePrice must not exceed salePrice');
  }
}

// BR-9 allowed status moves; anything else is rejected by changeStatus.
export const STATUS_TRANSITIONS: Record<ItemStatus, ItemStatus[]> = {
  [ItemStatus.IN_STOCK]: [ItemStatus.AT_PARTNER, ItemStatus.DEBT, ItemStatus.SOLD],
  [ItemStatus.AT_PARTNER]: [ItemStatus.IN_STOCK, ItemStatus.DEBT, ItemStatus.SOLD],
  // RETURNED is REQUIRED BY BR-9 (walk-in/return path): a debt sale can be returned
  // before it is fully paid, as well as moved to SOLD once the debt is collected.
  [ItemStatus.DEBT]: [ItemStatus.SOLD, ItemStatus.RETURNED],
  // BR-9 requires "Sold → In stock only through a walk-in buy-back": the only caller
  // that may take this move is the walk-in buy-back path (enforced by convention).
  [ItemStatus.SOLD]: [ItemStatus.RETURNED, ItemStatus.IN_STOCK],
  [ItemStatus.RETURNED]: [ItemStatus.IN_STOCK, ItemStatus.DEFECTIVE],
  [ItemStatus.DEFECTIVE]: [],
};

// Statuses where edits are "past records" and need edit_past_records (FR-29).
export const LOCKED_STATUSES: ItemStatus[] = [
  ItemStatus.DEBT,
  ItemStatus.SOLD,
  ItemStatus.RETURNED,
  ItemStatus.DEFECTIVE,
];
