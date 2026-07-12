import { describe, expect, it } from 'vitest';
import {
  NODE_TYPE_DEFINITIONS,
  SlackMessageParamsSchema,
  evaluateBranchCondition,
  getNodeTypeDefinition,
  listNodeTypes,
} from './node-types.js';
import { LLM_PROVIDER_MODEL_SUGGESTIONS } from './llm.js';
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
      expect(ok.data.model).toBe('sonnet4.6');
      expect(ok.data.maxTokens).toBe(1024);
    }
  });

  it('defaults ai.claude to a canonical, currently-supported model alias', () => {
    // Guards against re-introducing a retired alias (e.g. the old `sonnet4.7`,
    // whose dated id 404'd) as the default — it must be one the adapter advertises.
    const def = getNodeTypeDefinition('ai.claude')!;
    const parsed = def.paramsSchema.parse({ prompt: 'hi' }) as { model: string };
    expect(LLM_PROVIDER_MODEL_SUGGESTIONS.anthropic).toContain(parsed.model);
  });
});

describe('reshape nodes (Phase 12 Theme C)', () => {
  it('registers setData / merge / filter with the right categories', () => {
    expect(getNodeTypeDefinition('logic.setData')!.category).toBe('logic');
    expect(getNodeTypeDefinition('logic.merge')!.category).toBe('logic');
    expect(getNodeTypeDefinition('data.filter')!.category).toBe('data');
  });

  it('defaults setData to replace mode with an empty fields object', () => {
    const ok = getNodeTypeDefinition('logic.setData')!.paramsSchema.safeParse({});
    expect(ok.success).toBe(true);
    if (ok.success) expect(ok.data).toEqual({ mode: 'replace', fields: {} });
  });

  it('defaults merge to shallowMerge and rejects an unknown mode', () => {
    const def = getNodeTypeDefinition('logic.merge')!;
    const ok = def.paramsSchema.safeParse({});
    expect(ok.success).toBe(true);
    if (ok.success) expect(ok.data.mode).toBe('shallowMerge');
    expect(def.paramsSchema.safeParse({ mode: 'bogus' }).success).toBe(false);
  });

  it('defaults data.filter to pick with an empty field list', () => {
    const ok = getNodeTypeDefinition('data.filter')!.paramsSchema.safeParse({});
    expect(ok.success).toBe(true);
    if (ok.success) expect(ok.data).toEqual({ mode: 'pick', fields: [] });
  });

  it('registers storage.set / storage.get in the storage category', () => {
    expect(getNodeTypeDefinition('storage.set')!.category).toBe('storage');
    expect(getNodeTypeDefinition('storage.get')!.category).toBe('storage');
  });

  it('requires a non-empty key on storage nodes', () => {
    expect(getNodeTypeDefinition('storage.set')!.paramsSchema.safeParse({ value: 1 }).success).toBe(false);
    expect(getNodeTypeDefinition('storage.set')!.paramsSchema.safeParse({ key: '', value: 1 }).success).toBe(false);
    expect(getNodeTypeDefinition('storage.get')!.paramsSchema.safeParse({ key: 'k' }).success).toBe(true);
  });
});

describe('reporting nodes (Phase 62 Theme C)', () => {
  it('registers the four reporting nodes as actions', () => {
    for (const id of [
      'midnite.generate-retro',
      'midnite.list-completed-tasks',
      'midnite.build-digest',
      'midnite.notify',
    ]) {
      expect(getNodeTypeDefinition(id)!.category).toBe('action');
    }
  });

  it('generate-retro accepts an optional taskId', () => {
    const def = getNodeTypeDefinition('midnite.generate-retro')!;
    expect(def.paramsSchema.safeParse({}).success).toBe(true);
    expect(def.paramsSchema.safeParse({ taskId: 't1' }).success).toBe(true);
  });

  it('list-completed-tasks defaults sinceHours to 24', () => {
    const ok = getNodeTypeDefinition('midnite.list-completed-tasks')!.paramsSchema.safeParse({});
    expect(ok.success).toBe(true);
    if (ok.success) expect((ok.data as { sinceHours: number }).sinceHours).toBe(24);
  });

  it('build-digest defaults sinceHours and takes optional from/to/repo', () => {
    const def = getNodeTypeDefinition('midnite.build-digest')!;
    const ok = def.paramsSchema.safeParse({ from: '2026-07-01T00:00:00.000Z', repo: 'midnite' });
    expect(ok.success).toBe(true);
    if (ok.success) expect((ok.data as { sinceHours: number }).sinceHours).toBe(24);
  });

  it('notify requires title + body and defaults kind/severity', () => {
    const def = getNodeTypeDefinition('midnite.notify')!;
    expect(def.paramsSchema.safeParse({ title: 't' }).success).toBe(false);
    const ok = def.paramsSchema.safeParse({ title: 't', body: 'b' });
    expect(ok.success).toBe(true);
    if (ok.success) {
      const data = ok.data as { kind: string; severity: string };
      expect(data.kind).toBe('digest.generated');
      expect(data.severity).toBe('info');
    }
    expect(def.paramsSchema.safeParse({ title: 't', body: 'b', kind: 'bogus' }).success).toBe(false);
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

describe('slack.message params', () => {
  it('accepts a resolved Block Kit array for blocks', () => {
    const parsed = SlackMessageParamsSchema.parse({
      credentialId: 'c1',
      channel: '#d',
      text: 'hi',
      blocks: [{ type: 'section' }],
    });
    expect(parsed.blocks).toEqual([{ type: 'section' }]);
  });

  it('accepts an unresolved {{expr}} string for blocks (survives raw graph validation)', () => {
    const parsed = SlackMessageParamsSchema.parse({
      credentialId: 'c1',
      channel: '#d',
      text: 'hi',
      blocks: '{{ $json.blocks }}',
    });
    expect(parsed.blocks).toBe('{{ $json.blocks }}');
  });

  it('leaves blocks optional', () => {
    const parsed = SlackMessageParamsSchema.parse({ credentialId: 'c1', channel: '#d', text: 'hi' });
    expect(parsed.blocks).toBeUndefined();
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
