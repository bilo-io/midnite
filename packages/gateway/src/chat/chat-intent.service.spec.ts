import { describe, expect, it, vi } from 'vitest';
import type { LlmService } from '../agent/llm/llm.service';
import { ChatIntentService } from './chat-intent.service';

function makeService(llm: Partial<LlmService>) {
  return new ChatIntentService({
    enabled: false,
    getActModel: () => 'claude-sonnet-4-6',
    generateStructured: vi.fn(),
    ...llm,
  } as unknown as LlmService);
}

describe('ChatIntentService', () => {
  it('parses a deterministic command with zero LLM calls', async () => {
    const generateStructured = vi.fn();
    const svc = makeService({ enabled: true, generateStructured });

    const parse = await svc.parse('add "fix login" p1 repo:api');

    expect(parse).toEqual({
      intent: { type: 'createTask', title: 'fix login', priority: 1, repo: 'api' },
      source: 'grammar',
      confidence: 1,
    });
    expect(generateStructured).not.toHaveBeenCalled();
  });

  it('falls back to the LLM for prose, tagging the chat usage feature', async () => {
    const generateStructured = vi.fn().mockResolvedValue({
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
    const svc = makeService({ enabled: true, generateStructured });

    const parse = await svc.parse('spin up a couple of tasks to clean up the auth module, high priority');

    expect(parse.source).toBe('llm');
    expect(parse.confidence).toBe(0.75);
    expect(parse.intent).toEqual({
      type: 'bulkCreate',
      titles: ['clean up auth', 'add tests'],
      priority: 2,
    });
    // Usage is tagged 'chat' (Theme D cost visibility).
    expect(generateStructured.mock.calls[0]![1]).toBe('chat');
    expect(generateStructured.mock.calls[0]![0].schemaName).toBe('record_intent');
  });

  it('returns a low-confidence unknown when the model output is invalid', async () => {
    const generateStructured = vi.fn().mockResolvedValue({ data: { type: 'nonsense' }, model: 'm' });
    const svc = makeService({ enabled: true, generateStructured });

    const parse = await svc.parse('do something weird');
    expect(parse.intent.type).toBe('unknown');
    expect(parse.source).toBe('llm');
    expect(parse.confidence).toBeLessThan(0.5);
  });

  it('assigns low confidence to an LLM unknown intent', async () => {
    const generateStructured = vi
      .fn()
      .mockResolvedValue({ data: { type: 'unknown', text: 'huh', reason: 'unclear' }, model: 'm' });
    const svc = makeService({ enabled: true, generateStructured });

    const parse = await svc.parse('huh');
    expect(parse.intent).toEqual({ type: 'unknown', text: 'huh', reason: 'unclear' });
    expect(parse.confidence).toBe(0.3);
  });

  it('degrades to unknown (no throw) when the provider call fails', async () => {
    const generateStructured = vi.fn().mockRejectedValue(new Error('boom'));
    const svc = makeService({ enabled: true, generateStructured });

    const parse = await svc.parse('what should I do next?');
    expect(parse.intent.type).toBe('unknown');
    expect(parse.confidence).toBe(0);
  });

  it('does not call the LLM when no provider is configured', async () => {
    const generateStructured = vi.fn();
    const svc = makeService({ enabled: false, generateStructured });

    const parse = await svc.parse('what should I focus on?');
    expect(parse.intent.type).toBe('unknown');
    if (parse.intent.type === 'unknown') expect(parse.intent.reason).toMatch(/configured/i);
    expect(generateStructured).not.toHaveBeenCalled();
  });
});
