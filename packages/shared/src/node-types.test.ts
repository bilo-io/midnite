import { describe, expect, it } from 'vitest';
import {
  NODE_TYPE_DEFINITIONS,
  evaluateBranchCondition,
  getNodeTypeDefinition,
  listNodeTypes,
} from './node-types.js';
import { TriggerSchema } from './trigger.js';
import { WorkflowSchema } from './workflow.js';

describe('node-type registry', () => {
  it('exposes the MVP node types', () => {
    const ids = listNodeTypes().map((d) => d.id);
    expect(ids).toEqual(
      expect.arrayContaining([
        'trigger.manual',
        'trigger.schedule',
        'trigger.webhook',
        'http.request',
        'ai.claude',
      ]),
    );
  });

  it('every definition has a matching id key and a params schema', () => {
    for (const [key, def] of Object.entries(NODE_TYPE_DEFINITIONS)) {
      expect(def.id).toBe(key);
      expect(def.paramsSchema).toBeDefined();
    }
  });

  it('validates http.request params and rejects a bad url', () => {
    const def = getNodeTypeDefinition('http.request')!;
    const ok = def.paramsSchema.safeParse({ url: 'https://example.com/data' });
    expect(ok.success).toBe(true);
    if (ok.success) {
      expect(ok.data.method).toBe('GET'); // default applied
      expect(ok.data.timeoutMs).toBe(10000);
    }
    expect(def.paramsSchema.safeParse({ url: 'not-a-url' }).success).toBe(false);
  });

  it('requires a prompt for ai.claude and defaults the model', () => {
    const def = getNodeTypeDefinition('ai.claude')!;
    expect(def.paramsSchema.safeParse({}).success).toBe(false);
    const ok = def.paramsSchema.safeParse({ prompt: 'hello' });
    expect(ok.success).toBe(true);
    if (ok.success) {
      expect(ok.data.model).toBe('sonnet4.7');
      expect(ok.data.maxTokens).toBe(1024);
    }
  });
});

describe('branch node', () => {
  it('is registered as a logic node with true/false ports', () => {
    const def = getNodeTypeDefinition('logic.branch')!;
    expect(def.category).toBe('logic');
    expect(def.outputs.map((p) => p.name)).toEqual(['true', 'false']);
  });

  it('resolves a dot-path and applies the operator', () => {
    const input = { body: { status: 'ok', count: 5 } };
    expect(evaluateBranchCondition(input, { left: 'body.status', operator: 'equals', right: 'ok' })).toBe(true);
    expect(evaluateBranchCondition(input, { left: 'body.status', operator: 'equals', right: 'no' })).toBe(false);
    expect(evaluateBranchCondition(input, { left: 'body.count', operator: 'gt', right: '3' })).toBe(true);
    expect(evaluateBranchCondition(input, { left: 'body.count', operator: 'lt', right: '3' })).toBe(false);
    expect(evaluateBranchCondition(input, { left: 'body.status', operator: 'contains', right: 'o' })).toBe(true);
  });

  it('tests the whole input when no path is given, and defaults to isTruthy', () => {
    expect(evaluateBranchCondition(true, {})).toBe(true);
    expect(evaluateBranchCondition(0, {})).toBe(false);
    expect(evaluateBranchCondition(null, { operator: 'isFalsy' })).toBe(true);
  });

  it('returns false for a missing path rather than throwing', () => {
    expect(evaluateBranchCondition({}, { left: 'a.b.c', operator: 'isTruthy' })).toBe(false);
    expect(evaluateBranchCondition({}, { left: 'a.b.c', operator: 'equals', right: 'x' })).toBe(false);
  });
});

describe('trigger contract', () => {
  it('discriminates and applies defaults', () => {
    const schedule = TriggerSchema.parse({ type: 'schedule', cron: '0 9 * * *' });
    expect(schedule.type).toBe('schedule');
    if (schedule.type === 'schedule') expect(schedule.timezone).toBe('UTC');

    const webhook = TriggerSchema.parse({ type: 'webhook' });
    if (webhook.type === 'webhook') {
      expect(webhook.method).toBe('POST');
      expect(webhook.hasSecret).toBe(false);
    }
  });
});

describe('workflow contract', () => {
  it('parses with default empty graph and disabled flag', () => {
    const wf = WorkflowSchema.parse({
      id: 'w1',
      name: 'Demo',
      trigger: { type: 'manual' },
      createdAt: '2026-06-07T00:00:00.000Z',
      updatedAt: '2026-06-07T00:00:00.000Z',
    });
    expect(wf.enabled).toBe(false);
    expect(wf.nodes).toEqual([]);
    expect(wf.edges).toEqual([]);
  });
});
