/**
 * The toggleable features that map one-to-one to the top section of the side
 * navigation. This is the single source of truth: the nav bar renders from it,
 * the settings hub's System category toggles it, and the feature gate uses it to
 * decide whether a route the user landed on is currently enabled.
 *
 * The settings hub is intentionally not a feature — it must always be reachable
 * so a disabled feature can be turned back on (Appearance, Agents, screen lock,
 * System and User all live under it).
 */

import {
  ActivitySquare,
  BotMessageSquare,
  BrainCircuit,
  Building2,
  CalendarClock,
  CirclePile,
  Folder,
  Images,
  LayoutDashboard,
  ListChecks,
  Newspaper,
  Presentation,
  Workflow,
  type LucideIcon,
} from 'lucide-react';

export type FeatureKey =
  | 'dashboard'
  | 'projects'
  | 'memory'
  | 'tasks'
  | 'sessions'
  | 'office'
  | 'workflows'
  | 'schedules'
  | 'councils'
  | 'slides'
  | 'media'
  | 'digests'
  | 'ops';

/**
 * Nav sections group the features into collapsible categories in the sidebar
 * (and mirror as headings in the settings feature chooser). `dashboard` has no
 * category — it stays pinned above every section as the home surface.
 */
export type NavCategory = 'app' | 'agents' | 'overview';

/** The category order + display labels the nav and settings both render from. */
export const NAV_CATEGORIES: { key: NavCategory; label: string }[] = [
  { key: 'app', label: 'App' },
  { key: 'agents', label: 'Agents' },
  { key: 'overview', label: 'Overview' },
];

export type Feature = {
  key: FeatureKey;
  /** The route this feature owns; also its nav link target. */
  href: string;
  label: string;
  description: string;
  Icon: LucideIcon;
  /** The nav section this feature lives under. Omitted for the pinned home (`dashboard`). */
  category?: NavCategory;
};

/**
 * Order here is the order the nav renders them: `dashboard` first (pinned), then
 * each category's features contiguously in category order. Keeping the array
 * grouped means the mobile bottom-tabs (first N enabled) and the sectioned
 * desktop nav read from one linear source.
 */
export const FEATURES: Feature[] = [
  {
    key: 'dashboard',
    href: '/dashboard',
    label: 'Dashboard',
    description: 'Your at-a-glance home — widgets, clocks, and live status.',
    Icon: LayoutDashboard,
  },
  // ── App ──────────────────────────────────────────────────────────────────
  {
    key: 'projects',
    href: '/projects',
    label: 'Projects',
    description: 'Organise work into projects and browse the project tree.',
    Icon: Folder,
    category: 'app',
  },
  {
    key: 'tasks',
    href: '/tasks',
    label: 'Tasks',
    description: 'The kanban board for orchestrating agent work.',
    Icon: ListChecks,
    category: 'app',
  },
  {
    key: 'slides',
    href: '/slides',
    label: 'Slides',
    description: 'Author decks from Markdown and present them with typewriter reveals.',
    Icon: Presentation,
    category: 'app',
  },
  {
    key: 'workflows',
    href: '/workflows',
    label: 'Workflows',
    description: 'Build and run multi-step agent workflows.',
    Icon: Workflow,
    category: 'app',
  },
  {
    key: 'schedules',
    href: '/schedules',
    label: 'Schedules',
    description: 'Recurring tasks that open on a cadence — daily standups, weekly chores, and more.',
    Icon: CalendarClock,
    category: 'app',
  },
  // ── Agents ───────────────────────────────────────────────────────────────
  {
    key: 'memory',
    href: '/memory',
    label: 'Memory',
    description: 'Long-term memories injected into your agents’ prompts.',
    Icon: BrainCircuit,
    category: 'agents',
  },
  {
    key: 'sessions',
    href: '/sessions',
    label: 'Sessions',
    description: 'Live and past agent sessions with embedded terminals.',
    Icon: BotMessageSquare,
    category: 'agents',
  },
  {
    key: 'councils',
    href: '/councils',
    label: 'Councils',
    description: 'Convene multiple agents, then synthesize in any format — brainstorm, debate, analyse, and more.',
    Icon: CirclePile,
    category: 'agents',
  },
  {
    key: 'media',
    href: '/media',
    label: 'Media',
    description: 'Your generated images and media library.',
    Icon: Images,
    category: 'agents',
  },
  // ── Overview ─────────────────────────────────────────────────────────────
  {
    key: 'office',
    href: '/office',
    label: 'Office',
    description: 'A pixel-art floor of your agents — walk up to a desk to call or message.',
    Icon: Building2,
    category: 'overview',
  },
  {
    key: 'digests',
    href: '/digests',
    label: 'Digests',
    description: 'Fleet digests — the periodic roll-up of what shipped, failed, and needs attention.',
    Icon: Newspaper,
    category: 'overview',
  },
  {
    key: 'ops',
    href: '/ops',
    label: 'Ops',
    description: 'Fleet health — live slot utilization, run throughput, duration distribution, and LLM spend.',
    Icon: ActivitySquare,
    category: 'overview',
  },
];

/** A category with its (already-filtered) features, in nav order. */
export type NavSection = { key: NavCategory; label: string; features: Feature[] };

/**
 * Split a feature list into the pinned home surface (`dashboard`) plus the
 * ordered category sections, dropping empty sections. The input is expected to
 * be pre-filtered to enabled features, so a section with everything disabled
 * simply doesn't appear.
 */
export function groupNavSections(features: Feature[]): { pinned: Feature[]; sections: NavSection[] } {
  const pinned = features.filter((f) => !f.category);
  const sections = NAV_CATEGORIES.map(({ key, label }) => ({
    key,
    label,
    features: features.filter((f) => f.category === key),
  })).filter((s) => s.features.length > 0);
  return { pinned, sections };
}

/** All features start enabled. */
export const DEFAULT_FEATURE_FLAGS: Record<FeatureKey, boolean> = {
  dashboard: true,
  projects: true,
  memory: true,
  tasks: true,
  sessions: true,
  office: true,
  workflows: true,
  schedules: true,
  councils: true,
  slides: true,
  media: true,
  digests: true,
  ops: true,
};

/**
 * A feature is enabled unless it has been explicitly turned off. Treating
 * missing keys as enabled means a feature added after a user first saved their
 * settings still shows up rather than silently disappearing.
 */
export function isFeatureEnabled(
  flags: Partial<Record<FeatureKey, boolean>> | undefined,
  key: FeatureKey,
): boolean {
  return flags?.[key] !== false;
}

/** The feature that owns `pathname`, or null if the route isn't gated. */
export function featureForPath(pathname: string): Feature | null {
  return (
    FEATURES.find((f) => pathname === f.href || pathname.startsWith(`${f.href}/`)) ?? null
  );
}
