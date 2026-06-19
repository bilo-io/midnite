import { describe, expect, it } from 'vitest';
import {
  BrainstormRunSchema,
  BrainstormSchema,
  CreateBrainstormContributorRequestSchema,
  CreateBrainstormRequestSchema,
  RetryBrainstormSynthesisRequestSchema,
  StartBrainstormRunRequestSchema,
} from './brainstorm';

describe('BrainstormSchema', () => {
  it('round-trips a brainstorm with contributors', () => {
    const brainstorm = {
      id: 'b1',
      name: 'Growth ideas',
      description: 'where to invest next quarter',
      synthProvider: 'gemini',
      defaultMode: 'shortlist',
      contributors: [
        {
          id: 'c1',
          brainstormId: 'b1',
          name: 'First principles',
          provider: 'claude',
          lens: 'reason up from the fundamentals',
          position: 0,
          createdAt: '2026-06-19T00:00:00.000Z',
          updatedAt: '2026-06-19T00:00:00.000Z',
        },
      ],
      createdAt: '2026-06-19T00:00:00.000Z',
      updatedAt: '2026-06-19T00:00:00.000Z',
    };
    expect(BrainstormSchema.parse(brainstorm)).toEqual(brainstorm);
  });

  it('rejects an unknown provider', () => {
    expect(
      BrainstormSchema.safeParse({
        id: 'b1',
        name: 'x',
        synthProvider: 'gemini',
        defaultMode: 'shortlist',
        contributors: [
          {
            id: 'c1',
            brainstormId: 'b1',
            name: '',
            provider: 'gpt-9',
            lens: '',
            position: 0,
            createdAt: '',
            updatedAt: '',
          },
        ],
        createdAt: '',
        updatedAt: '',
      }).success,
    ).toBe(false);
  });

  it('rejects an unknown synthesis mode', () => {
    expect(
      BrainstormSchema.safeParse({
        id: 'b1',
        name: 'x',
        synthProvider: 'gemini',
        defaultMode: 'rank-by-vibes',
        contributors: [],
        createdAt: '',
        updatedAt: '',
      }).success,
    ).toBe(false);
  });
});

describe('BrainstormRunSchema', () => {
  it('round-trips a completed run (attributed, no labels)', () => {
    const run = {
      id: 'r1',
      brainstormId: 'b1',
      prompt: 'Where should we expand?',
      mode: 'opportunities',
      status: 'completed',
      synthProvider: 'gemini',
      synthesis: '## Opportunities\n\nThe strongest is the SMB self-serve wedge.',
      contributors: [
        {
          id: 'rc1',
          runId: 'r1',
          contributorId: 'c1',
          name: 'First principles',
          provider: 'claude',
          lens: 'reason up from fundamentals',
          status: 'succeeded',
          terminalId: 'brainstorm-r1-rc1',
          output: '- Idea: self-serve onboarding',
          exitCode: 0,
          startedAt: '2026-06-19T00:00:00.000Z',
          finishedAt: '2026-06-19T00:01:00.000Z',
        },
      ],
      startedAt: '2026-06-19T00:00:00.000Z',
      finishedAt: '2026-06-19T00:02:00.000Z',
    };
    expect(BrainstormRunSchema.parse(run)).toEqual(run);
  });

  it('rejects an unknown run status', () => {
    expect(
      BrainstormRunSchema.safeParse({
        id: 'r1',
        brainstormId: 'b1',
        prompt: 'p',
        mode: 'shortlist',
        status: 'paused',
        contributors: [],
        startedAt: '',
      }).success,
    ).toBe(false);
  });
});

describe('request schemas', () => {
  it('trims and bounds the brainstorm name', () => {
    expect(CreateBrainstormRequestSchema.parse({ name: '  panel  ' }).name).toBe('panel');
    expect(CreateBrainstormRequestSchema.safeParse({ name: '   ' }).success).toBe(false);
  });

  it('allows a blank contributor create', () => {
    expect(CreateBrainstormContributorRequestSchema.parse({})).toEqual({});
  });

  it('requires a non-empty prompt, with an optional mode', () => {
    expect(StartBrainstormRunRequestSchema.safeParse({ prompt: '  ' }).success).toBe(false);
    expect(StartBrainstormRunRequestSchema.parse({ prompt: ' go ' }).prompt).toBe('go');
    expect(StartBrainstormRunRequestSchema.parse({ prompt: 'go', mode: 'gaps' }).mode).toBe('gaps');
  });

  it('accepts an empty synthesis-retry body (keep current mode)', () => {
    expect(RetryBrainstormSynthesisRequestSchema.parse({})).toEqual({});
    expect(RetryBrainstormSynthesisRequestSchema.parse({ mode: 'combine' }).mode).toBe('combine');
  });
});
