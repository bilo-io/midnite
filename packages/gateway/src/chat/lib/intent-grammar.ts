import { STATUSES, TASK_KINDS, type ChatIntent, type Status, type TaskKind } from '@midnite/shared';

/**
 * Phase 59 A — the deterministic half of chat-to-board. A tolerant mini-grammar
 * that turns an unambiguous command into a typed {@link ChatIntent} with **zero
 * inference**. Returns `null` when it can't confidently parse — the caller then
 * falls back to the LLM (Theme A) against the same contract.
 *
 * Shape: `<verb> [quoted-or-trailing title] [flags…]` where flags may appear in
 * any order after the verb (Decision — "doc's flag vocabulary, order-flexible"):
 *   - `p0`..`p3`            → priority band
 *   - `repo:<name>`         → repo
 *   - `project:<name>`      → project
 *   - `status:<name>`       → status (also used as the `move` target)
 *   - `kind:<name>`         → task kind
 *   - `@<name>`             → milestone
 * Titles/selectors may be `"quoted"` to include spaces; otherwise the remaining
 * unconsumed words are the title. This is intentionally *not* a natural-language
 * parser — prose ("add a couple of tasks to clean up auth") falls through to the
 * LLM.
 */

const STATUS_SET = new Set<string>(STATUSES);
const KIND_SET = new Set<string>(TASK_KINDS);

/** Status synonyms that aren't the canonical enum value. */
const STATUS_ALIASES: Record<string, Status> = {
  'in-progress': 'wip',
  'in progress': 'wip',
  progress: 'wip',
  doing: 'wip',
  blocked: 'waiting',
  cancelled: 'abandoned',
  canceled: 'abandoned',
  abandon: 'abandoned',
  'to-do': 'todo',
  'to do': 'todo',
};

type Flags = {
  priority?: number;
  repo?: string;
  project?: string;
  status?: Status;
  kind?: TaskKind;
  milestone?: string;
};

type Parsed = { verb: string; rest: string; flags: Flags };

/** Split on whitespace but keep `"quoted segments"` intact (quotes stripped). */
function tokenize(input: string): string[] {
  const tokens: string[] = [];
  const re = /"([^"]*)"|'([^']*)'|(\S+)/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(input)) !== null) {
    tokens.push(m[1] ?? m[2] ?? m[3] ?? '');
  }
  return tokens;
}

function resolveStatus(word: string | undefined): Status | undefined {
  if (!word) return undefined;
  const w = word.toLowerCase();
  if (STATUS_SET.has(w)) return w as Status;
  return STATUS_ALIASES[w];
}

/**
 * Pull flag tokens (`p2`, `repo:x`, `@m`, …) out of a token list, leaving the
 * "body" words. A `"quoted"` token is never treated as a flag — quoting is how a
 * user forces a literal title containing a colon.
 */
function extractFlags(tokens: string[], quotedMask: boolean[]): { body: string[]; flags: Flags } {
  const flags: Flags = {};
  const body: string[] = [];
  tokens.forEach((tok, i) => {
    if (quotedMask[i]) {
      body.push(tok);
      return;
    }
    const lower = tok.toLowerCase();
    if (/^p[0-3]$/.test(lower)) {
      flags.priority = Number(lower.slice(1));
      return;
    }
    const colon = tok.indexOf(':');
    if (colon > 0) {
      const key = lower.slice(0, colon);
      const val = tok.slice(colon + 1);
      if (key === 'repo' && val) return void (flags.repo = val);
      if (key === 'project' && val) return void (flags.project = val);
      // `kind:`/`status:` are enum-validated: a recognised key is always
      // consumed (never leaked into the title), the flag set only when valid.
      if (key === 'kind') {
        if (val && KIND_SET.has(val.toLowerCase())) flags.kind = val.toLowerCase() as TaskKind;
        return;
      }
      if (key === 'status') {
        const s = val ? resolveStatus(val) : undefined;
        if (s) flags.status = s;
        return;
      }
    }
    if (tok.startsWith('@') && tok.length > 1) {
      flags.milestone = tok.slice(1);
      return;
    }
    body.push(tok);
  });
  return { body, flags };
}

/** Tokenize + strip a leading verb + separate flags from the remaining body text. */
function parse(input: string): Parsed | null {
  const trimmed = input.trim();
  if (!trimmed) return null;
  const rawTokens = tokenize(trimmed);
  // Track which tokens were quoted so extractFlags can leave them verbatim.
  const quotedMask: boolean[] = [];
  const reMask = /"([^"]*)"|'([^']*)'|(\S+)/g;
  let mm: RegExpExecArray | null;
  while ((mm = reMask.exec(trimmed)) !== null) {
    quotedMask.push(mm[1] !== undefined || mm[2] !== undefined);
  }
  const verb = (rawTokens[0] ?? '').toLowerCase();
  const restTokens = rawTokens.slice(1);
  const { body, flags } = extractFlags(restTokens, quotedMask.slice(1));
  return { verb, rest: body.join(' ').trim(), flags };
}

const CREATE_VERBS = new Set(['add', 'create', 'new']);
const MOVE_VERBS = new Set(['move', 'mv']);
const PRIORITY_VERBS = new Set(['prioritize', 'prioritise']);
const ASSIGN_VERBS = new Set(['assign']);
const DEPEND_VERBS = new Set(['depend', 'block']);
const BREAKDOWN_VERBS = new Set(['breakdown', 'plan']);
const QUERY_VERBS = new Set(['show', 'list', 'count']);

