import type { MidniteConfig } from '@midnite/shared';
import { describe, expect, it, vi } from 'vitest';
import type { LlmService } from '../agent/llm/llm.service';
import type { UsageService } from '../usage/usage.service';
import { ChatIntentService } from './chat-intent.service';

function makeService(
  llm: Partial<LlmService> = {},
  opts: { over?: boolean; preferLocal?: boolean } = {},
) {
  const usage = { checkBudget: vi.fn().mockReturnValue({ over: opts.over ?? false }) };
  const config = { chat: { preferLocal: opts.preferLocal ?? true } } as unknown as MidniteConfig;
  return new ChatIntentService(
    {
      enabled: false,
      activeProvider: 'anthropic',
      getActModel: () => 'claude-sonnet-4-6',
      isProviderEnabled: vi.fn().mockResolvedValue(false),
      generateStructuredVia: vi.fn(),
      ...llm,
    } as unknown as LlmService,
    usage as unknown as UsageService,
    config,
  );
}

describe('ChatIntentService', () => {
  it('parses a deterministic command with zero LLM calls', async () => {
    const generateStructuredVia = vi.fn();
    const svc = makeService({ enabled: true, generateStructuredVia });

    const parse = await svc.parse('add "fix login" p1 repo:api');

    expect(parse).toEqual({
      intent: { type: 'createTask', title: 'fix login', priority: 1, repo: 'api' },
      source: 'grammar',
      confidence: 1,
      inferencePath: 'deterministic',
    });
    expect(generateStructuredVia).not.toHaveBeenCalled();
  });

  it('falls back to the active paid provider for prose, tagging the chat usage feature', async () => {
    const generateStructuredVia = vi.fn().mockResolvedValue({
      data: {
        type: 'bulkCreate',
        titles: ['clean up auth', 'add tests'],
        priority: 2,
        // A flat model response sets inapplicable fields to null.
        title: null,
        goal: null,
        task: null,
      },
      model: 'm',
    });
    // preferLocal on, but no local provider configured → routes to the active paid provider.
    const svc = makeService({ enabled: true, activeProvider: 'anthropic', generateStructuredVia });

    const parse = await svc.parse('spin up a couple of tasks to clean up the auth module, high priority');

    expect(parse.source).toBe('llm');
    expect(parse.confidence).toBe(0.75);
    expect(parse.inferencePath).toBe('provider');
    expect(parse.intent).toEqual({
      type: 'bulkCreate',
      titles: ['clean up auth', 'add tests'],
      priority: 2,
    });
    // Routed via the active provider (undefined override) + tagged 'chat' (cost visibility).
    expect(generateStructuredVia.mock.calls[0]![0]).toBeUndefined();
    expect(generateStructuredVia.mock.calls[0]![2]).toBe('chat');
    expect(generateStructuredVia.mock.calls[0]![1].schemaName).toBe('record_intent');
  });

  it('prefers a configured local model over the active paid provider (zero API cost)', async () => {
    const generateStructuredVia = vi
      .fn()
      .mockResolvedValue({ data: { type: 'createTask', title: 'clean auth' }, model: 'm' });
    const isProviderEnabled = vi.fn().mockResolvedValue(true); // openai-compatible is configured
    const svc = makeService({
      enabled: true,
      activeProvider: 'anthropic',
      isProviderEnabled,
      generateStructuredVia,
    });

    const parse = await svc.parse('make a task to clean up auth');

    expect(parse.inferencePath).toBe('local');
    expect(isProviderEnabled).toHaveBeenCalledWith('openai-compatible');
    // Routed explicitly at the local provider rather than the active paid one.
    expect(generateStructuredVia.mock.calls[0]![0]).toBe('openai-compatible');
  });

  it('labels the path local when the active provider is itself openai-compatible', async () => {
    const generateStructuredVia = vi
      .fn()
      .mockResolvedValue({ data: { type: 'createTask', title: 'x' }, model: 'm' });
    const svc = makeService({
      enabled: true,
      activeProvider: 'openai-compatible',
      generateStructuredVia,
    });

    const parse = await svc.parse('make a task about x please');
    expect(parse.inferencePath).toBe('local');
    // Active provider is already local → no override needed.
    expect(generateStructuredVia.mock.calls[0]![0]).toBeUndefined();
  });

  it('does not prefer local when chat.preferLocal is off', async () => {
    const generateStructuredVia = vi
      .fn()
      .mockResolvedValue({ data: { type: 'createTask', title: 'x' }, model: 'm' });
    const isProviderEnabled = vi.fn().mockResolvedValue(true);
    const svc = makeService(
      { enabled: true, activeProvider: 'anthropic', isProviderEnabled, generateStructuredVia },
      { preferLocal: false },
    );

    const parse = await svc.parse('make a task about x please');
    expect(parse.inferencePath).toBe('provider');
    expect(isProviderEnabled).not.toHaveBeenCalled();
    expect(generateStructuredVia.mock.calls[0]![0]).toBeUndefined();
  });

  it('refuses with guidance when no provider is usable (no LLM call)', async () => {
    const generateStructuredVia = vi.fn();
    const svc = makeService({ enabled: false, generateStructuredVia });

    const parse = await svc.parse('what should I focus on?');
    expect(parse.intent.type).toBe('unknown');
    expect(parse.confidence).toBe(0);
    expect(parse.inferencePath).toBe('deterministic');
    if (parse.intent.type === 'unknown') expect(parse.intent.reason).toMatch(/configure/i);
    expect(generateStructuredVia).not.toHaveBeenCalled();
  });

  it('fails soft with a cap message when the paid budget cap is exceeded (no LLM call)', async () => {
    const generateStructuredVia = vi.fn();
    const svc = makeService(
      { enabled: true, activeProvider: 'anthropic', generateStructuredVia },
      { over: true },
    );

    const parse = await svc.parse('spin up some tasks to clean auth');
    expect(parse.intent.type).toBe('unknown');
    expect(parse.confidence).toBe(0);
    if (parse.intent.type === 'unknown') expect(parse.intent.reason).toMatch(/cap|paused/i);
    expect(generateStructuredVia).not.toHaveBeenCalled();
  });

  it('lets a free local call through even when the budget cap is exceeded', async () => {
    const generateStructuredVia = vi
      .fn()
      .mockResolvedValue({ data: { type: 'createTask', title: 'x' }, model: 'm' });
    const svc = makeService(
      {
        enabled: true,
        activeProvider: 'anthropic',
        isProviderEnabled: vi.fn().mockResolvedValue(true),
        generateStructuredVia,
      },
      { over: true },
    );

    const parse = await svc.parse('make a task about x please');
    expect(parse.inferencePath).toBe('local');
    expect(generateStructuredVia).toHaveBeenCalled();
  });

  it('returns a low-confidence unknown when the model output is invalid', async () => {
    const generateStructuredVia = vi.fn().mockResolvedValue({ data: { type: 'nonsense' }, model: 'm' });
    const svc = makeService({ enabled: true, activeProvider: 'anthropic', generateStructuredVia });

    const parse = await svc.parse('do something weird');
    expect(parse.intent.type).toBe('unknown');
    expect(parse.source).toBe('llm');
    expect(parse.confidence).toBeLessThan(0.5);
    expect(parse.inferencePath).toBe('provider');
  });

  it('assigns low confidence to an LLM unknown intent', async () => {
    const generateStructuredVia = vi
      .fn()
      .mockResolvedValue({ data: { type: 'unknown', text: 'huh', reason: 'unclear' }, model: 'm' });
    const svc = makeService({ enabled: true, activeProvider: 'anthropic', generateStructuredVia });

    const parse = await svc.parse('huh');
    expect(parse.intent).toEqual({ type: 'unknown', text: 'huh', reason: 'unclear' });
    expect(parse.confidence).toBe(0.3);
  });

  it('degrades to unknown (no throw) when the provider call fails', async () => {
    const generateStructuredVia = vi.fn().mockRejectedValue(new Error('boom'));
    const svc = makeService({ enabled: true, activeProvider: 'anthropic', generateStructuredVia });

    const parse = await svc.parse('what should I do next?');
    expect(parse.intent.type).toBe('unknown');
    expect(parse.confidence).toBe(0);
    expect(parse.inferencePath).toBe('deterministic');
  });
});
