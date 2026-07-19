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
function toItem(f: Feature): NavItem {
  const Icon = f.Icon;
  return { href: f.href, label: f.label, icon: <Icon aria-hidden /> };
}

/**
 * Map the enabled features (in nav order) to the pinned home item + the ordered,
 * collapsible category sections. Input flags gate which features appear; a category
 * whose features are all disabled simply doesn't render (via `groupNavSections`).
 */
export function featuresToNav(flags: Partial<Record<FeatureKey, boolean>> | undefined): {
  pinned: NavItem[];
  sections: NavSection[];
} {
  const features = FEATURES.filter((f) => isFeatureEnabled(flags, f.key));
  const { pinned, sections } = groupNavSections(features);
  return {
    pinned: pinned.map(toItem),
    sections: sections.map((s) => ({
      key: s.key,
      title: s.label,
      items: s.features.map(toItem),
      collapsible: true,
    })),
  };
}
