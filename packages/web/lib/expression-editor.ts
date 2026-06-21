// Design-time helpers for the n8n-style expression editor (Phase 12 Theme D).
//
// Pure, React-free logic for the autocomplete + data picker + resolved-value
// preview that sit on top of an `{{ }}` expression input. The grammar itself is
// the shared contract ([`expression.ts`](../../shared/src/expression.ts)); this
// module only *navigates* it for the editor — building the design-time context
// from the last run, listing references, and computing completions at a cursor.

import {
  resolveExpression,
  type ExpressionContext,
  type WorkflowRun,
} from '@midnite/shared';

/** Minimal node shape this module needs (id + the label expressions key on). */
export interface GraphNodeRef {
  id: string;
  label: string;
}

/** Minimal edge shape — a directed connection between two node ids. */
export interface GraphEdgeRef {
  source: string;
  target: string;
}

/** All transitive predecessors of `nodeId` (the nodes that run before it, hence
 *  the only ones whose output is available to reference). Cycle-safe via a seen
 *  set, though the engine rejects cycles at save time. */
export function ancestorIds(nodeId: string, edges: GraphEdgeRef[]): Set<string> {
  const incoming = new Map<string, string[]>();
  for (const e of edges) {
    const list = incoming.get(e.target);
    if (list) list.push(e.source);
    else incoming.set(e.target, [e.source]);
  }
  const seen = new Set<string>();
  const stack = [...(incoming.get(nodeId) ?? [])];
  while (stack.length) {
    const cur = stack.pop()!;
    if (seen.has(cur)) continue;
    seen.add(cur);
    for (const p of incoming.get(cur) ?? []) stack.push(p);
  }
  return seen;
}

export interface BuiltContext {
  context: ExpressionContext;
  /** Whether the last run gave us anything to preview/explore against. */
  hasData: boolean;
}

/**
 * Build the design-time {@link ExpressionContext} for `selectedNodeId` from the
 * last run, mirroring what the engine exposes at runtime:
 *   - `$json`  — the selected node's own input.
 *   - `$node`  — `{ [label]: { json: output } }` for each *ancestor* with output.
 * `$env` is intentionally empty — env values aren't available in the browser.
 */
export function buildExpressionContext(opts: {
  selectedNodeId: string;
  nodes: GraphNodeRef[];
  edges: GraphEdgeRef[];
  run: WorkflowRun | null;
}): BuiltContext {
  const { selectedNodeId, nodes, edges, run } = opts;
  const empty: BuiltContext = { context: { $json: undefined, $node: {}, $env: {} }, hasData: false };
  if (!run) return empty;

  const runByNode = new Map(run.nodeRuns.map((nr) => [nr.nodeId, nr]));
  const labelOf = new Map(nodes.map((n) => [n.id, n.label]));

  const $json = runByNode.get(selectedNodeId)?.input;

  const $node: Record<string, unknown> = {};
  for (const id of ancestorIds(selectedNodeId, edges)) {
    const nr = runByNode.get(id);
    if (!nr || nr.output === undefined) continue;
    // Match the engine's keying: label, falling back to id.
    $node[labelOf.get(id) ?? id] = { json: nr.output };
  }

  const hasData = $json !== undefined || Object.keys($node).length > 0;
  return { context: { $json, $node, $env: {} }, hasData };
}

/** A reference segment, formatted for insertion: `.ident`, `["quoted"]`, or `[0]`. */
export function refSegment(key: string | number): string {
  if (typeof key === 'number') return `[${key}]`;
  if (/^[A-Za-z_$][A-Za-z0-9_$]*$/.test(key)) return `.${key}`;
  return `[${JSON.stringify(key)}]`;
}

export interface TreeEntry {
  /** The label shown in the tree (the bare key or index). */
  key: string;
  /** Full insertable reference path, e.g. `$node["Fetch"].json.title`. */
  ref: string;
  /** A short, single-line preview of the value at this node. */
  preview: string;
  /** Child entries for objects/arrays; absent for leaves. */
  children?: TreeEntry[];
}

const MAX_ARRAY = 50;

