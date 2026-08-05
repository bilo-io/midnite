import { useTranslations } from 'next-intl';

import {
  BG_INTENSITY_OPTIONS,
  DENSITY_OPTIONS,
  EDITOR_AUTOSAVE_OPTIONS,
  EFFECT_OPTIONS,
  GRADIENT_TYPE_OPTIONS,
  MOTION_OPTIONS,
  SHIMMER_DIRECTION_OPTIONS,
  UI_FONT_OPTIONS,
} from '@/lib/app-settings';

/**
 * Phase 82 Theme F — the eighth registry seam, and the one the fr-FR walkthrough found.
 *
 * Settings → Appearance's motion/effects block renders its copy out of four
 * `{ label, hint }` tables in `lib/app-settings.ts`. That is a **`.ts` module**, so the
 * `i18next/no-literal-string` gate (configured `jsx-text-only`) never looked at it — the
 * section reported clean while shipping "Page reveal", "Typewriter titles", "Frosted
 * glass", "Comfortable", "Follow the OS reduced-motion setting" and five more in English
 * on a page whose own headings were translated in Theme C. Only a screenshot showed it.
 *
 * Same shape as the node-catalogue, project-template, dashboard-widget and ops-widget
 * seams: the registries keep their English (they are plain data, and the labels double as
 * the fallback), and these hooks resolve `settings.appearance.options.<group>.<id>.*` at
 * the call site. Keeping the English in the table rather than deleting it means a group
 * added without catalog copy degrades to English instead of rendering a raw key.
 */

type Resolver = { label: (id: string) => string; hint: (id: string) => string };

/**
 * Every `{ label, hint }` option group these settings surfaces render, keyed the way its
 * catalog subtree is. **All eight.** The first pass covered only the motion/effects block
 * and left `uiFont`/`bgIntensity` rendering English two accordions up; adding the
 * registry↔seam cross-check in `i18n-appearance-registry.test.ts` then immediately turned
 * up `gradientType` (the accent builder) and `editorAutosave` (Settings → Editor) too.
 * That guard reads `app-settings.ts` itself, so a ninth registry can't be missed the same
 * way — which is the only reliable defence, since none of this is visible to a
 * `jsx-text-only` lint gate or to a `t()`-call audit.
 *
 * `bgIntensity` has labels but no hints (its registry carries none), so its hint resolver
 * returns `''` — the section doesn't render one.
 */
const GROUPS = {
  density: DENSITY_OPTIONS.map((o) => ({ id: o.value, label: o.label, hint: o.hint })),
  motion: MOTION_OPTIONS.map((o) => ({ id: o.value, label: o.label, hint: o.hint })),
  effects: EFFECT_OPTIONS.map((o) => ({ id: o.key, label: o.label, hint: o.hint })),
  shimmer: SHIMMER_DIRECTION_OPTIONS.map((o) => ({ id: o.value, label: o.label, hint: o.hint })),
  uiFont: UI_FONT_OPTIONS.map((o) => ({ id: o.value, label: o.label, hint: o.hint })),
  bgIntensity: BG_INTENSITY_OPTIONS.map((o) => ({ id: o.value, label: o.label, hint: '' })),
  gradientType: GRADIENT_TYPE_OPTIONS.map((o) => ({ id: o.value, label: o.label, hint: '' })),
  // Keyed by the numeric autosave interval; rendered by Settings → Editor, not Appearance,
  // but it is the same `.ts` registry class and the same blind spot.
  editorAutosave: EDITOR_AUTOSAVE_OPTIONS.map((o) => ({
    id: String(o.value),
    label: o.label,
    hint: '',
  })),
} as const;

export type AppearanceOptionGroup = keyof typeof GROUPS;

/**
 * Which `app-settings.ts` export each group comes from. Declared explicitly rather than
 * derived by mangling the identifier — `SHIMMER_DIRECTION_OPTIONS` → `shimmer` doesn't
 * follow from any rule, and a heuristic that guesses wrong either false-positives (as it
 * did) or, worse, silently passes a group that isn't really wired. The registry-coverage
 * test compares this against the exports it finds in the source, in both directions.
 */
export const APPEARANCE_REGISTRY_EXPORTS: Record<AppearanceOptionGroup, string> = {
  density: 'DENSITY_OPTIONS',
  motion: 'MOTION_OPTIONS',
  effects: 'EFFECT_OPTIONS',
  shimmer: 'SHIMMER_DIRECTION_OPTIONS',
  uiFont: 'UI_FONT_OPTIONS',
  bgIntensity: 'BG_INTENSITY_OPTIONS',
  gradientType: 'GRADIENT_TYPE_OPTIONS',
  editorAutosave: 'EDITOR_AUTOSAVE_OPTIONS',
};

/** Every `{ group, id, label, hint }` the section renders — the registry test's input. */
export const APPEARANCE_OPTION_ENTRIES = Object.entries(GROUPS).flatMap(([group, entries]) =>
  entries.map((e) => ({ group: group as AppearanceOptionGroup, ...e })),
);

/**
 * Label/hint resolvers for one option group. The registry's own English is the per-key
 * fallback, so a missing catalog entry is a cosmetic regression rather than a raw key.
 */
export function useAppearanceOptionLabels(group: AppearanceOptionGroup): Resolver {
  const t = useTranslations('settings');
  const fallbacks = GROUPS[group];
  const pick = (id: string) => fallbacks.find((o) => o.id === id);
  return {
    label: (id) => {
      const key = `appearance.options.${group}.${id}.label`;
      return t.has(key) ? t(key) : (pick(id)?.label ?? id);
    },
    hint: (id) => {
      const key = `appearance.options.${group}.${id}.hint`;
      return t.has(key) ? t(key) : (pick(id)?.hint ?? '');
    },
  };
}
