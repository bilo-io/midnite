// i18n catalog validator (Phase 79 Theme E). A plain .mjs so it runs with only
// node on a CI runner (no build step), mirroring the other repo scripts.
//
// Canonical locale is en-GB. The gate fails on:
//   • orphan keys — a key present in a non-canonical catalog but NOT in en-GB
//     (a typo or a stale key left after an en-GB rename); catches drift both ways.
//   • missing keys in a locale declared `complete` in its sidecar meta (fr-FR).
//   • stale needs-review entries — a meta key that no longer exists in en-GB.
// Locales left intentionally incomplete (de-DE, es-ES — empty, they fall back to
// en-GB via the provider until Theme E's follow-up seeds them) are reported for
// coverage but never fail the build.
//
// The pure helpers are exported for the unit test (see the sibling .d.mts);
// `main()` runs only when invoked directly.

import { readFileSync, readdirSync, existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

export const CANONICAL_LOCALE = 'en-GB';

/** Recursively collect the dotted key paths of a nested catalog. */
export function keyPaths(obj, prefix = '') {
  return Object.entries(obj).flatMap(([k, v]) => {
    const path = prefix ? `${prefix}.${k}` : k;
    return v && typeof v === 'object' && !Array.isArray(v) ? keyPaths(v, path) : [path];
  });
}

/**
 * Validate catalogs against the canonical (en-GB) key set.
 *
 * @param {{ catalogs: Record<string, Record<string, unknown>>, meta?: Record<string, { complete?: boolean, needsReview?: string[] }> }} input
 * @returns {{ ok: boolean, errors: string[], coverage: Record<string, { translated: number, total: number }> }}
 */
export function validateCatalogs({ catalogs, meta = {} }) {
  const errors = [];
  const coverage = {};
  const canonical = catalogs[CANONICAL_LOCALE];
  if (!canonical) {
    return { ok: false, errors: [`missing canonical catalog "${CANONICAL_LOCALE}"`], coverage };
  }
  const canonicalKeys = keyPaths(canonical);
  const canonicalSet = new Set(canonicalKeys);

  for (const [locale, catalog] of Object.entries(catalogs)) {
    const keys = keyPaths(catalog);
    coverage[locale] = { translated: keys.filter((k) => canonicalSet.has(k)).length, total: canonicalSet.size };
    if (locale === CANONICAL_LOCALE) continue;

    for (const k of keys) {
      if (!canonicalSet.has(k)) errors.push(`${locale}: orphan key not in ${CANONICAL_LOCALE}: ${k}`);
    }
    if (meta[locale]?.complete) {
      const present = new Set(keys);
      for (const k of canonicalKeys) {
        if (!present.has(k)) errors.push(`${locale}: missing key (locale is declared complete): ${k}`);
      }
    }
    for (const k of meta[locale]?.needsReview ?? []) {
      if (!canonicalSet.has(k)) errors.push(`${locale}: stale needs-review key not in ${CANONICAL_LOCALE}: ${k}`);
    }
  }
  return { ok: errors.length === 0, errors, coverage };
}

/** Load every `<locale>.json` catalog + optional `meta/<locale>.json` sidecar. */
export function loadCatalogs(messagesDir) {
  const catalogs = {};
  const meta = {};
  for (const file of readdirSync(messagesDir)) {
    if (!file.endsWith('.json')) continue;
    const locale = file.replace(/\.json$/, '');
    catalogs[locale] = JSON.parse(readFileSync(join(messagesDir, file), 'utf8'));
  }
  const metaDir = join(messagesDir, 'meta');
  if (existsSync(metaDir)) {
    for (const file of readdirSync(metaDir)) {
      if (!file.endsWith('.json')) continue;
      meta[file.replace(/\.json$/, '')] = JSON.parse(readFileSync(join(metaDir, file), 'utf8'));
    }
  }
  return { catalogs, meta };
}

function main() {
  const messagesDir = join(dirname(fileURLToPath(import.meta.url)), '..', 'packages', 'web', 'messages');
  const { catalogs, meta } = loadCatalogs(messagesDir);
  const { ok, errors, coverage } = validateCatalogs({ catalogs, meta });

  console.log('i18n catalog coverage (vs en-GB):');
  for (const [locale, { translated, total }] of Object.entries(coverage)) {
    const pct = total === 0 ? 100 : Math.round((translated / total) * 100);
    const flag = meta[locale]?.complete ? ' [complete]' : locale === CANONICAL_LOCALE ? ' [canonical]' : '';
    console.log(`  ${locale.padEnd(6)} ${String(pct).padStart(3)}%  (${translated}/${total})${flag}`);
  }
  if (!ok) {
    console.error(`\n✖ i18n:validate failed — ${errors.length} problem(s):`);
    for (const e of errors) console.error(`  • ${e}`);
    process.exit(1);
  }
  console.log('\n✓ i18n:validate passed (no key drift; complete locales at full parity).');
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) main();