function previewValue(value: unknown): string {
  if (value === null) return 'null';
  if (value === undefined) return 'undefined';
  if (typeof value === 'string') return value.length > 40 ? `"${value.slice(0, 40)}…"` : `"${value}"`;
  if (typeof value === 'number' || typeof value === 'boolean') return String(value);
  if (Array.isArray(value)) return `Array(${value.length})`;
  return `{ ${Object.keys(value as object).slice(0, 4).join(', ')}${Object.keys(value as object).length > 4 ? ', …' : ''} }`;
}

function buildEntries(value: unknown, baseRef: string): TreeEntry[] {
  if (Array.isArray(value)) {
    return value.slice(0, MAX_ARRAY).map((v, i) => ({
      key: `[${i}]`,
      ref: `${baseRef}[${i}]`,
      preview: previewValue(v),
      children: hasChildren(v) ? buildEntries(v, `${baseRef}[${i}]`) : undefined,
    }));
  }
  if (value && typeof value === 'object') {
    return Object.entries(value as Record<string, unknown>).map(([k, v]) => ({
      key: k,
      ref: `${baseRef}${refSegment(k)}`,
      preview: previewValue(v),
      children: hasChildren(v) ? buildEntries(v, `${baseRef}${refSegment(k)}`) : undefined,
    }));
  }
  return [];
}

function hasChildren(value: unknown): boolean {
  if (Array.isArray(value)) return value.length > 0;
  return Boolean(value) && typeof value === 'object' && Object.keys(value as object).length > 0;
}

/**
 * The explorable reference tree for the data picker: a `$json` root (the node's
 * input) and a `$node` root grouping each available upstream node by label.
 */
export function expressionTree(context: ExpressionContext): TreeEntry[] {
  const roots: TreeEntry[] = [];
  if (context.$json !== undefined) {
    roots.push({
      key: '$json',
      ref: '$json',
      preview: previewValue(context.$json),
      children: hasChildren(context.$json) ? buildEntries(context.$json, '$json') : undefined,
    });
  }
  const nodeMap = context.$node ?? {};
  const labels = Object.keys(nodeMap);
  if (labels.length) {
    roots.push({
      key: '$node',
      ref: '$node',
      preview: `${labels.length} node${labels.length === 1 ? '' : 's'}`,
      children: labels.map((label) => {
        const ref = `$node[${JSON.stringify(label)}]`;
        return {
          key: label,
          ref,
          preview: previewValue(nodeMap[label]),
          children: hasChildren(nodeMap[label]) ? buildEntries(nodeMap[label], ref) : undefined,
        };
      }),
    });
  }
  return roots;
}

/** The active `{{ … }}` span the cursor sits in, or null if outside any span.
 *  An unterminated `{{` (still being typed) counts as open. */
function activeSpan(text: string, cursor: number): { start: number; end: number } | null {
  // Search for the opening `{{` whose *content* starts at or before the cursor:
  // its `{{` must end by `cursor`, i.e. begin at `cursor - 2` or earlier. With
  // `cursor < 2` no such brace can exist (and `lastIndexOf` clamps a negative
  // bound to 0, which would wrongly match a leading `{{` the caret precedes).
  if (cursor < 2) return null;
  const open = text.lastIndexOf('{{', cursor - 2);
  if (open === -1) return null;
  // A `}}` between the `{{` and the cursor means the cursor is past this span.
  const close = text.indexOf('}}', open + 2);
  if (close !== -1 && close < cursor) return null;
  return { start: open + 2, end: close === -1 ? text.length : close };
}

/** True when the cursor sits inside an (open or closed) `{{ }}` span. */
export function cursorInExpression(text: string, cursor: number): boolean {
  return activeSpan(text, cursor) !== null;
}

export interface Suggestion {
  /** Display text in the suggestion list. */
  label: string;
  /** Text inserted in place of [from, to). */
  insert: string;
  /** Optional caret offset within `insert` (defaults to end of insert). */
  caret?: number;
  /** A short hint shown alongside the label (a value preview or kind). */
  detail?: string;
}

export interface SuggestResult {
  from: number;
  to: number;
  items: Suggestion[];
}

const ROOTS = ['$json', '$node', '$env'] as const;

