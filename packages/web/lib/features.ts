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
  BotMessageSquare,
  BrainCircuit,
  Building2,
  CirclePile,
  Folder,
  Images,
  LayoutDashboard,
  ListChecks,
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
  | 'councils'
  | 'media';

export type Feature = {
  key: FeatureKey;
  /** The route this feature owns; also its nav link target. */
  href: string;
  label: string;
  description: string;
  Icon: LucideIcon;
};

/** Order here is the order the nav renders them. `dashboard` stays first. */
export const FEATURES: Feature[] = [
  {
    key: 'dashboard',
    href: '/dashboard',
    label: 'Dashboard',
    description: 'Your at-a-glance home — widgets, clocks, and live status.',
    Icon: LayoutDashboard,
  },
  {
    key: 'projects',
    href: '/projects',
    label: 'Projects',
    description: 'Organise work into projects and browse the project tree.',
    Icon: Folder,
  },
  {
    key: 'memory',
    href: '/memory',
    label: 'Memory',
    description: 'Long-term memories injected into your agents’ prompts.',
    Icon: BrainCircuit,
  },
  {
    key: 'tasks',
    href: '/tasks',
    label: 'Tasks',
    description: 'The kanban board for orchestrating agent work.',
    Icon: ListChecks,
  },
  {
    key: 'sessions',
    href: '/sessions',
    label: 'Sessions',
    description: 'Live and past agent sessions with embedded terminals.',
    Icon: BotMessageSquare,
  },
  {
    key: 'office',
    href: '/office',
    label: 'Office',
    description: 'A pixel-art floor of your agents — walk up to a desk to call or message.',
    Icon: Building2,
  },
  {
    key: 'workflows',
    href: '/workflows',
    label: 'Workflows',
    description: 'Build and run multi-step agent workflows.',
    Icon: Workflow,
  },
  {
    key: 'councils',
    href: '/councils',
    label: 'Councils',
    description: 'Convene multiple agents, then synthesize in any format — brainstorm, debate, analyse, and more.',
    Icon: CirclePile,
  },
  {
    key: 'media',
    href: '/media',
    label: 'Media',
    description: 'Your generated images and media library.',
    Icon: Images,
  },
];

/** All features start enabled. */
export const DEFAULT_FEATURE_FLAGS: Record<FeatureKey, boolean> = {
  dashboard: true,
  projects: true,
  memory: true,
  tasks: true,
  sessions: true,
  office: true,
  workflows: true,
  councils: true,
  media: true,
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
