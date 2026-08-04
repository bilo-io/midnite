import { useMemo } from 'react';
import { useTranslations } from 'next-intl';
import type { Feature } from '@/lib/features';

/**
 * The feature-registry i18n seam (Phase 82 Theme D, shared-chrome slice) — the
 * third instance of the pattern `lib/workflow-node-labels.ts` and
 * `lib/council-format-labels.ts` established.
 *
 * `FEATURES` in [`lib/features.ts`](./features.ts) carries each feature's English
 * `label` + `description`. The **labels** already had catalog keys
 * (`nav.features.<key>`, Phase 79 D / 82 E) but nothing resolved the
 * **descriptions**, so both surfaces that render one — the `FeatureGate` block and
 * Settings → Features — showed English inside otherwise-translated copy. This
 * resolves both by key convention, with the registry English as the per-key
 * fallback:
 *
 * ```text
 * nav.features.<key>                 (label — pre-existing keys, unchanged)
 * nav.featureDescriptions.<key>      (description — new here)
 * ```
 *
 * The registry stays canonical English: `lib/features.ts` also drives route
 * matching and the settings toggles, and a feature added there must render (in
 * English) before its copy lands rather than showing a raw key path.
 * `i18n-chrome-registry.test.ts` sweeps the registry so a new feature can't ship
 * without copy in either locale — the fallback is a safety net, not a habit.
 */
export type FeatureLabels = {
  /** Nav / dialog display name for a feature. */
  label: (feature: Feature) => string;
  /** One-line explanation, shown in the gate dialog and the settings list. */
  description: (feature: Feature) => string;
};

export function useFeatureLabels(): FeatureLabels {
  const t = useTranslations('nav');

  return useMemo(() => {
    const resolve = (key: string, fallback: string): string => (t.has(key) ? t(key) : fallback);
    return {
      label: (feature) => resolve(`features.${feature.key}`, feature.label),
      description: (feature) =>
        resolve(`featureDescriptions.${feature.key}`, feature.description),
    };
  }, [t]);
}
