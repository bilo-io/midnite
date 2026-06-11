import { describe, expect, it } from 'vitest';
import {
  CouncilRunSchema,
  CouncilSchema,
  CreateCouncilParticipantRequestSchema,
  CreateCouncilRequestSchema,
  StartCouncilRunRequestSchema,
} from './council';

describe('CouncilSchema', () => {
  it('round-trips a council with participants', () => {
    const council = {
      id: 'c1',
      name: 'Tech direction',
      description: 'architecture calls',
      verdictProvider: 'gemini',
      participants: [
        {
          id: 'p1',
          councilId: 'c1',
          name: 'Optimist',
          provider: 'claude',
          perspective: 'argue for shipping fast',
          createdAt: '2026-06-11T00:00:00.000Z',
          updatedAt: '2026-06-11T00:00:00.000Z',
        },
      ],
      createdAt: '2026-06-11T00:00:00.000Z',
      updatedAt: '2026-06-11T00:00:00.000Z',
    };
    expect(CouncilSchema.parse(council)).toEqual(council);
  });

  it('rejects an unknown provider', () => {
    expect(
      CouncilSchema.safeParse({
        id: 'c1',
        name: 'x',
        verdictProvider: 'gemini',
        participants: [
          {
            id: 'p1',
            councilId: 'c1',
            name: '',
            provider: 'gpt-9',
            perspective: '',
            createdAt: '',
            updatedAt: '',
          },
        ],
        createdAt: '',
        updatedAt: '',
      }).success,
    ).toBe(false);
  });
});

describe('CouncilRunSchema', () => {
  it('round-trips a completed run with labels', () => {
    const run = {
      id: 'r1',
      councilId: 'c1',
      topic: 'Rewrite in Rust?',
      status: 'completed',
      verdict: '## Verdict\n\nParticipant B made the strongest case.',
      participants: [
        {
          id: 'rp1',
          runId: 'r1',
          participantId: 'p1',
          name: 'Optimist',
          provider: 'claude',
          perspective: 'argue for',
          status: 'succeeded',
          terminalId: 'council-r1-p1',
          output: 'Yes.',
          exitCode: 0,
          label: 'B',
          startedAt: '2026-06-11T00:00:00.000Z',
          finishedAt: '2026-06-11T00:01:00.000Z',
        },
      ],
      startedAt: '2026-06-11T00:00:00.000Z',
      finishedAt: '2026-06-11T00:02:00.000Z',
    };
    expect(CouncilRunSchema.parse(run)).toEqual(run);
  });

  it('rejects an unknown run status', () => {
    expect(
      CouncilRunSchema.safeParse({
        id: 'r1',
        councilId: 'c1',
        topic: 't',
        status: 'paused',
        participants: [],
        startedAt: '',
      }).success,
    ).toBe(false);
  });
});

describe('request schemas', () => {
  it('trims and bounds the council name', () => {
    expect(CreateCouncilRequestSchema.parse({ name: '  panel  ' }).name).toBe('panel');
    expect(CreateCouncilRequestSchema.safeParse({ name: '   ' }).success).toBe(false);
  });

  it('allows a blank participant create', () => {
    expect(CreateCouncilParticipantRequestSchema.parse({})).toEqual({});
  });

  it('requires a non-empty topic to start a run', () => {
    expect(StartCouncilRunRequestSchema.safeParse({ topic: '  ' }).success).toBe(false);
    expect(StartCouncilRunRequestSchema.parse({ topic: ' go ' }).topic).toBe('go');
  });
});
