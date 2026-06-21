import { describe, expect, it } from 'vitest';
import { type WorkflowRun } from '@midnite/shared';

import {
  ancestorIds,
  applySuggestion,
  buildExpressionContext,
  cursorInExpression,
  expressionTree,
  insertReference,
  refSegment,
  suggestAt,
} from './expression-editor';

const edges = [
  { source: 'trigger', target: 'fetch' },
  { source: 'fetch', target: 'ai' },
  { source: 'ai', target: 'save' },
];

const nodes = [
  { id: 'trigger', label: 'Manual' },
  { id: 'fetch', label: 'Fetch issues' },
  { id: 'ai', label: 'Claude' },
  { id: 'save', label: 'Store' },
];

function run(overrides?: Partial<WorkflowRun>): WorkflowRun {
  return {
    id: 'run-1',
    workflowId: 'wf-1',
    status: 'succeeded',
    triggerSource: 'manual',
    startedAt: '2026-06-22T00:00:00.000Z',
    nodeRuns: [
      { id: 'nr-t', runId: 'run-1', nodeId: 'trigger', nodeType: 'trigger.manual', status: 'succeeded', output: { ref: 'PR-1' }, logs: [] },
      { id: 'nr-f', runId: 'run-1', nodeId: 'fetch', nodeType: 'http.request', status: 'succeeded', output: { body: { title: 'Bug', labels: ['p1', 'p2'] } }, logs: [] },
      { id: 'nr-a', runId: 'run-1', nodeId: 'ai', nodeType: 'ai.claude', status: 'succeeded', input: { body: { title: 'Bug' } }, output: { text: 'done' }, logs: [] },
    ],
    ...overrides,
  };
}

describe('ancestorIds', () => {
  it('walks the full transitive predecessor set', () => {
    expect(ancestorIds('save', edges)).toEqual(new Set(['ai', 'fetch', 'trigger']));
    expect(ancestorIds('ai', edges)).toEqual(new Set(['fetch', 'trigger']));
    expect(ancestorIds('trigger', edges)).toEqual(new Set());
  });

  it('is cycle-safe', () => {
    const cyclic = [
      { source: 'a', target: 'b' },
      { source: 'b', target: 'a' },
    ];
    expect(ancestorIds('a', cyclic)).toEqual(new Set(['a', 'b']));
  });
});

describe('buildExpressionContext', () => {
  it('exposes the node input as $json and ancestor outputs as $node by label', () => {
    const { context, hasData } = buildExpressionContext({ selectedNodeId: 'ai', nodes, edges, run: run() });
    expect(hasData).toBe(true);
    expect(context.$json).toEqual({ body: { title: 'Bug' } });
    // ai's ancestors are fetch + trigger; each wrapped as { json: output }.
    expect(context.$node).toEqual({
      'Fetch issues': { json: { body: { title: 'Bug', labels: ['p1', 'p2'] } } },
      Manual: { json: { ref: 'PR-1' } },
    });
    // The selected node and downstream nodes never appear in its own $node.
    expect(context.$node).not.toHaveProperty('Claude');
    expect(context.$node).not.toHaveProperty('Store');
  });

  it('returns an empty, no-data context when there is no run', () => {
    const { context, hasData } = buildExpressionContext({ selectedNodeId: 'ai', nodes, edges, run: null });
    expect(hasData).toBe(false);
    expect(context.$json).toBeUndefined();
    expect(context.$node).toEqual({});
  });
});

describe('expressionTree', () => {
  it('builds $json and $node roots with insertable refs', () => {
    const { context } = buildExpressionContext({ selectedNodeId: 'ai', nodes, edges, run: run() });
    const tree = expressionTree(context);
    const json = tree.find((t) => t.key === '$json')!;
    expect(json.children?.map((c) => c.ref)).toContain('$json.body');

    const node = tree.find((t) => t.key === '$node')!;
    const fetch = node.children!.find((c) => c.key === 'Fetch issues')!;
    expect(fetch.ref).toBe('$node["Fetch issues"]');
    // Drilling through the wrapped { json: output } → body → title.
    const jsonWrap = fetch.children![0]!;
    expect(jsonWrap.ref).toBe('$node["Fetch issues"].json');
    const body = jsonWrap.children!.find((c) => c.key === 'body')!;
    const title = body.children!.find((c) => c.key === 'title');
    expect(title?.ref).toBe('$node["Fetch issues"].json.body.title');
  });

  it('indexes array leaves by position', () => {
    const { context } = buildExpressionContext({ selectedNodeId: 'save', nodes, edges, run: run() });
    const tree = expressionTree(context);
    const fetch = tree.find((t) => t.key === '$node')!.children!.find((c) => c.key === 'Fetch issues')!;
    const body = fetch.children![0]!.children!.find((c) => c.key === 'body')!;
    const labels = body.children!.find((c) => c.key === 'labels')!;
    expect(labels.children!.map((c) => c.ref)).toEqual([
      '$node["Fetch issues"].json.body.labels[0]',
      '$node["Fetch issues"].json.body.labels[1]',
    ]);
  });
});

