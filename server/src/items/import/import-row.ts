import { ItemCondition, IdentifierType } from '@prisma/client';
import { MONEY_REGEX } from '../../common/money';
import type { AttributeDef } from '../item-validation';
import { validateAttributes, validateIdentifier } from '../item-validation';

/** Fixed template columns, in the order the template writes them (FR-7). */
export const FIXED_COLUMNS = [
  'category', 'model', 'identifier', 'owner_code', 'location',
  'condition', 'purchase_price', 'sale_price', 'min_sale_price',
] as const;
const FIXED_SET = new Set<string>(FIXED_COLUMNS);

const REQUIRED_COLUMNS = ['category', 'model', 'identifier', 'owner_code', 'location'] as const;

/** One serialized category with its models (lower-cased name → id) and attribute defs. */
export interface CategoryInfo {
  id: number;
  isSerialized: boolean;
  attributes: AttributeDef[];
  models: Map<string, number>;
}

/** Master-data lookups the parser needs; built once per import from the DB. */
export interface ImportContext {
  categories: Map<string, CategoryInfo>; // lower-cased category name → info
  investors: Map<string, { id: number; isActive: boolean }>; // upper-cased code → investor
  locations: Map<string, { id: number; isActive: boolean }>; // lower-cased name → location
  attributeKeys: Set<string>; // every category attribute key (lower-cased), for unknown-column detection
}

/** A spreadsheet row reduced to header → trimmed cell text. */
export type RawRow = Record<string, string>;

/** Fields needed to create one item, matching the shape ItemsService.create accepts. */
export interface ImportItemInput {
  productModelId: number;
  investorId: number;
  locationId: number;
  condition?: ItemCondition;
  attributes: Record<string, string | number>;
  identifiers: { type: IdentifierType; value: string }[];
  purchasePrice?: string;
  salePrice?: string;
  minSalePrice?: string;
}

export type ParsedRow = { ok: true; input: ImportItemInput } | { ok: false; message: string };

/** Validates the header: required columns present, and every column known (fixed or an attribute). */
export function validateHeader(headers: string[], attributeKeys: Set<string>): string | null {
  const cols = headers.map((h) => h.trim().toLowerCase()).filter((h) => h.length > 0);
  for (const required of REQUIRED_COLUMNS) {
    if (!cols.includes(required)) return `Missing required column "${required}"`;
  }
  for (const col of cols) {
    if (!FIXED_SET.has(col) && !attributeKeys.has(col)) return `Unknown column "${col}"`;
  }
  return null;
}

/** IMEI when the value is all digits (validated to 15), otherwise a SERIAL. */
function identifierType(value: string): IdentifierType {
  return /^\d+$/.test(value) ? IdentifierType.IMEI : IdentifierType.SERIAL;
}

/** Collects non-fixed columns into an attribute map, typing NUMBER attributes to numbers. */
function readAttributes(raw: RawRow, category: CategoryInfo): Record<string, string | number> {
  const defByKey = new Map(category.attributes.map((d) => [d.key.toLowerCase(), d]));
  const attributes: Record<string, string | number> = {};
  for (const [header, value] of Object.entries(raw)) {
    const key = header.trim().toLowerCase();
    if (FIXED_SET.has(key) || value === '') continue;
    const def = defByKey.get(key);
    if (def && def.type === 'NUMBER') attributes[def.key] = Number(value);
    else attributes[def ? def.key : header] = value; // unknown-for-this-category → validateAttributes rejects
  }
  return attributes;
}

/**
 * Validates one row against the master data and returns the item input, or a message.
 * `seen` holds identifier values already used earlier in the file (duplicate → error).
 */
export function parseRow(raw: RawRow, ctx: ImportContext, seen: Set<string>): ParsedRow {
  try {
    const category = ctx.categories.get((raw.category ?? '').trim().toLowerCase());
    if (!category) return err(`Unknown category "${raw.category ?? ''}"`);
    if (!category.isSerialized) return err(`Category "${raw.category}" is not serialized`);

    const productModelId = category.models.get((raw.model ?? '').trim().toLowerCase());
    if (!productModelId) return err(`Model "${raw.model ?? ''}" not found in category "${raw.category}"`);

    const investor = ctx.investors.get((raw.owner_code ?? '').trim().toUpperCase());
    if (!investor) return err(`Unknown owner code "${raw.owner_code ?? ''}"`);
    if (!investor.isActive) return err(`Owner "${raw.owner_code}" is inactive`);

    const location = ctx.locations.get((raw.location ?? '').trim().toLowerCase());
    if (!location) return err(`Unknown location "${raw.location ?? ''}"`);
    if (!location.isActive) return err(`Location "${raw.location}" is inactive`);

    const rawId = (raw.identifier ?? '').trim();
    if (!rawId) return err('identifier is required');
    const value = validateIdentifier(identifierType(rawId), rawId);
    if (seen.has(value)) return err(`Identifier "${value}" appears more than once in the file`);
    seen.add(value);

    const condition = parseCondition(raw.condition);
    const prices = parsePrices(raw);
    const attributes = validateAttributes(readAttributes(raw, category), category.attributes);

    return {
      ok: true,
      input: {
        productModelId,
        investorId: investor.id,
        locationId: location.id,
        condition,
        attributes: attributes as Record<string, string | number>,
        identifiers: [{ type: identifierType(rawId), value }],
        ...prices,
      },
    };
  } catch (e) {
    return err(e instanceof Error ? e.message : 'Invalid row');
  }
}

function err(message: string): ParsedRow {
  return { ok: false, message };
}

/** NEW/USED (case-insensitive); empty → undefined (ItemsService defaults to NEW). */
function parseCondition(value?: string): ItemCondition | undefined {
  const text = (value ?? '').trim().toUpperCase();
  if (!text) return undefined;
  if (text !== ItemCondition.NEW && text !== ItemCondition.USED) {
    throw new Error(`condition must be NEW or USED, got "${value}"`);
  }
  return text;
}

/** Validates the three optional price columns as decimal strings. */
function parsePrices(raw: RawRow): Pick<ImportItemInput, 'purchasePrice' | 'salePrice' | 'minSalePrice'> {
  const pick = (header: string, label: string): string | undefined => {
    const text = (raw[header] ?? '').trim();
    if (!text) return undefined;
    if (!MONEY_REGEX.test(text)) throw new Error(`${label} must be a non-negative decimal`);
    return text;
  };
  return {
    purchasePrice: pick('purchase_price', 'purchase_price'),
    salePrice: pick('sale_price', 'sale_price'),
    minSalePrice: pick('min_sale_price', 'min_sale_price'),
  };
}
