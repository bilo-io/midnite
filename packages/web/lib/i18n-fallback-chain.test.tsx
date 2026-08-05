import { render, screen } from '@testing-library/react';
import { LocaleProvider } from '@midnite/shell';
import { DEFAULT_LOCALE, SUPPORTED_LOCALES, type Locale } from '@midnite/shared';
import { useTranslations } from 'next-intl';
import { afterEach, describe, expect, it, vi } from 'vitest';

import enGB from '@/messages/en-GB';
import { CATALOGS } from '@/i18n/messages';
import deMeta from '@/messages/meta/de-DE.json';
import esMeta from '@/messages/meta/es-ES.json';
import frMeta from '@/messages/meta/fr-FR.json';

const META: Partial<Record<Locale, { complete?: boolean }>> = {
  'de-DE': deMeta,
  'es-ES': esMeta,
  'fr-FR': frMeta,
};

/**
 * Phase 82 Theme F — Phase 79's "four locales load, en-GB is the fallback" check,
 * absorbed and made permanent.
 *
 * `i18n-surfaces.test.tsx` already spot-checks the de-DE fallback on five hand-picked
 * keys. That was right for Phase 79's five namespaces; there are now twenty-five, and
 * es-ES was never covered at all. So this sweep is **derived from the catalog** rather
 * than from a list: it picks a representative leaf out of every en-GB namespace, so a
 * namespace added by a future slice is covered the day it lands and cannot silently
 * escape the fallback guarantee.
 *
 * What "fallback works" has to mean, concretely:
 *  - the rendered text equals the **en-GB copy**, not the raw dotted key (next-intl's
 *    failure mode is to render the key, which looks like a typo rather than a bug), and
 *  - nothing is logged — a missing message is a `console.error`, so a silent-but-wrong
 *    render and a noisy-but-right one are different failures and both matter.
 */

type Node = Record<string, unknown>;

/** The first string leaf in a subtree, as a dotted path relative to it. */
function firstLeaf(node: Node, prefix = ''): string | null {
  for (const [k, v] of Object.entries(node)) {
    const path = prefix ? `${prefix}.${k}` : k;
    if (typeof v === 'string') return path;
    if (v && typeof v === 'object' && !Array.isArray(v)) {
      const found = firstLeaf(v as Node, path);
      if (found) return found;
    }
  }
  return null;
}

function valueAt(node: Node, dotted: string): string {
  let cur: unknown = node;
  for (const part of dotted.split('.')) cur = (cur as Node)[part];
  return cur as string;
}

/**
 * One representative `{ ns, key, english }` per namespace. Namespaces whose
 * representative message takes ICU arguments are skipped: rendering them without the
 * args throws, and the point here is the fallback chain, not interpolation (which
 * `i18n-surfaces.test.tsx` covers).
 */
const PROBES = Object.entries(enGB as Node)
  .filter(([, v]) => v && typeof v === 'object')
  .map(([ns, sub]) => {
    const key = firstLeaf(sub as Node);
    return key ? { ns, key, english: valueAt(sub as Node, key) } : null;
  })
  .filter((p): p is { ns: string; key: string; english: string } => p !== null)
  .filter((p) => !/[{}]/.test(p.english));

function Probe({ ns, k, testId }: { ns: string; k: string; testId?: string }) {
  const t = useTranslations(ns);
  return <li data-testid={testId ?? ns}>{t(k)}</li>;
}

function renderAll(locale: Locale) {
  return render(
    <LocaleProvider catalogs={CATALOGS} initialLocale={locale}>
      <ul>
        {PROBES.map((p) => (
          <Probe key={p.ns} ns={p.ns} k={p.key} />
        ))}
      </ul>
    </LocaleProvider>,
  );
}

/**
 * The declared-but-unauthored locales, derived from the meta sidecars' `complete` flag
 * rather than hardcoded — so if de-DE is ever authored (or a fifth locale is declared),
 * this set follows automatically instead of quietly testing the wrong thing.
 */
const FALLBACK_LOCALES: Locale[] = SUPPORTED_LOCALES.map((l) => l.code)
  .filter((code) => code !== DEFAULT_LOCALE)
  .filter((code) => {
    const meta = META[code];
    return meta ? meta.complete !== true : true;
  });