describe('refSegment', () => {
  it('formats identifiers, quoted keys, and indices', () => {
    expect(refSegment('title')).toBe('.title');
    expect(refSegment('with space')).toBe('["with space"]');
    expect(refSegment(0)).toBe('[0]');
  });
});

describe('cursorInExpression', () => {
  it('detects an open or closed span and rejects outside positions', () => {
    expect(cursorInExpression('{{ $json.x }}', 5)).toBe(true);
    expect(cursorInExpression('hi {{ ', 6)).toBe(true); // unterminated
    expect(cursorInExpression('hello', 2)).toBe(false);
    expect(cursorInExpression('{{ x }} after', 10)).toBe(false); // past the span
  });
});

describe('suggestAt', () => {
  const ctx = buildExpressionContext({ selectedNodeId: 'ai', nodes, edges, run: run() }).context;

  it('suggests roots while typing $', () => {
    const text = '{{ $ }}';
    const res = suggestAt(text, 4, ctx); // cursor right after '$'
    expect(res.items.map((i) => i.label)).toEqual(['$json', '$node', '$env']);
    const applied = applySuggestion(text, res, res.items[0]!);
    expect(applied.value).toBe('{{ $json }}');
  });

  it('suggests node labels inside $node["', () => {
    const text = '{{ $node["Fe }}';
    const cursor = '{{ $node["Fe'.length;
    const res = suggestAt(text, cursor, ctx);
    expect(res.items.map((i) => i.label)).toEqual(['Fetch issues']);
    const applied = applySuggestion(text, res, res.items[0]!);
    expect(applied.value).toBe('{{ $node["Fetch issues"] }}');
    // Caret lands just past the closing "].
    expect(applied.value.slice(0, applied.cursor)).toBe('{{ $node["Fetch issues"]');
  });

  it('opens the quote when only the bracket is typed', () => {
    const text = '{{ $node[ }}';
    const cursor = '{{ $node['.length;
    const res = suggestAt(text, cursor, ctx);
    const applied = applySuggestion(text, res, res.items[0]!);
    expect(applied.value).toBe('{{ $node["Fetch issues"] }}');
  });

  it('suggests object keys after a resolvable parent path', () => {
    const text = '{{ $node["Fetch issues"].json. }}';
    const cursor = '{{ $node["Fetch issues"].json.'.length;
    const res = suggestAt(text, cursor, ctx);
    expect(res.items.map((i) => i.label).sort()).toEqual(['body']);
  });

  it('filters keys by the partial segment', () => {
    const text = '{{ $json.bo }}';
    const cursor = '{{ $json.bo'.length;
    const res = suggestAt(text, cursor, ctx);
    expect(res.items.map((i) => i.label)).toEqual(['body']);
    const applied = applySuggestion(text, res, res.items[0]!);
    expect(applied.value).toBe('{{ $json.body }}');
  });

  it('returns nothing outside a {{ }} span', () => {
    expect(suggestAt('plain text', 4, ctx).items).toEqual([]);
  });
});

describe('insertReference', () => {
  it('wraps a reference when inserting into plain text', () => {
    const res = insertReference('prefix ', 7, '$json.id');
    expect(res.value).toBe('prefix {{ $json.id }}');
    expect(res.value.slice(0, res.cursor)).toBe('prefix {{ $json.id }}');
  });

  it('inserts a bare reference when already inside a span', () => {
    const text = '{{  }}';
    const res = insertReference(text, 3, '$json.id'); // cursor between the braces
    expect(res.value).toBe('{{ $json.id }}');
  });
});
