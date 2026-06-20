import { describe, expect, it } from 'vitest';
import { AgentPingResponseSchema } from './agent.js';

describe('AgentPingResponseSchema', () => {
  it('round-trips a successful ping', () => {
    const res = {
      ok: true,
      cli: 'claude',
      model: 'claude-opus-4-8',
      reply: 'pong',
    };
    expect(AgentPingResponseSchema.parse(res)).toEqual(res);
  });

  it('rejects an unknown cli', () => {
    expect(
      AgentPingResponseSchema.safeParse({
        ok: false,
        cli: 'cursor',
        model: '',
        reply: 'disabled',
      }).success,
    ).toBe(false);
  });

  it('requires every field', () => {
    expect(AgentPingResponseSchema.safeParse({ ok: true, cli: 'claude' }).success).toBe(false);
  });
});
