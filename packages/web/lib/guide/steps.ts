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

/**
 * Pathname prefix → guide, matched longest-prefix-first (so `/workflows/edit`
 * wins over a hypothetical `/workflows`). A route with no entry has no guide
 * (the panel shows a graceful "no guide for this page yet").
 */
export const GUIDE_ROUTE_MAP: ReadonlyArray<{ prefix: string; guide: Guide }> = [
  { prefix: '/tasks', guide: BOARD_GUIDE },
  { prefix: '/workflows/edit', guide: WORKFLOW_GUIDE },
  { prefix: '/sessions', guide: SESSIONS_GUIDE },
  { prefix: '/memory', guide: MEMORY_GUIDE },
];

/**
 * Every guide the app ships, in a stable order. The single registry the route
 * map, the "unseen" nudge, and the version-snapshot guard all read from — add a
 * guide here (and to `GUIDE_ROUTE_MAP`) and everything downstream picks it up.
 */
export const ALL_GUIDES: readonly Guide[] = [BOARD_GUIDE, WORKFLOW_GUIDE, SESSIONS_GUIDE, MEMORY_GUIDE];

/** Every guide id that ships today — the test asserts the map only targets these. */
export const KNOWN_GUIDE_IDS = ['board', 'workflow', 'sessions', 'memory'] as const;
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