/** Strip leading filler words the grammar allows but ignores ("a task", "to"). */
function stripLeadingNoise(rest: string): string {
  return rest.replace(/^(a |an |the |task |tasks |to |for )+/i, '').trim();
}

/** Split a create body into multiple titles on `;` or `,` — drives bulkCreate. */
function splitTitles(rest: string): string[] {
  return rest
    .split(/\s*[;,]\s*/)
    .map((t) => stripLeadingNoise(t))
    .filter((t) => t.length > 0);
}

export function parseIntentGrammar(input: string): ChatIntent | null {
  const p = parse(input);
  if (!p) return null;
  const { verb, rest, flags } = p;

  if (CREATE_VERBS.has(verb)) {
    const titles = splitTitles(rest);
    if (titles.length === 0) return null;
    if (titles.length > 1) {
      return {
        type: 'bulkCreate',
        titles,
        ...(flags.priority !== undefined ? { priority: flags.priority } : {}),
        ...(flags.repo ? { repo: flags.repo } : {}),
        ...(flags.project ? { project: flags.project } : {}),
      };
    }
    return {
      type: 'createTask',
      title: titles[0]!,
      ...(flags.priority !== undefined ? { priority: flags.priority } : {}),
      ...(flags.repo ? { repo: flags.repo } : {}),
      ...(flags.project ? { project: flags.project } : {}),
      ...(flags.kind ? { kind: flags.kind } : {}),
    };
  }

  if (MOVE_VERBS.has(verb)) {
    // `move <task> to <status>` — the status is either a `status:` flag or a
    // trailing word after "to".
    let status = flags.status;
    let taskPart = rest;
    const toMatch = rest.match(/^(.*?)\s+to\s+(\S+)\s*$/i);
    if (toMatch) {
      const trailing = resolveStatus(toMatch[2]);
      if (trailing) {
        status = trailing;
        taskPart = toMatch[1] ?? '';
      }
    } else if (status) {
      // "move <task> wip" — status came from a flag; whole rest is the task.
      taskPart = rest;
    }
    const task = stripTrailingStatus(taskPart).trim();
    if (!task || !status) return null;
    return { type: 'setStatus', task, status };
  }

  if (PRIORITY_VERBS.has(verb) || (verb === 'set' && flags.priority !== undefined)) {
    if (flags.priority === undefined) return null;
    const task = stripLeadingNoise(rest.replace(/\bto\b/gi, ' ')).trim();
    if (!task) return null;
    return { type: 'setPriority', task, priority: flags.priority };
  }

  if (ASSIGN_VERBS.has(verb)) {
    if (flags.repo == null && flags.project == null && flags.milestone == null) return null;
    const task = stripLeadingNoise(rest.replace(/\bto\b/gi, ' ')).trim();
    if (!task) return null;
    return {
      type: 'assign',
      task,
      ...(flags.repo ? { repo: flags.repo } : {}),
      ...(flags.project ? { project: flags.project } : {}),
      ...(flags.milestone ? { milestone: flags.milestone } : {}),
    };
  }

  if (DEPEND_VERBS.has(verb)) {
    // `depend <task> on <other>` / `block <task> on <other>`
    const onMatch = rest.match(/^(.*?)\s+on\s+(.*)$/i);
    if (!onMatch) return null;
    const task = stripLeadingNoise(onMatch[1] ?? '').trim();
    const dependsOn = stripLeadingNoise(onMatch[2] ?? '').trim();
    if (!task || !dependsOn) return null;
    return { type: 'addDependency', task, dependsOn };
  }

  if (BREAKDOWN_VERBS.has(verb)) {
    const goal = stripLeadingNoise(rest);
    if (!goal) return null;
    return {
      type: 'breakdown',
      goal,
      ...(flags.repo ? { repo: flags.repo } : {}),
      ...(flags.project ? { project: flags.project } : {}),
    };
  }

  if (QUERY_VERBS.has(verb)) {
    return parseQuery(verb, rest, flags, input);
  }

  // `<status> count` / `todo count`
  const bareCount = input.trim().match(/^(\w[\w-]*)\s+count$/i);
  if (bareCount) {
    const s = resolveStatus(bareCount[1]);
    if (s) return { type: 'query', text: input.trim(), read: { metric: 'count', status: s } };
  }

  return null;
}

/** Drop a trailing status word left on the task part of a `move` command. */
function stripTrailingStatus(part: string): string {
  const words = part.trim().split(/\s+/);
  if (words.length > 1 && resolveStatus(words[words.length - 1])) {
    return words.slice(0, -1).join(' ');
  }
  return stripLeadingNoise(part);
}

function parseQuery(verb: string, rest: string, flags: Flags, raw: string): ChatIntent | null {
  const text = raw.trim();
  const metric: 'list' | 'count' = verb === 'count' ? 'count' : 'list';
  const body = stripLeadingNoise(rest).toLowerCase();
  // `show blocked` / `list blocked`
  if (/\bblocked\b/.test(body)) return { type: 'query', text, read: { metric, blocked: true } };
  if (/\bready\b/.test(body)) return { type: 'query', text, read: { metric, ready: true } };
  // `show wip` / `count todo` / status via flag
  const statusWord = body.replace(/\btasks?\b/g, '').trim();
  const status = flags.status ?? (statusWord ? resolveStatus(statusWord) : undefined);
  if (status) return { type: 'query', text, read: { metric, status } };
  // `count` / `show tasks` with no qualifier → list/count everything.
  if (!body || body === 'tasks' || body === 'all') {
    return { type: 'query', text, read: { metric } };
  }
  return null;
}
