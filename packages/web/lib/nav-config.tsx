import type { NavItem, NavSection } from '@midnite/shell';

import { FEATURES, groupNavSections, isFeatureEnabled, type Feature, type FeatureKey } from '@/lib/features';

/**
 * Web's adapter from the app's `FEATURES` model (the single source of truth for the
 * toggleable surfaces) to the shared `<AppFrame>`'s injected `NavConfig` shape
 * (Phase 73 Theme C). The shell stays generic — it knows nothing about `FEATURES`,
 * feature flags, or categories; web maps them here. `admin` will supply its own,
 * different nav config the same way.
 *
 * Icons are pre-rendered `ReactNode`s (the shell renders them verbatim, sizing the
 * rail to `h-4` and the mobile bar to `h-5` via the frame's icon wrappers).
 */
/**
 * Optional label translators (Phase 79 D). When supplied, feature + category
 * labels come from the `nav` message catalog keyed by the stable feature/category
 * key; when omitted, the English labels baked into `FEATURES` are used (so the pure
 * unit tests and any non-i18n caller keep working unchanged).
 */
export type NavLabels = {
  feature: (key: FeatureKey) => string;
  category: (key: string) => string;
};

function toItem(f: Feature, labels?: NavLabels): NavItem {
  const Icon = f.Icon;
  return { href: f.href, label: labels ? labels.feature(f.key) : f.label, icon: <Icon aria-hidden /> };
}

/**
 * Map the enabled features (in nav order) to the pinned home item + the ordered,
 * collapsible category sections. Input flags gate which features appear; a category
 * whose features are all disabled simply doesn't render (via `groupNavSections`).
 */
export function featuresToNav(
  flags: Partial<Record<FeatureKey, boolean>> | undefined,
  labels?: NavLabels,
): {
  pinned: NavItem[];
  sections: NavSection[];
} {
  const features = FEATURES.filter((f) => isFeatureEnabled(flags, f.key));
  const { pinned, sections } = groupNavSections(features);
  return {
    pinned: pinned.map((f) => toItem(f, labels)),
    sections: sections.map((s) => ({
      key: s.key,
      title: labels ? labels.category(s.key) : s.label,
      items: s.features.map((f) => toItem(f, labels)),
      collapsible: true,
    })),
  };
}
