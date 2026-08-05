import { useMemo } from 'react';
import { useTranslations } from 'next-intl';

import {
  DASHBOARD_WIDGETS,
  WIDGET_CATEGORIES,
  type WidgetCategory,
  type WidgetType,
} from './dashboard-widgets';

/**
 * The widget-registry i18n seam (Phase 82 Theme D, dashboard round 2) — the fourth
 * instance of the pattern `lib/workflow-node-labels.ts`, `lib/council-format-labels.ts`
 * and `lib/feature-labels.ts` established.
 *
 * The interesting part here is that **the keys already existed**. PR #580 localised the
 * whole `DASHBOARD_WIDGETS` registry for the Add-widget picker
 * (`dashboard.catalog.<type>.{label,description}`, `dashboard.categories.<category>`) but
 * resolved them inline in `dashboard-add-widget.tsx`. Meanwhile every widget card passed
 * its own hardcoded `title="…"` — a **prop string, invisible to the `jsx-text-only`
 * gate** — and those titles turned out to be byte-identical to the picker's labels for
 * 18 of 20 widgets. So this slice adds no header keys at all: it points the card headers
 * (and `dashboard-grid`'s `Remove <widget>` aria-label, which read the registry's raw
 * English) at the same catalog entries the picker uses, and the picker's inline
 * resolution moves in here so there is one implementation instead of two.
 *
 * ```text
 * dashboard.catalog.<type>.label         (card header + picker entry — one source)
 * dashboard.catalog.<type>.description   (picker entry only)
 * dashboard.categories.<category>        (picker section header)
 * ```
 *
 * The registry stays canonical English: `DASHBOARD_WIDGETS` also drives sizing, icons
 * and category bucketing, so a widget added there must render (in English) before its
 * copy lands rather than showing a raw key path. `i18n-dashboard-registry.test.ts`
 * sweeps `ALL_WIDGET_TYPES` in both locales, so the fallback is a safety net rather than
 * a habit.
 */
export type WidgetLabels = {
  /** Display name — the card header *and* the picker entry. */
  label: (type: WidgetType) => string;
  /** One-line explanation; only the picker shows this. */
  description: (type: WidgetType) => string;
  /** Picker section header for a category. */
  category: (category: WidgetCategory) => string;
};

export function useWidgetLabels(): WidgetLabels {
  const t = useTranslations('dashboard');

  return useMemo(() => {
    const resolve = (key: string, fallback: string): string => (t.has(key) ? t(key) : fallback);
    return {
      label: (type) => resolve(`catalog.${type}.label`, DASHBOARD_WIDGETS[type]?.label ?? type),
      description: (type) => resolve(`catalog.${type}.description`, DASHBOARD_WIDGETS[type]?.description ?? ''),
      category: (category) =>
        resolve(
          `categories.${category}`,
          WIDGET_CATEGORIES.find((c) => c.key === category)?.label ?? category,
        ),
    };
  }, [t]);
}
