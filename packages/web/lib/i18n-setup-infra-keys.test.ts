import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

import enGB from '@/messages/en-GB';

/**
 * Phase 82 Theme D (setup / routines / infra-chrome slice) — static guard that
 * every i18n key referenced by a migrated source resolves in the en-GB catalog,
 * mirroring `i18n-residue-keys.test.ts` and its siblings. fr-FR parity is enforced
 * separately by `i18n-validate` (fr-FR is a `complete` locale), so an en hit implies
 * a fr hit.
 *
 * The sweeps at the bottom cover what the regex structurally cannot see: keys built
 * from a template literal (`setup.items.${id}`, `auth.hero.pair${i}`) and the
 * registry seams, which are walked from their source enum/array instead.
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

/** Setup wizard, agent config, pickers, approvals inbox, guardrails. */
const SETUP_FILES = [
  'components/SetupWizard.tsx',
  'components/agent-card.tsx',
  'components/approvals-drawer.tsx',
  'components/cli-action-modal.tsx',
  'components/collapsible-status-groups.tsx',
  'components/export-menu.tsx',
  'components/folder-picker.tsx',
  'components/guardrails-control.tsx',
  'components/memories-tree.tsx',
  'components/provider-select.tsx',
  'components/setup-nudge.tsx',
];

/** Routine panel + modals, workflow run history/replay/output, retro, plan. */
const ROUTINE_FILES = [
  'components/plan-doc-modal.tsx',
  'components/plan-panel.tsx',
  'components/retro-tab.tsx',
  'components/routine-config-modal.tsx',
  'components/routine-history-modal.tsx',
  'components/routine-panel.tsx',
  'components/run-history-panel.tsx',
  'components/run-output-panel.tsx',
];

/** App infra + cross-page chrome. */
const INFRA_FILES = [
  'app/auth/sso/callback/page.tsx',
  'components/app-shell-client.tsx',
  'components/auth/auth-hero.tsx',
  'components/connection-status.tsx',
  'components/global-keymap.tsx',
  'components/notification-center.tsx',
  'components/pwa-install.tsx',
  'components/screensaver.tsx',
];

/** The `.ts`-module seams this slice introduced (see `lib/ts-module-labels.ts`). */
const SEAM_FILES = ['app/(auth)/login/page.tsx', 'app/(main)/settings/agents/agents-view.tsx'];

// `const <name> = useTranslations('ns')` — ns may be nested.
const BIND_RE = /(?:const|let)\s+([A-Za-z_$][\w$]*)\s*=\s*useTranslations\(\s*'([^']+)'\s*\)/g;

