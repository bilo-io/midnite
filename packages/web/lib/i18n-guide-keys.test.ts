import { describe, expect, it } from 'vitest';

import enGB from '@/messages/en-GB';
import frFR from '@/messages/fr-FR';
import { ALL_GUIDES, guideLabelKey, guideStepKey } from '@/lib/guide/steps';

/**
 * Phase 82 Theme D (guide slice) — registry-driven audit. Guide content moved
 * out of `lib/guide/steps.ts` into the `guide` catalog namespace, resolved by
 * id + anchor at render. The registry is the source of the key list here, so a
 * new guide (or step) cannot ship without its en-GB copy — and because fr-FR is
 * a `complete` locale the validator enforces fr parity separately; the explicit
 * fr sweep below just makes the failure local and readable.
 */

function keyExists(catalog: Record<string, unknown>, dotted: string): boolean {
  let node: unknown = catalog;
  for (const part of dotted.split('.')) {
    if (node && typeof node === 'object' && part in (node as Record<string, unknown>)) {
      node = (node as Record<string, unknown>)[part];
    } else {
      return false;
    }
  }
  return typeof node === 'string';
}

describe.each([
  ['en-GB', enGB as Record<string, unknown>],
  ['fr-FR', frFR as Record<string, unknown>],
])('Phase 82 D — guide catalog covers the registry (%s)', (_locale, catalog) => {
  for (const guide of ALL_GUIDES) {
    it(`has a label + every step's title/body for the "${guide.id}" guide`, () => {
      const missing: string[] = [];
      if (!keyExists(catalog, `guide.${guideLabelKey(guide)}`)) missing.push(guideLabelKey(guide));
      for (const step of guide.steps) {
        for (const field of ['title', 'body'] as const) {
          const key = guideStepKey(guide, step, field);
          if (!keyExists(catalog, `guide.${key}`)) missing.push(key);
        }
      }
      expect(missing).toEqual([]);
    });
  }

  it('has the overlay chrome strings', () => {
    for (const key of ['noGuide', 'stepCount', 'skip', 'back', 'next', 'done']) {
      expect(keyExists(catalog, `guide.chrome.${key}`), `chrome.${key}`).toBe(true);
    }
  });
});
