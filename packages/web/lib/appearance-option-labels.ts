import { useTranslations } from 'next-intl';

import {
  DENSITY_OPTIONS,
  EFFECT_OPTIONS,
  MOTION_OPTIONS,
  SHIMMER_DIRECTION_OPTIONS,
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

/** The four option groups, keyed the way their catalog subtrees are. */
const GROUPS = {
  density: DENSITY_OPTIONS.map((o) => ({ id: o.value, label: o.label, hint: o.hint })),
  motion: MOTION_OPTIONS.map((o) => ({ id: o.value, label: o.label, hint: o.hint })),
  effects: EFFECT_OPTIONS.map((o) => ({ id: o.key, label: o.label, hint: o.hint })),
  shimmer: SHIMMER_DIRECTION_OPTIONS.map((o) => ({ id: o.value, label: o.label, hint: o.hint })),
} as const;

export type AppearanceOptionGroup = keyof typeof GROUPS;

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