/**
 * Every literal key a file passes to one of its translators, as `ns.key`.
 *
 * Files binding several namespaces under distinct names (`t` + `tCommon` + `tNav`)
 * resolve correctly because the call matcher is built per binding name. A file
 * binding the *same* name twice would produce a cross-product — which is exactly
 * how the sibling suite caught `session-card.tsx`'s double `t`, so the shape is
 * kept deliberately.
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

const ALL = [...SETUP_FILES, ...ROUTINE_FILES, ...INFRA_FILES, ...SEAM_FILES];

describe('Phase 82 D — setup/routines/infra i18n keys resolve in en-GB', () => {
  for (const rel of ALL) {
    const src = readFileSync(join(ROOT, rel), 'utf8');
    const keys = referencedKeys(src);
    if (keys.length === 0) continue;

    it(`resolves every t() key referenced in ${rel}`, () => {
      const missing = keys.filter((k) => !keyExists(enGB as Record<string, unknown>, k));
      expect(missing, `unresolved keys in ${rel}`).toEqual([]);
    });
  }

  it('found a translator in every file listed for the slice', () => {
    const hasBind = (src: string) => /=\s*useTranslations\(\s*'[^']+'\s*\)/.test(src);
    const without = ALL.filter((rel) => !hasBind(readFileSync(join(ROOT, rel), 'utf8')));
    expect(without, 'listed files with no translator').toEqual([]);
  });

  it('covers every setup checklist item id', async () => {
    // `useSetupItemLabel()` builds `setup.items.${item.id}.label` from the shared
    // enum, so a newly-added item without copy has to fail here rather than
    // silently fall back to the gateway's English.
    const { SETUP_ITEM_IDS } = await import('@midnite/shared');
    for (const id of SETUP_ITEM_IDS) {
      expect(keyExists(enGB as Record<string, unknown>, `setup.items.${id}.label`), id).toBe(true);
    }
  });

  it('covers every wizard step', async () => {
    for (const step of ['provider', 'tools', 'pool', 'repo', 'finish']) {
      expect(
        keyExists(enGB as Record<string, unknown>, `setup.wizard.steps.${step}`),
        step,
      ).toBe(true);
    }
  });

  it('covers every auth-hero copy pair by index', async () => {
    // The hero picks an *index* and resolves `auth.hero.pair<i>.{title,subtitle}`,
    // so the catalog has to stay the same length as the curated English source.
    const { AUTH_HERO_COPY } = await import('@/components/auth/auth-hero');
    for (let i = 0; i < AUTH_HERO_COPY.length; i += 1) {
      expect(keyExists(enGB as Record<string, unknown>, `auth.hero.pair${i}.title`), `${i}`).toBe(
        true,
      );
      expect(
        keyExists(enGB as Record<string, unknown>, `auth.hero.pair${i}.subtitle`),
        `${i}`,
      ).toBe(true);
    }
  });

  it('covers every channel status and retro outcome', async () => {
    const catalog = enGB as Record<string, unknown>;
    // `useConnectionStatusLabel()` maps `stale` onto a longer message.
    for (const key of ['live', 'reconnecting', 'reconnectingStale']) {
      expect(keyExists(catalog, `common.chrome.connection.${key}`), key).toBe(true);
    }
    // Sweep the zod enum itself — a retyped list is exactly what drifts (the ops
    // slice found seven mislabelled approval resolutions that way).
    const { RetroOutcomeSchema } = await import('@midnite/shared');
    for (const outcome of RetroOutcomeSchema.options) {
      expect(keyExists(catalog, `task.retro.outcome.${outcome}`), outcome).toBe(true);
    }
  });

  it('covers every heartbeat preset', async () => {
    // `useHeartbeatIntervalLabel()` keys on the preset's hour count, so a new
    // cadence without copy fails here instead of falling back to English.
    const { HEARTBEAT_PRESETS } = await import('@/lib/app-settings');
    for (const preset of HEARTBEAT_PRESETS) {
      expect(
        keyExists(enGB as Record<string, unknown>, `settings.heartbeat.presets.h${preset.hours}`),
        String(preset.hours),
      ).toBe(true);
    }
  });

  it('covers every sso_error code the gateway can redirect with', async () => {
    // The seam falls back to `SSO_ERROR_MESSAGES` then to `generic`, so a missing
    // key degrades silently to English — this is what stops that.
    const { SSO_ERROR_MESSAGES } = await import('@/lib/api');
    const catalog = enGB as Record<string, unknown>;
    expect(keyExists(catalog, 'auth.ssoErrors.generic')).toBe(true);
    for (const code of Object.keys(SSO_ERROR_MESSAGES)) {
      expect(keyExists(catalog, `auth.ssoErrors.${code}`), code).toBe(true);
    }
  });

  it('reuses existing wording rather than restating it', () => {
    const catalog = enGB as Record<string, unknown>;
    // The retro tab lives under Theme B's `task` namespace; the plan panels reuse
    // the `projects.plan` subtree PR #595 shipped; the approvals drawer joins the
    // settings namespace that already owns approval vocabulary.
    expect(keyExists(catalog, 'task.retro.timing')).toBe(true);
    expect(keyExists(catalog, 'projects.plan.documents')).toBe(true);
    expect(keyExists(catalog, 'settings.approvals.inbox.allow')).toBe(true);
    // …and the drawer's imperative verbs stay distinct from the past-tense
    // resolutions, because French distinguishes them where English does not.
    expect(keyExists(catalog, 'settings.approvals.history.resolution.allow')).toBe(true);
  });

  it('keeps the two Vitest wrappers off the exempt list entirely', async () => {
    // They are spec-only helpers, so they belong in the gate's permanent
    // `I18N_NON_COPY` exclusions, not on a list that is meant to reach zero.
    const { I18N_EXEMPT } = await import('../../../eslint.i18n-exempt.mjs');
    expect(I18N_EXEMPT).not.toContain('packages/web/lib/test-locale-wrapper.tsx');
    expect(I18N_EXEMPT).not.toContain('packages/web/lib/test-query-wrapper.tsx');
  });
});