afterEach(() => {
  vi.restoreAllMocks();
});

describe('Phase 82 F — en-GB is the fallback for every declared locale', () => {
  it('has a probe for every namespace in the catalog', () => {
    // Guards the derivation itself: if `firstLeaf` or the ICU filter ever drops
    // everything, the sweeps below would pass while asserting nothing.
    const namespaces = Object.entries(enGB as Node).filter(([, v]) => v && typeof v === 'object');
    expect(PROBES.length).toBeGreaterThan(0);
    // Allow a small number of ICU-only namespaces, but not a collapse in coverage.
    expect(PROBES.length).toBeGreaterThanOrEqual(namespaces.length - 3);
  });

  it('covers both declared-but-unauthored locales', () => {
    // Pins today's reality so that authoring de-DE has to come here and say so,
    // rather than silently shrinking the sweep to one locale.
    expect(FALLBACK_LOCALES).toEqual(['de-DE', 'es-ES']);
  });

  for (const locale of FALLBACK_LOCALES) {
    it(`renders en-GB copy — never a raw key — for every namespace under ${locale}`, () => {
      renderAll(locale);
      const wrong: string[] = [];
      for (const p of PROBES) {
        const text = screen.getByTestId(p.ns).textContent;
        if (text !== p.english) wrong.push(`${p.ns}.${p.key}: got "${text}", want "${p.english}"`);
      }
      expect(wrong, `namespaces not falling back to en-GB under ${locale}`).toEqual([]);
    });

    it(`logs nothing while falling back under ${locale}`, () => {
      const error = vi.spyOn(console, 'error').mockImplementation(() => {});
      const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
      renderAll(locale);
      // A missing message surfaces as a console error in next-intl, so an empty log is
      // part of the guarantee — not just the rendered output being right.
      expect(error.mock.calls, `console.error during ${locale} fallback`).toEqual([]);
      expect(warn.mock.calls, `console.warn during ${locale} fallback`).toEqual([]);
    });
  }

  it('falls back PER KEY for a partially-authored locale', () => {
    // The sweeps above can't actually fail on the mechanism they describe: `messages/de-DE`
    // and `messages/es-ES` are empty, so merging them over en-GB is indistinguishable from
    // `{...enGB}` — a shallow merge would satisfy every assertion. Per-key fallback only
    // gets exercised by a catalog that has *some* of a namespace, which is what a real
    // machine-translation seed will look like. So build one synthetically.
    const enCommon = (enGB as Record<string, Record<string, unknown>>)['common'] ?? {};
    const key = Object.keys(enCommon).find((k) => typeof enCommon[k] === 'string') ?? '';
    expect(key, 'no string leaf in common to test with').toBeTruthy();
    const partial = { common: { [key]: 'ÜBERSETZT' } };

    render(
      <LocaleProvider
        catalogs={{ 'en-GB': enGB as never, 'de-DE': partial as never }}
        initialLocale="de-DE"
      >
        <ul>
          {/* The one authored key, plus a sibling the partial catalog omits. */}
          <Probe ns="common" k={key} testId="authored" />
          <Probe ns="common" k="cancel" testId="sibling" />
        </ul>
      </LocaleProvider>,
    );
    // Authored key wins…
    expect(screen.getByTestId('authored').textContent).toBe('ÜBERSETZT');
    // …and the *unauthored sibling in the same namespace* still resolves to English,
    // which a shallow `{...base, ...active}` merge would have replaced with nothing.
    expect(screen.getByTestId('sibling').textContent).toBe(
      typeof enCommon['cancel'] === 'string' ? enCommon['cancel'] : 'Cancel',
    );
  });

  it('still renders fr-FR in French rather than falling back', () => {
    // The negative control: if `renderAll` were somehow always serving en-GB, every
    // assertion above would pass for the wrong reason.
    renderAll('fr-FR');
    const french = PROBES.filter((p) => screen.getByTestId(p.ns).textContent !== p.english);
    expect(french.length, 'fr-FR served en-GB copy for every namespace').toBeGreaterThan(0);
  });
});