/**
 * Autocomplete suggestions for the cursor position. Handles three shapes:
 *   - typing a root (`$js` → `$json`),
 *   - a node label inside `$node["…"]` (drawn from the context's `$node` keys),
 *   - a dotted field after a resolvable parent path (keys of that object).
 * Returns an empty list when the cursor is outside a `{{ }}` span.
 */
export function suggestAt(text: string, cursor: number, context: ExpressionContext): SuggestResult {
  const none: SuggestResult = { from: cursor, to: cursor, items: [] };
  const span = activeSpan(text, cursor);
  if (!span || cursor < span.start) return none;
  const frag = text.slice(span.start, cursor);

  // 1) Node label inside a bracket: `$node["Fe` / `$node['Fe` / `$node[`.
  const dq = /\$node\s*\[\s*"([^"\]]*)$/.exec(frag);
  const sq = /\$node\s*\[\s*'([^'\]]*)$/.exec(frag);
  const open = /\$node\s*\[\s*$/.exec(frag);
  const bracket = dq ?? sq ?? open;
  if (bracket) {
    const partial = dq?.[1] ?? sq?.[1] ?? '';
    const quote = sq ? "'" : '"';
    const labels = Object.keys(context.$node ?? {}).filter((l) =>
      l.toLowerCase().startsWith(partial.toLowerCase()),
    );
    const from = cursor - partial.length;
    return {
      from,
      to: cursor,
      items: labels.slice(0, 8).map((label) => {
        // When no quote is open yet (`$node[`), include the opening quote.
        const insert = open ? `${quote}${label}${quote}]` : `${label}${quote}]`;
        return { label, insert, detail: 'node', caret: insert.length };
      }),
    };
  }

  // 2) Dotted field after a parent path: `$json.bo`, `$node["Fetch"].json.ti`.
  const dot = /\.([A-Za-z_$][A-Za-z0-9_$]*)?$/.exec(frag);
  if (dot) {
    const parent = frag.slice(0, dot.index).trim();
    const partial = dot[1] ?? '';
    let parentValue: unknown;
    try {
      parentValue = resolveExpression(`{{${parent}}}`, context);
    } catch {
      return none;
    }
    if (!parentValue || typeof parentValue !== 'object' || Array.isArray(parentValue)) return none;
    const keys = Object.keys(parentValue as Record<string, unknown>).filter(
      (k) => /^[A-Za-z_$][A-Za-z0-9_$]*$/.test(k) && k.toLowerCase().startsWith(partial.toLowerCase()),
    );
    const from = cursor - partial.length;
    return {
      from,
      to: cursor,
      items: keys.slice(0, 8).map((k) => ({
        label: k,
        insert: k,
        detail: previewValue((parentValue as Record<string, unknown>)[k]),
      })),
    };
  }

  // 3) Root being typed (`$`, `$js`) — or an empty span (suggest all roots).
  const root = /(?:^|[^A-Za-z0-9_$.\]"'])(\$[A-Za-z]*)$/.exec(frag);
  const bare = frag.trim() === '';
  if (root || bare) {
    const token = root?.[1] ?? '';
    const from = cursor - token.length;
    const matches = ROOTS.filter((r) => r.startsWith(token));
    return {
      from,
      to: cursor,
      items: matches.map((r) => ({ label: r, insert: r, detail: 'root' })),
    };
  }

  return none;
}

export interface InsertResult {
  value: string;
  cursor: number;
}

/**
 * Insert a reference at the cursor. If the cursor already sits inside a `{{ }}`
 * span the bare `ref` is inserted; otherwise it's wrapped as `{{ ref }}`. Returns
 * the new value and the caret position just after what was inserted.
 */
export function insertReference(text: string, cursor: number, ref: string): InsertResult {
  const inside = cursorInExpression(text, cursor);
  const snippet = inside ? ref : `{{ ${ref} }}`;
  const value = text.slice(0, cursor) + snippet + text.slice(cursor);
  return { value, cursor: cursor + snippet.length };
}

/** Apply a {@link Suggestion} to the text, returning the new value + caret. */
export function applySuggestion(
  text: string,
  result: SuggestResult,
  item: Suggestion,
): InsertResult {
  const value = text.slice(0, result.from) + item.insert + text.slice(result.to);
  const caret = result.from + (item.caret ?? item.insert.length);
  return { value, cursor: caret };
}
