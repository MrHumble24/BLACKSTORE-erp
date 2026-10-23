/** Cyrillic-to-Latin transliteration map for generating snake_case keys. */
const CYRILLIC_MAP: Record<string, string> = {
  а: 'a', б: 'b', в: 'v', г: 'g', д: 'd', е: 'e', ё: 'yo', ж: 'zh',
  з: 'z', и: 'i', й: 'y', к: 'k', л: 'l', м: 'm', н: 'n', о: 'o',
  п: 'p', р: 'r', с: 's', т: 't', у: 'u', ф: 'f', х: 'kh', ц: 'ts',
  ч: 'ch', ш: 'sh', щ: 'shch', ъ: '', ы: 'y', ь: '', э: 'e', ю: 'yu',
  я: 'ya', є: 'ye', і: 'i', ї: 'yi', ґ: 'g',
};

/**
 * Converts a localized attribute title/label into a valid snake_case key.
 * Ensures the result starts with [a-z], contains only [a-z0-9_], and is <= 50 chars.
 */
export function slugifyAttributeKey(title: string): string {
  if (!title) return '';

  let text = title.toLowerCase();
  // Transliterate Cyrillic characters
  text = text.replace(/[\u0400-\u04FF]/g, (char) => CYRILLIC_MAP[char] ?? char);
  // Strip Uzbek / typographical apostrophes and quotes (e.g. o'lcham -> olcham)
  text = text.replace(/['’‘ʻ`"]/g, '');
  // Replace non-alphanumeric characters with underscores
  text = text.replace(/[^a-z0-9]+/g, '_');
  // Attribute key must start with a lowercase letter [a-z]
  text = text.replace(/^[^a-z]+/, '');
  // Remove trailing underscores
  text = text.replace(/_+$/, '');

  return text.slice(0, 50).replace(/_+$/, '');
}
