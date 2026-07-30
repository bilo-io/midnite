/**
 * Replayable product guides (Phase 66 Theme F). Each route maps to an ordered
 * list of spotlight **steps**; a step points at an on-screen element via its
 * `data-tour` key (the anchor contract established by this theme) and shows a
 * title + body (resolved from the `guide` i18n namespace by anchor — Phase 82 D). The assistant panel's "Guide" entry starts the guide for the
 * current route (resolved longest-prefix-first, mirroring the docs-link map), so
 * a sub-route inherits its section's guide (`/tasks/graph` → the board guide).
 *
 * Anchoring by `data-tour` (not CSS selectors) keeps steps refactor-safe: the
 * target components carry `data-tour="<key>"`, and a step that can't find its
 * anchor at runtime is skipped rather than breaking the tour.
 */

/** Where the step card sits relative to its anchored element. */
export type GuidePlacement = 'top' | 'bottom' | 'left' | 'right';

export type GuideStep = {
  /**
   * The target element's `data-tour` value. Doubles as the step's content key:
   * the card's title/body live in the `guide` catalog at
   * `guide.<guideId>.steps.<anchor>.{title,body}` (Phase 82 D) — see
   * {@link guideStepKey}.
   */
  anchor: string;
  /** Preferred card side; the overlay flips it if it would overflow. Default 'bottom'. */
  placement?: GuidePlacement;
  /**
   * Make the step *interactive* (Phase 67 B): when set, the overlay advances to
   * the next step the moment the anchored element fires this event — in addition
   * to the Next button. `'click'` is the only trigger today; the union is left
   * open for future ones. The spotlight hole is always click-through, so the
   * real element receives the event and the app's own handler runs too (the
   * guide never calls `preventDefault`).
   */
  advanceOn?: 'click';
};

export type Guide = {
  /** Stable id — the key stored in the `seenGuides` preference. */
  id: string;
  /**
   * Content version (Phase 67 A). Bump it whenever a guide's steps change so it
   * re-surfaces for users who already saw the previous version: `seenGuides`
   * stores the version last seen, and `hasSeen` only returns true when that
   * stored version is `>=` this one. Starts at `1`; a legacy `seenGuides` entry
   * with no recorded version coerces to `1`.
   */
  version: number;
  steps: GuideStep[];
};

/**
 * i18n key (within the `guide` namespace) for a guide's human label — "Board
 * tour" etc. live in the catalogs, not the registry (Phase 82 D).
 */
export function guideLabelKey(guide: Pick<Guide, 'id'>): string {
  return `${guide.id}.label`;
}

/** i18n key (within the `guide` namespace) for a step's title or body. */
export function guideStepKey(
  guide: Pick<Guide, 'id'>,
  step: Pick<GuideStep, 'anchor'>,
  field: 'title' | 'body',
): string {
  return `${guide.id}.steps.${step.anchor}.${field}`;
}

/**
 * The assistant FAB carries `data-tour="assistant"` and is present on every app
 * route, so every guide can close on it ("reopen this anytime here").
 */
export const ASSISTANT_ANCHOR = 'assistant';

const BOARD_GUIDE: Guide = {
  id: 'board',
  version: 1,
  steps: [
    { anchor: 'board', placement: 'bottom' },
    { anchor: 'board-column-todo', placement: 'right' },
    { anchor: ASSISTANT_ANCHOR, placement: 'left' },
  ],
};

const WORKFLOW_GUIDE: Guide = {
  id: 'workflow',
  version: 1,
  steps: [
    { anchor: 'workflow-canvas', placement: 'bottom' },
    { anchor: ASSISTANT_ANCHOR, placement: 'left' },
  ],
};

const SESSIONS_GUIDE: Guide = {
  id: 'sessions',
  version: 1,
  steps: [
    { anchor: 'sessions-list', placement: 'bottom' },
    { anchor: ASSISTANT_ANCHOR, placement: 'left' },
  ],
};

const MEMORY_GUIDE: Guide = {
  id: 'memory',
  version: 1,
  steps: [
    { anchor: 'memory-workspace', placement: 'bottom' },
    { anchor: ASSISTANT_ANCHOR, placement: 'left' },
  ],
};

// ── Phase 67 D — full-surface coverage ───────────────────────────────────────

const DASHBOARD_GUIDE: Guide = {
  id: 'dashboard',
  version: 1,
  steps: [
    { anchor: 'dashboard', placement: 'bottom' },
    { anchor: 'dashboard-composer', placement: 'top' },
    { anchor: ASSISTANT_ANCHOR, placement: 'left' },
  ],
};

