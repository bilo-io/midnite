import { describe, expect, it, vi } from 'vitest';
import type { TaskGraph, TaskGraphNode } from '@midnite/shared';

import type { LlmService } from '../agent/llm/llm.service';
import type { TasksService } from '../tasks/tasks.service';
import { ChatQueryService } from './chat-query.service';

function node(over: Partial<TaskGraphNode> & { id: string }): TaskGraphNode {
  return { title: over.id, status: 'todo', priority: 1, ready: false, unmetBlockerCount: 0, ...over };
}

function graph(nodes: TaskGraphNode[], truncated = false): TaskGraph {
  return { nodes, edges: [], truncated, totalCount: nodes.length };
}

function makeTasks(g: TaskGraph): TasksService {
  return { buildGraph: vi.fn(() => g) } as unknown as TasksService;
}

const llmOff = { enabled: false } as unknown as LlmService;

// A default board: 2 ready, 1 wip, 1 blocked (unmet), 1 done.
const BOARD = [
  node({ id: 'r1', status: 'todo', ready: true, priority: 3 }),
  node({ id: 'r2', status: 'todo', ready: true, priority: 1 }),
  node({ id: 'w1', status: 'wip' }),
  node({ id: 'b1', status: 'todo', unmetBlockerCount: 2, priority: 2 }),
  node({ id: 'd1', status: 'done' }),
];

describe('ChatQueryService — deterministic reads', () => {
  it('counts blocked tasks with zero inference', async () => {
    const svc = new ChatQueryService(makeTasks(graph(BOARD)), llmOff);
    const ans = await svc.answer({ type: 'query', text: 'how many blocked', read: { metric: 'count', blocked: true } });
    expect(ans.count).toBe(1);
    expect(ans.tasks).toEqual([]); // count metric returns just the number
    expect(ans.inferencePath).toBe('deterministic');
    expect(ans.text).toMatch(/1 blocked task/);
  });

  it('lists ready tasks as refs', async () => {
    const svc = new ChatQueryService(makeTasks(graph(BOARD)), llmOff);
    const ans = await svc.answer({ type: 'query', text: 'show ready', read: { metric: 'list', ready: true } });
    expect(ans.count).toBe(2);
    expect(ans.tasks.map((t) => t.id).sort()).toEqual(['r1', 'r2']);
    expect(ans.tasks[0]).toMatchObject({ id: expect.any(String), title: expect.any(String), status: 'todo', priority: expect.any(Number) });
  });

  it('filters by status column', async () => {
    const svc = new ChatQueryService(makeTasks(graph(BOARD)), llmOff);
    const ans = await svc.answer({ type: 'query', text: "what's in wip", read: { metric: 'list', status: 'wip' } });
    expect(ans.tasks.map((t) => t.id)).toEqual(['w1']);
  });

  it('excludes foreign (cross-project blocker) nodes', async () => {
    const board = [...BOARD, node({ id: 'f1', status: 'todo', ready: true, foreign: true })];
    const svc = new ChatQueryService(makeTasks(graph(board)), llmOff);
    const ans = await svc.answer({ type: 'query', text: 'ready', read: { metric: 'list', ready: true } });
    expect(ans.tasks.map((t) => t.id)).not.toContain('f1');
    expect(ans.count).toBe(2);
  });

  it('caps the list at 50 and flags truncation', async () => {
    const many = Array.from({ length: 60 }, (_, i) => node({ id: `t${i}`, status: 'todo' }));
    const svc = new ChatQueryService(makeTasks(graph(many)), llmOff);
    const ans = await svc.answer({ type: 'query', text: 'todo', read: { metric: 'list', status: 'todo' } });
    expect(ans.count).toBe(60);
    expect(ans.tasks).toHaveLength(50);
    expect(ans.truncated).toBe(true);
    expect(ans.text).toMatch(/first 50/);
  });

  it('propagates the graph node-cap truncation into the count answer', async () => {
    const svc = new ChatQueryService(makeTasks(graph(BOARD, /* truncated */ true)), llmOff);
    const ans = await svc.answer({ type: 'query', text: 'count', read: { metric: 'count' } });
    expect(ans.truncated).toBe(true);
    expect(ans.text).toMatch(/\+/); // "5+ total tasks"
  });
});

describe('ChatQueryService — free-form (LLM) path', () => {
  it('falls back to a deterministic overview when no provider is configured', async () => {
    const svc = new ChatQueryService(makeTasks(graph(BOARD)), llmOff);
    const ans = await svc.answer({ type: 'query', text: 'what should I focus on?' });
    expect(ans.inferencePath).toBe('deterministic');
    expect(ans.text).toMatch(/2 ready/);
    expect(ans.text).toMatch(/1 blocked/);
    // deep-link slice = ready + blocked
    expect(ans.tasks.map((t) => t.id).sort()).toEqual(['b1', 'r1', 'r2']);
  });

  it('uses the LLM summary when a provider is available, tagged as chat usage', async () => {
    const generateStructured = vi.fn(async () => ({ data: { summary: 'Focus on r1 — it is high priority and ready.' } }));
    const llmOn = { enabled: true, getActModel: () => 'm', generateStructured } as unknown as LlmService;
    const svc = new ChatQueryService(makeTasks(graph(BOARD)), llmOn);
    const ans = await svc.answer({ type: 'query', text: 'what should I focus on?' });
    expect(ans.inferencePath).toBe('provider');
    expect(ans.text).toMatch(/Focus on r1/);
    expect(generateStructured).toHaveBeenCalledWith(expect.objectContaining({ schemaName: 'record_answer' }), 'chat');
  });

  it('fails soft to the overview when the LLM call throws', async () => {
    const generateStructured = vi.fn(async () => {
      throw new Error('provider down');
    });
    const llmErr = { enabled: true, getActModel: () => 'm', generateStructured } as unknown as LlmService;
    const svc = new ChatQueryService(makeTasks(graph(BOARD)), llmErr);
    const ans = await svc.answer({ type: 'query', text: 'anything?' });
    expect(ans.inferencePath).toBe('deterministic');
    expect(ans.text).toMatch(/Board:/);
  });

  it('fails soft when the LLM returns an empty summary', async () => {
    const generateStructured = vi.fn(async () => ({ data: { summary: '   ' } }));
    const llmEmpty = { enabled: true, getActModel: () => 'm', generateStructured } as unknown as LlmService;
    const svc = new ChatQueryService(makeTasks(graph(BOARD)), llmEmpty);
    const ans = await svc.answer({ type: 'query', text: 'hmm' });
    expect(ans.inferencePath).toBe('deterministic');
  });
});
