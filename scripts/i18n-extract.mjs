// i18n authoring helper (Phase 79 Theme E). Reports, per locale, the canonical
// (en-GB) keys that are still missing — the worklist that drives translation.
// Read-only; it never writes catalogs (translation stays a human/MT step).
//
//   node scripts/i18n-extract.mjs            # every non-canonical locale
//   node scripts/i18n-extract.mjs de-DE      # just one locale
//
// A plain .mjs (node-only, no build) like the sibling validator, whose pure
// helpers it reuses so the canonical key set has a single definition.

import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { CANONICAL_LOCALE, keyPaths, loadCatalogs } from './i18n-validate.mjs';

/** Canonical keys absent from `locale`'s catalog (the translation worklist). */
export function missingKeys(catalogs, locale) {
  const canonical = new Set(keyPaths(catalogs[CANONICAL_LOCALE] ?? {}));
  const present = new Set(keyPaths(catalogs[locale] ?? {}));
  return [...canonical].filter((k) => !present.has(k));
}

function main() {
  const only = process.argv[2];
  const messagesDir = join(dirname(fileURLToPath(import.meta.url)), '..', 'packages', 'web', 'messages');
  const { catalogs } = loadCatalogs(messagesDir);
  const locales = only ? [only] : Object.keys(catalogs).filter((l) => l !== CANONICAL_LOCALE);

  for (const locale of locales) {
    const missing = missingKeys(catalogs, locale);
    console.log(`\n${locale}: ${missing.length} key(s) missing vs ${CANONICAL_LOCALE}`);
    for (const k of missing) console.log(`  ${k}`);
  }
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) main();
