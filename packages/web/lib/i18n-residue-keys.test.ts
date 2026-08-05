import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

import enGB from '@/messages/en-GB';

/**
 * Phase 82 Theme D (sessions / media / digests residue slice) — static guard that
 * every i18n key referenced by a migrated source resolves in the en-GB catalog,
 * mirroring `i18n-projects-keys.test.ts` and its siblings. fr-FR parity is enforced
 * separately by `i18n-validate` (fr-FR is a `complete` locale), so an en hit implies
 * a fr hit. The enum sweeps at the bottom cover the template-literal lookups the
 * regex can't see, by walking the shared enums themselves.
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

const ROOT = join(__dirname, '..');

const SESSION_FILES = [
  'app/(main)/sessions/page.tsx',
  'app/(main)/sessions/sessions-view.tsx',
  'app/(main)/sessions/view/session-detail-view.tsx',
  'app/(main)/sessions/view/session-left-panel.tsx',
  'components/live-terminal.tsx',
  'components/new-session-button.tsx',
  'components/reply-box.tsx',
  'components/session-card.tsx',
  'components/session-cost-line.tsx',
  'components/session-info-panel.tsx',
  'components/session-launch-modal.tsx',
  'components/session-pane.tsx',
  'components/session-terminal-impl.tsx',
  'components/session-terminal-region.tsx',
  'components/session-terminal-starting.tsx',
  'components/session-transcript-body.tsx',
  'components/sessions-widget.tsx',
];

const MEDIA_FILES = [
  'app/(main)/media/media-view.tsx',
  'app/(main)/media/new-media-button.tsx',
  'app/(main)/media/page.tsx',
  'app/(main)/media/[id]/media-detail-view.tsx',
  'app/(main)/media/[id]/wavesurfer-player.tsx',
  'components/media-type-picker-modal.tsx',
];

const DIGEST_FILES = ['components/digest-detail.tsx', 'components/digests-feed.tsx'];

// `const <name> = useTranslations('ns')` — ns may be nested.
const BIND_RE = /(?:const|let)\s+([A-Za-z_$][\w$]*)\s*=\s*useTranslations\(\s*'([^']+)'\s*\)/g;

/**
 * Every literal key a file passes to one of its translators, as `ns.key`.
 *
 * Files that bind more than one namespace under distinct names (`t` + `tCommon` +
 * `tBoard` + `tSettings`) resolve correctly because the call matcher is built per
 * binding name. A file binding the *same* name twice would produce a cross-product,
 * which is why `lib/i18n-labels.ts` is excluded (see the sibling projects suite).
 */
function referencedKeys(src: string): string[] {
  const binds = [...src.matchAll(BIND_RE)].map((m) => ({ name: m[1], ns: m[2] }));
  const keys: string[] = [];
  for (const { name, ns } of binds) {
    const callRe = new RegExp(`\\b${name}(?:\\.(?:rich|has))?\\(\\s*['"]([a-zA-Z][\\w.-]*)['"]`, 'g');
    for (const m of src.matchAll(callRe)) keys.push(`${ns}.${m[1]}`);
  }
  return keys;
}

const ALL = [...SESSION_FILES, ...MEDIA_FILES, ...DIGEST_FILES];

describe('Phase 82 D — sessions/media/digests i18n keys resolve in en-GB', () => {
  for (const rel of ALL) {
    const src = readFileSync(join(ROOT, rel), 'utf8');
    const keys = referencedKeys(src);
    if (keys.length === 0) continue; // a wrapper that only forwards props

    it(`resolves every t() key referenced in ${rel}`, () => {
      const missing = keys.filter((k) => !keyExists(enGB as Record<string, unknown>, k));
      expect(missing, `unresolved keys in ${rel}`).toEqual([]);
    });
  }

  it('found translators across every migrated file in the slice', () => {
    // A fresh, non-global matcher per file — a shared /g regex would carry
    // `lastIndex` across calls and undercount.
    const hasBind = (src: string) => /=\s*useTranslations\(\s*'[^']+'\s*\)/.test(src);
    const without = ALL.filter((rel) => !hasBind(readFileSync(join(ROOT, rel), 'utf8')));
    // `session-terminal.tsx` and the two Suspense route wrappers carry no copy of
    // their own, so they're deliberately absent from the lists above.
    expect(without, 'migrated files with no translator').toEqual([]);
  });

  it('covers every session status and media type', async () => {
    const { SESSION_STATUSES, MEDIA_TYPES } = await import('@midnite/shared');
    const catalog = enGB as Record<string, unknown>;
    for (const status of SESSION_STATUSES) {
      expect(keyExists(catalog, `sessions.status.${status}`), status).toBe(true);
    }
    for (const type of MEDIA_TYPES) {
      expect(keyExists(catalog, `media.types.${type}`), type).toBe(true);
      // The picker describes each type with its own blurb, keyed by the same id.
      expect(keyExists(catalog, `media.typePicker.${type}`), type).toBe(true);
    }
  });

  it('covers every terminal connection state and approval decision', () => {
    const catalog = enGB as Record<string, unknown>;
    // `STATUS_HINT_KEY` / `APPROVAL_LABEL_KEY` in `live-terminal.tsx` map onto these.
    for (const key of ['connecting', 'live', 'disconnected', 'connectionError']) {
      expect(keyExists(catalog, `sessions.terminal.${key}`), key).toBe(true);
    }
    for (const key of ['accept', 'acceptForSession', 'deny']) {
      expect(keyExists(catalog, `sessions.terminal.${key}`), key).toBe(true);
    }
  });

  it('reuses the existing approval-resolution and priority wording', () => {
    const catalog = enGB as Record<string, unknown>;
    // The cockpit's left rail renders these rather than duplicating the copy.
    for (const r of ['allow', 'allow-session', 'deny', 'auto-allow', 'auto-deny', 'timeout', 'expired']) {
      expect(keyExists(catalog, `settings.approvals.history.resolution.${r}`), r).toBe(true);
    }
    for (const p of ['low', 'normal', 'high', 'urgent']) {
      expect(keyExists(catalog, `board.priority.${p}`), p).toBe(true);
    }
  });
});
