/**
 * Replayable product guides (Phase 66 Theme F). Each route maps to an ordered
 * list of spotlight **steps**; a step points at an on-screen element via its
 * `data-tour` key (the anchor contract established by this theme) and shows a
 * title + body. The assistant panel's "Guide" entry starts the guide for the
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
  /** The target element's `data-tour` value. */
  anchor: string;
  title: string;
  body: string;
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
  /** Human label shown in the guide header ("Board tour"). */
  label: string;
  steps: GuideStep[];
};

/**
 * The assistant FAB carries `data-tour="assistant"` and is present on every app
 * route, so every guide can close on it ("reopen this anytime here").
 */
export const ASSISTANT_ANCHOR = 'assistant';

const BOARD_GUIDE: Guide = {
  id: 'board',
  version: 1,
  label: 'Board tour',
  steps: [
    { anchor: 'board', title: 'Your board', body: 'Tasks flow left → right through the columns. Drag a card to move it between statuses.', placement: 'bottom' },
    { anchor: 'board-column-todo', title: 'Ready work', body: 'The scheduler picks up the top of **To do** first — priority, then age. Blocked tasks wait here until their blockers finish.', placement: 'right' },
    { anchor: ASSISTANT_ANCHOR, title: 'Replay anytime', body: 'Reopen this guide (or chat to your board, or ask the agent) from here whenever you like.', placement: 'left' },
  ],
};

const WORKFLOW_GUIDE: Guide = {
  id: 'workflow',
  version: 1,
  label: 'Workflow builder tour',
  steps: [
    { anchor: 'workflow-canvas', title: 'The canvas', body: 'Build an automation by wiring nodes here — a trigger, then the steps it fans out into.', placement: 'bottom' },
    { anchor: ASSISTANT_ANCHOR, title: 'Replay anytime', body: 'This tour lives in the assistant menu — reopen it from here whenever you need a refresher.', placement: 'left' },
  ],
};

const SESSIONS_GUIDE: Guide = {
  id: 'sessions',
  version: 1,
  label: 'Sessions tour',
  steps: [
    { anchor: 'sessions-list', title: 'Live sessions', body: 'Every agent session shows here. Open one for its cockpit — transcript, terminal, and the task it is driving.', placement: 'bottom' },
    { anchor: ASSISTANT_ANCHOR, title: 'Replay anytime', body: 'Reopen this tour from the assistant menu whenever you like.', placement: 'left' },
  ],
};

const MEMORY_GUIDE: Guide = {
  id: 'memory',
  version: 1,
  label: 'Memory workspace tour',
  steps: [
    { anchor: 'memory-workspace', title: 'Knowledge base', body: 'Gather sources, chat to your knowledge, and generate artifacts from a single workspace.', placement: 'bottom' },
    { anchor: ASSISTANT_ANCHOR, title: 'Replay anytime', body: 'Reopen this tour from the assistant menu whenever you like.', placement: 'left' },
  ],
};

// ── Phase 67 D — full-surface coverage ───────────────────────────────────────

const DASHBOARD_GUIDE: Guide = {
  id: 'dashboard',
  version: 1,
  label: 'Dashboard tour',
  steps: [
    { anchor: 'dashboard', title: 'Your home base', body: 'The dashboard rolls up your backlog, projects, and recent activity — a snapshot of the whole fleet at a glance.', placement: 'bottom' },
    { anchor: 'dashboard-composer', title: 'Draft tasks fast', body: 'Type a feature list here — **one task per line** — then send it to the Backlog or To do when you\'re ready.', placement: 'top' },
    { anchor: ASSISTANT_ANCHOR, title: 'Replay anytime', body: 'Reopen any guide from here. Tip: press **⌘K** (Ctrl+K) anywhere to search and run commands from the keyboard.', placement: 'left' },
  ],
};

const OFFICE_GUIDE: Guide = {
  id: 'office',
  version: 1,
  label: 'Office tour',
  steps: [
    { anchor: 'office', title: 'The office floor', body: 'Watch your agents work in a live scene — walk up to a desk to call or message the agent working there.', placement: 'bottom' },
    { anchor: 'office-view-toggle', title: '2D or 3D', body: 'Switch between the top-down **2D** floor and a first-person **3D** walkthrough. Your choice is remembered.', placement: 'bottom' },
    { anchor: ASSISTANT_ANCHOR, title: 'Replay anytime', body: 'Reopen this tour from the assistant menu whenever you like.', placement: 'left' },
  ],
};

const PROJECTS_GUIDE: Guide = {
  id: 'projects',
  version: 1,
  label: 'Projects tour',
  steps: [
    { anchor: 'projects', title: 'Your projects', body: 'Group related work into projects — each gathers its tasks, a structured plan, and a knowledge base.', placement: 'bottom' },
    { anchor: 'projects-new', title: 'Start one', body: 'Spin up a project from scratch or from a template. From a goal, midnite can even draft the whole task breakdown.', placement: 'left' },
    { anchor: 'project-detail', title: 'The cockpit', body: 'Open a project for its cockpit — **Details, Plan, Tasks, Roadmap** and phase docs, all in one place.', placement: 'bottom' },
    { anchor: ASSISTANT_ANCHOR, title: 'Replay anytime', body: 'Reopen this tour from the assistant menu whenever you like.', placement: 'left' },
  ],
};

const DIGESTS_GUIDE: Guide = {
  id: 'digests',
  version: 1,
  label: 'Digests tour',
  steps: [
    { anchor: 'digests', title: 'Fleet digests', body: 'The periodic roll-up of what your fleet **shipped, failed, and flagged** — generated by the Fable pipeline.', placement: 'bottom' },
    { anchor: 'digests-content', title: 'Read the story', body: 'Pick a digest to read its structured summary, with deep links back to the tasks behind each line.', placement: 'top' },
    { anchor: ASSISTANT_ANCHOR, title: 'Replay anytime', body: 'Reopen this tour from the assistant menu whenever you like.', placement: 'left' },
  ],
};

const SEARCH_GUIDE: Guide = {
  id: 'search',
  version: 1,
  label: 'Search tour',
  steps: [
    { anchor: 'search', title: 'Search everything', body: 'One full-text search across tasks, projects, memory, notes, councils, and workflows.', placement: 'bottom' },
    { anchor: 'search-input', title: 'Try it', body: 'Type a query here to search across every type at once. **Click the box** to continue.', placement: 'bottom', advanceOn: 'click' },
    { anchor: ASSISTANT_ANCHOR, title: 'Replay anytime', body: 'Reopen this tour from the assistant menu whenever you like.', placement: 'left' },
  ],
};

const SETTINGS_GUIDE: Guide = {
  id: 'settings',
  version: 1,
  label: 'Settings tour',
  steps: [
    { anchor: 'settings', title: 'Make it yours', body: 'Tune how midnite looks, locks, and runs your agents — appearance, safety, integrations, and more.', placement: 'top' },
    { anchor: 'settings-nav', title: 'Browse categories', body: 'Jump between settings categories here. Appearance is where themes, density, and product-guide behaviour live.', placement: 'right' },
    { anchor: ASSISTANT_ANCHOR, title: 'Replay anytime', body: 'Reopen this tour from the assistant menu whenever you like.', placement: 'left' },
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