const OFFICE_GUIDE: Guide = {
  id: 'office',
  version: 1,
  steps: [
    { anchor: 'office', placement: 'bottom' },
    { anchor: 'office-view-toggle', placement: 'bottom' },
    { anchor: ASSISTANT_ANCHOR, placement: 'left' },
  ],
};

const PROJECTS_GUIDE: Guide = {
  id: 'projects',
  version: 2,
  steps: [
    { anchor: 'projects', placement: 'bottom' },
    { anchor: 'projects-new', placement: 'left' },
    { anchor: 'project-detail', placement: 'bottom' },
    { anchor: ASSISTANT_ANCHOR, placement: 'left' },
  ],
};

const DIGESTS_GUIDE: Guide = {
  id: 'digests',
  version: 1,
  steps: [
    { anchor: 'digests', placement: 'bottom' },
    { anchor: 'digests-content', placement: 'top' },
    { anchor: ASSISTANT_ANCHOR, placement: 'left' },
  ],
};

const SEARCH_GUIDE: Guide = {
  id: 'search',
  version: 1,
  steps: [
    { anchor: 'search', placement: 'bottom' },
    { anchor: 'search-input', placement: 'bottom', advanceOn: 'click' },
    { anchor: ASSISTANT_ANCHOR, placement: 'left' },
  ],
};

const SETTINGS_GUIDE: Guide = {
  id: 'settings',
  version: 1,
  steps: [
    { anchor: 'settings', placement: 'top' },
    { anchor: 'settings-nav', placement: 'right' },
    { anchor: ASSISTANT_ANCHOR, placement: 'left' },
  ],
};

/**
 * Pathname prefix → guide, matched longest-prefix-first (so `/workflows/edit`
 * wins over a hypothetical `/workflows`). A route with no entry has no guide
 * (the panel shows a graceful "no guide for this page yet"). Sub-routes inherit
 * their section guide, so `/projects/view` and `/sessions/view` (detail cockpits)
 * reuse the section tour — a detail-only step auto-skips on the list view.
 */
export const GUIDE_ROUTE_MAP: ReadonlyArray<{ prefix: string; guide: Guide }> = [
  { prefix: '/tasks', guide: BOARD_GUIDE },
  { prefix: '/workflows/edit', guide: WORKFLOW_GUIDE },
  { prefix: '/sessions', guide: SESSIONS_GUIDE },
  { prefix: '/memory', guide: MEMORY_GUIDE },
  { prefix: '/dashboard', guide: DASHBOARD_GUIDE },
  { prefix: '/office', guide: OFFICE_GUIDE },
  { prefix: '/projects', guide: PROJECTS_GUIDE },
  { prefix: '/digests', guide: DIGESTS_GUIDE },
  { prefix: '/search', guide: SEARCH_GUIDE },
  { prefix: '/settings', guide: SETTINGS_GUIDE },
];

/**
 * Every guide the app ships, in a stable order. The single registry the route
 * map, the "unseen" nudge, and the version-snapshot guard all read from — add a
 * guide here (and to `GUIDE_ROUTE_MAP`) and everything downstream picks it up.
 */
export const ALL_GUIDES: readonly Guide[] = [
  BOARD_GUIDE,
  WORKFLOW_GUIDE,
  SESSIONS_GUIDE,
  MEMORY_GUIDE,
  DASHBOARD_GUIDE,
  OFFICE_GUIDE,
  PROJECTS_GUIDE,
  DIGESTS_GUIDE,
  SEARCH_GUIDE,
  SETTINGS_GUIDE,
];

/** Every guide id that ships today — the test asserts the map only targets these. */
export const KNOWN_GUIDE_IDS = [
  'board',
  'workflow',
  'sessions',
  'memory',
  'dashboard',
  'office',
  'projects',
  'digests',
  'search',
  'settings',
] as const;
export type GuideId = (typeof KNOWN_GUIDE_IDS)[number];

/** Resolve a pathname to its guide, or `null` when no guide maps to it. */
export function resolveGuide(pathname: string): Guide | null {
  const match = GUIDE_ROUTE_MAP
    .filter(({ prefix }) => pathname === prefix || pathname.startsWith(`${prefix}/`))
    .sort((a, b) => b.prefix.length - a.prefix.length)[0];
  return match?.guide ?? null;
}

/**
 * The route to visit to run a guide (Phase 67 C): the first `GUIDE_ROUTE_MAP`
 * prefix whose guide matches. Used by the "All guides" index to navigate to a
 * guide's home surface before starting it. `null` if the guide isn't routed.
 */
export function guideLaunchPath(guide: Guide): string | null {
  return GUIDE_ROUTE_MAP.find((e) => e.guide.id === guide.id)?.prefix ?? null;
}
