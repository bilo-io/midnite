import { useMemo } from 'react';
import { useTranslations } from 'next-intl';

import {
  OPS_WIDGETS,
  OPS_WIDGET_CATEGORIES,
  type OpsWidgetCategory,
  type OpsWidgetType,
} from './ops-widgets';

/**
 * The ops-registry i18n seam (Phase 82 Theme D, ops slice) — the fifth instance of the
 * pattern `lib/workflow-node-labels.ts`, `lib/council-format-labels.ts`,
 * `lib/feature-labels.ts` and `lib/dashboard-widget-labels.ts` established.
 *
 * Deliberately a **parallel** hook rather than a generalisation of the dashboard seam:
 * the two registries only look alike today. Ops widgets are all single-instance and
 * config-less, the dashboard's are neither, and their sizing/category vocabularies differ
 * — so collapsing both onto one signature would couple two catalogs that are free to
 * diverge. Twenty duplicated lines is the cheaper trade.
 *
 * ```text
 * ops.catalog.<type>.label         (picker entry)
 * ops.catalog.<type>.description   (picker entry)
 * ops.categories.<category>        (picker section header)
 * ```
 *
 * **The card headers are *not* here** — they read `ops.cards.<type>.title`. Unlike the
 * dashboard, where the header and the picker entry were byte-identical for 18 of 20
 * widgets, four ops headers deliberately say more than their catalog entry
 * (`Throughput (server-recorded)`, `LLM spend (last 30d)`, `Cycle time (wait vs. work)`,
 * `Run duration distribution`). Rather than make the reader check which cards are
 * special, every header gets its own key with the catalog label as the fallback — see
 * {@link useOpsCardTitle}.
 *
 * `OPS_WIDGETS` stays canonical English: it also drives sizing, icons and category
 * bucketing, so a widget added there must render (in English) before its copy lands
 * rather than showing a raw key path. `i18n-ops-registry.test.ts` sweeps
 * `ALL_OPS_WIDGET_TYPES`, so the fallback is a safety net rather than a habit.
 */
export type OpsWidgetLabels = {
  /** Picker entry display name. */
  label: (type: OpsWidgetType) => string;
  /** Picker entry one-liner. */
  description: (type: OpsWidgetType) => string;
  /** Picker section header. */
  category: (category: OpsWidgetCategory) => string;
};

export function useOpsWidgetLabels(): OpsWidgetLabels {
  const t = useTranslations('ops');

  return useMemo(() => {
    const resolve = (key: string, fallback: string): string => (t.has(key) ? t(key) : fallback);
    return {
      label: (type) => resolve(`catalog.${type}.label`, OPS_WIDGETS[type]?.label ?? type),
      description: (type) => resolve(`catalog.${type}.description`, OPS_WIDGETS[type]?.description ?? ''),
      category: (category) =>
        resolve(
          `categories.${category}`,
          OPS_WIDGET_CATEGORIES.find((c) => c.key === category)?.label ?? category,
        ),
    };
  }, [t]);
}

/**
 * A card's on-board heading, from `ops.cards.<type>.title`.
 *
 * Separate from {@link useOpsWidgetLabels} because it answers a different question: the
 * picker asks "what is this widget called", the card asks "what is this panel showing"
 * — and for four of the thirteen those are different sentences. The catalog label is the
 * fallback, so a card whose title key is missing degrades to the picker's wording rather
 * than a raw key path.
 */
export function useOpsCardTitle(): (type: OpsWidgetType) => string {
  const t = useTranslations('ops');
  return (type) => {
    const key = `cards.${type}.title`;
    return t.has(key) ? t(key) : OPS_WIDGETS[type]?.label ?? type;
  };
}
