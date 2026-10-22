#!/usr/bin/env node
/**
 * i18n parity check: every locale file must declare exactly the same keys as uz.json
 * (same nesting, same dots-joined key paths). Prints missing or extra keys per language
 * and exits 1 when any file differs from the reference.
 */
import process from 'node:process';
import { readdir, readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const LOCALES_DIR = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  '..',
  'src',
  'shared',
  'i18n',
  'locales',
);
const REFERENCE = 'uz';

/** Flattens nested locale objects into dot-joined key paths, e.g. "items.status.SOLD". */
function leafKeys(node, prefix = '', acc = []) {
  for (const [key, value] of Object.entries(node)) {
    const keyPath = prefix ? `${prefix}.${key}` : key;
    if (value !== null && typeof value === 'object') leafKeys(value, keyPath, acc);
    else acc.push(keyPath);
  }
  return acc;
}

/** Lists keys present in the reference but absent here, and vice versa. */
function diff(referenceKeys, keys) {
  const referenceSet = new Set(referenceKeys);
  const keySet = new Set(keys);
  return {
    missing: referenceKeys.filter((key) => !keySet.has(key)),
    extra: keys.filter((key) => !referenceSet.has(key)),
  };
}

/** Loads one locale file and returns its name plus flattened key paths. */
async function loadLocale(name) {
  const content = await readFile(path.join(LOCALES_DIR, `${name}.json`), 'utf8');
  return { name, keys: leafKeys(JSON.parse(content)) };
}

/** Prints the parity result for one language. Returns true when it differs. */
function report(language, keys, { missing, extra }) {
  if (missing.length === 0 && extra.length === 0) {
    console.log(`${language}: OK (${keys.length} keys match ${REFERENCE})`);
    return false;
  }
  console.error(`${language}: differs from ${REFERENCE}`);
  for (const [label, list] of [['missing', missing], ['extra', extra]]) {
    if (list.length > 0) {
      console.error(`  ${label} (${list.length}):`);
      for (const key of list) console.error(`    - ${key}`);
    }
  }
  return true;
}

async function main() {
  const files = (await readdir(LOCALES_DIR)).filter((file) => file.endsWith('.json'));
  const locales = (await Promise.all(files.map((file) => loadLocale(path.basename(file, '.json')))))
    .sort((a, b) => a.name.localeCompare(b.name));
  const reference = locales.find((locale) => locale.name === REFERENCE);

  let hasDifferences = false;
  for (const locale of locales) {
    if (locale.name === REFERENCE) continue;
    hasDifferences = report(locale.name, locale.keys, diff(reference.keys, locale.keys)) || hasDifferences;
  }

  if (hasDifferences) process.exit(1);
}

await main();
