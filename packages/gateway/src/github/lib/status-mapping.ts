import { STATUSES, type GithubProjectFieldOption, type GithubProjectStatusMapping, type Status } from '@midnite/shared';

// Defaulting a midnite status onto a board's columns at link time (Phase 84 Theme E).
//
// Pure, so the whole matrix is testable without GitHub. The point is to be *useful and
// obviously wrong-able*: a sensible guess the user can immediately correct, never a
// clever one they can't predict. Anything not confidently matched is left **unmapped**,
// which pushes as a no-op rather than putting a task in a column nobody chose.

/**
 * Column names each status recognises, best match first.
 *
 * Drawn from what GitHub's own project templates ship with, plus the obvious synonyms.
 *
 * **No status borrows another's names.** An earlier version let `backlog` fall back to
 * "Todo", which — because statuses are claimed in {@link STATUSES} order — meant a
 * conventional `Todo / In Progress / Done` board gave "Todo" to `backlog` and left
 * `todo`, much the more important status, to fend for itself. A status whose own column
 * doesn't exist is better left unmapped: that's a no-op push, whereas a borrowed column
 * quietly files work in the wrong place.
 */
const ALIASES: Record<Status, readonly string[]> = {
  backlog: ['backlog', 'icebox', 'later'],
  todo: ['todo', 'to do', 'ready', 'next up', 'next'],
  wip: ['in progress', 'in-progress', 'wip', 'doing', 'started', 'active'],
  waiting: ['waiting', 'blocked', 'in review', 'review', 'needs review', 'on hold'],
  done: ['done', 'complete', 'completed', 'shipped', 'closed'],
  abandoned: ['abandoned', 'cancelled', 'canceled', 'wont do', "won't do", 'dropped', 'closed'],
};

/** Case- and punctuation-insensitive, so "In-Progress" and "in progress" both match. */
function normalize(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
}

/**
 * Best-guess status → option mapping for a board's columns.
 *
 * Two passes per status, and **no fuzzy third**: an exact normalised match, then a
 * containment match ("In Progress 🚧" contains "in progress"). A status that matches
 * nothing is omitted from the result — an unmapped status is a no-op push, and guessing
 * at a distance would silently file work under the wrong column.
 *
 * An option is claimed by at most one status, first come by {@link STATUSES} order, so a
 * board with a single "Closed" column doesn't have both `done` and `abandoned` driving it.
 */
export function defaultStatusMappings(
  options: readonly GithubProjectFieldOption[],
): GithubProjectStatusMapping[] {
  const mappings: GithubProjectStatusMapping[] = [];
  const claimed = new Set<string>();

  for (const status of STATUSES) {
    const option = pickOption(status, options, claimed);
    if (!option) continue;
    claimed.add(option.id);
    mappings.push({ status, optionId: option.id, optionName: option.name });
  }
  return mappings;
}

function pickOption(
  status: Status,
  options: readonly GithubProjectFieldOption[],
  claimed: Set<string>,
): GithubProjectFieldOption | undefined {
  const aliases = ALIASES[status];
  const free = options.filter((o) => !claimed.has(o.id));

  for (const alias of aliases) {
    const exact = free.find((o) => normalize(o.name) === alias);
    if (exact) return exact;
  }
  for (const alias of aliases) {
    // Guard against one-letter aliases matching everything; all real ones are longer.
    if (alias.length < 3) continue;
    const partial = free.find((o) => normalize(o.name).includes(alias));
    if (partial) return partial;
  }
  return undefined;
}

/** The option a status should push to, or `undefined` when it's deliberately unmapped. */
export function optionIdForStatus(
  mappings: readonly GithubProjectStatusMapping[],
  status: Status,
): string | undefined {
  return mappings.find((m) => m.status === status)?.optionId;
}
