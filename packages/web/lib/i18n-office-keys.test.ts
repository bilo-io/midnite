import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

import enGB from '@/messages/en-GB';
import frFR from '@/messages/fr-FR';

/**
 * Phase 82 Theme E (office slice) — static guard that every i18n key referenced by
 * a migrated office source resolves in BOTH the en-GB and fr-FR catalogs (fr-FR is
 * a `complete` locale; asserting it here keeps the failure local and readable),
 * mirroring `i18n-dashboard-keys.test.ts`. Template-literal lookups
 * (`t(\`scenes.${scene}\`)` etc.) are covered by the enum sweeps below instead.
 */

/** Resolve a dotted key against the nested catalog; true if it lands on a string. */
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

const ROOT = join(__dirname, '..');
const FILES = [
  'app/(main)/office/page.tsx',
  'components/presence-office-widget.tsx',
  'components/office/CharacterPicker.tsx',
  'components/office/boardroom-panel.tsx',
  'components/office/desk-item-picker.tsx',
  'components/office/library-modal.tsx',
  'components/office/office-hud.tsx',
  'components/office/office-surface.tsx',
  'components/office/presence-chat-input.tsx',
  'components/office/presence-hud.tsx',
  'components/office/presence-name-dialog.tsx',
  'components/office/presence-nav-pill.tsx',
  'components/office/retro-games-menu.tsx',
  'components/office3d/office-3d-canvas.tsx',
  'components/office3d/office-3d-view-impl.tsx',
  'components/office3d/self-chat-hud.tsx',
];

// `const <name> = useTranslations('ns')` → the namespace that translator binds to.
const BIND_RE = /(?:const|let)\s+([A-Za-z_$][\w$]*)\s*=\s*useTranslations\(\s*'([^']+)'\s*\)/g;

describe.each([
  ['en-GB', enGB as Record<string, unknown>],
  ['fr-FR', frFR as Record<string, unknown>],
])('Phase 82 E — office i18n keys resolve (%s)', (_locale, catalog) => {
  for (const rel of FILES) {
    const src = readFileSync(join(ROOT, rel), 'utf8');
    const binds = [...src.matchAll(BIND_RE)].map((m) => ({ name: m[1], ns: m[2] }));

    it(`binds a translator in ${rel}`, () => {
      expect(binds.length).toBeGreaterThan(0);
    });

    it(`resolves every t() key referenced in ${rel}`, () => {
      const missing: string[] = [];
      for (const { name, ns } of binds) {
        const callRe = new RegExp(`\\b${name}(?:\\.rich)?\\(\\s*['"]([a-zA-Z][\\w.-]*)['"]`, 'g');
        for (const m of src.matchAll(callRe)) {
          const key = m[1];
          if (!keyExists(catalog, `${ns}.${key}`)) {
            missing.push(`${ns}.${key}`);
          }
        }
      }
      expect(missing, `unresolved keys in ${rel}`).toEqual([]);
    });
  }

  // Template-literal / ternary lookups sweep their enums — pin each family here.
  it('resolves the scene labels (presence-hud, presence-office-widget)', () => {
    for (const scene of ['office', 'corner', 'arcade']) {
      expect(keyExists(catalog, `office.scenes.${scene}`), `scenes.${scene}`).toBe(true);
    }
  });

  it('resolves the ternary kitchen prompts (office-hud)', () => {
    for (const key of ['kitchenBreak', 'kitchenBack']) {
      expect(keyExists(catalog, `office.hud.prompts.${key}`), `hud.prompts.${key}`).toBe(true);
    }
  });

  it('resolves the view-switcher labels (office-surface)', () => {
    for (const key of ['view2d', 'view3d']) {
      expect(keyExists(catalog, `office.surface.${key}`), `surface.${key}`).toBe(true);
    }
  });

  it('resolves every avatar variant + tint label (CharacterPicker)', () => {
    for (let i = 0; i < 6; i += 1) {
      expect(keyExists(catalog, `office.character.robots.${i}`), `character.robots.${i}`).toBe(true);
    }
    // PLAYER_TINTS carries 7 entries (natural + 6 colours).
    for (let i = 0; i < 7; i += 1) {
      expect(keyExists(catalog, `office.character.tints.${i}`), `character.tints.${i}`).toBe(true);
    }
  });

  it('resolves every retro game tagline + genre (retro-games-menu)', () => {
    const gameIds = [
      'pac-man',
      'tetris',
      'space-invaders',
      'donkey-kong',
      'pong',
      'frogger',
      'galaga',
      'street-fighter-2',
    ];
    for (const id of gameIds) {
      expect(keyExists(catalog, `office.games.taglines.${id}`), `games.taglines.${id}`).toBe(true);
    }
    for (const genre of ['arcade', 'puzzle', 'shooter', 'platform', 'sports', 'fighting']) {
      expect(keyExists(catalog, `office.games.genres.${genre}`), `games.genres.${genre}`).toBe(true);
    }
  });
});
