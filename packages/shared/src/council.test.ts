import { describe, expect, it } from 'vitest';
import {
  COUNCIL_FORMATS,
  COUNCIL_FORMATS_META,
  CouncilRunSchema,
  CouncilSchema,
  CouncilSynthesisEntrySchema,
  CreateCouncilMemberRequestSchema,
  CreateCouncilRequestSchema,
  RetryCouncilSynthesisRequestSchema,
  StartCouncilRunRequestSchema,
} from './council';

describe('CouncilSchema', () => {
  it('round-trips a council with members', () => {
    const council = {
      id: 'c1',
      name: 'Tech direction',
      description: 'architecture calls',
      synthProvider: 'gemini',
      defaultFormat: 'brainstorm',
      customPrompt: 'Summarize as a memo.',
      members: [
        {
          id: 'm1',
          councilId: 'c1',
          name: 'Optimist',
          provider: 'claude',
          role: 'argue for shipping fast',
          position: 0,
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
        synthProvider: 'gemini',
        defaultFormat: 'brainstorm',
        members: [
          {
            id: 'm1',
            councilId: 'c1',
            name: '',
            provider: 'gpt-9',
            role: '',
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

  it('rejects an unknown default format', () => {
    expect(
      CouncilSchema.safeParse({
        id: 'c1',
        name: 'x',
        synthProvider: 'gemini',
        defaultFormat: 'rave',
        members: [],
        createdAt: '',
        updatedAt: '',
      }).success,
    ).toBe(false);
  });
});

describe('CouncilSynthesisEntrySchema', () => {
  it('round-trips an anonymized entry with a label map', () => {
    const entry = {
      format: 'debate' as const,
      synthesis: '## Verdict\n\nMember B made the strongest case.',
      synthProvider: 'gemini' as const,
      anonymized: true,
      labelMap: { A: 'rm2', B: 'rm1' },
      finishedAt: '2026-06-11T00:02:00.000Z',
    };
    expect(CouncilSynthesisEntrySchema.parse(entry)).toEqual(entry);
  });

  it('defaults anonymized to false and allows no label map', () => {
    const parsed = CouncilSynthesisEntrySchema.parse({
      format: 'brainstorm',
      synthesis: '# Shortlist',
      finishedAt: '2026-06-11T00:02:00.000Z',
    });
    expect(parsed.anonymized).toBe(false);
    expect(parsed.labelMap).toBeUndefined();
  });
});

describe('CouncilRunSchema', () => {
  it('round-trips a completed run with a synthesis archive', () => {
    const run = {
      id: 'r1',
      councilId: 'c1',
      prompt: 'Rewrite in Rust?',
      format: 'debate',
      status: 'completed',
      synthProvider: 'gemini',
      synthesis: '## Verdict\n\nMember B made the strongest case.',
      syntheses: [
        {
          format: 'debate',
          synthesis: '## Verdict\n\nMember B made the strongest case.',
          synthProvider: 'gemini',
          anonymized: true,
          labelMap: { A: 'rm1', B: 'rm1' },
          finishedAt: '2026-06-11T00:02:00.000Z',
        },
      ],
      members: [
        {
          id: 'rm1',
          runId: 'r1',
          memberId: 'm1',
          name: 'Optimist',
          provider: 'claude',
          role: 'argue for',
          status: 'succeeded',
          terminalId: 'council-r1-m1',
          output: 'Yes.',
          exitCode: 0,
          startedAt: '2026-06-11T00:00:00.000Z',
          finishedAt: '2026-06-11T00:01:00.000Z',
        },
      ],
      startedAt: '2026-06-11T00:00:00.000Z',
      finishedAt: '2026-06-11T00:02:00.000Z',
    };
    expect(CouncilRunSchema.parse(run)).toEqual(run);
  });

  it('defaults syntheses to an empty array', () => {
    const parsed = CouncilRunSchema.parse({
      id: 'r1',
      councilId: 'c1',
      prompt: 't',
      format: 'brainstorm',
      status: 'running',
      members: [],
      startedAt: '',
    });
    expect(parsed.syntheses).toEqual([]);
  });

  it('rejects an unknown run status', () => {
    expect(
      CouncilRunSchema.safeParse({
        id: 'r1',
        councilId: 'c1',
        prompt: 't',
        format: 'brainstorm',
        status: 'paused',
        members: [],
        startedAt: '',
      }).success,
    ).toBe(false);
  });
});

describe('format metadata', () => {
  it('has metadata for every format', () => {
    for (const f of COUNCIL_FORMATS) {
      expect(COUNCIL_FORMATS_META[f].key).toBe(f);
      expect(COUNCIL_FORMATS_META[f].label.length).toBeGreaterThan(0);
      expect(COUNCIL_FORMATS_META[f].iconKey.length).toBeGreaterThan(0);
    }
  });

  it('anonymizes debate and critique, attributes the rest', () => {
    expect(COUNCIL_FORMATS_META.debate.anonymize).toBe(true);
    expect(COUNCIL_FORMATS_META.critique.anonymize).toBe(true);
    expect(COUNCIL_FORMATS_META.brainstorm.anonymize).toBe(false);
    expect(COUNCIL_FORMATS_META.analyse.anonymize).toBe(false);
    expect(COUNCIL_FORMATS_META.motivate.anonymize).toBe(false);
    expect(COUNCIL_FORMATS_META.demotivate.anonymize).toBe(false);
    expect(COUNCIL_FORMATS_META.custom.anonymize).toBe(false);
  });
});

describe('request schemas', () => {
  it('trims and bounds the council name', () => {
    expect(CreateCouncilRequestSchema.parse({ name: '  panel  ' }).name).toBe('panel');
    expect(CreateCouncilRequestSchema.safeParse({ name: '   ' }).success).toBe(false);
  });

  it('allows a blank member create', () => {
    expect(CreateCouncilMemberRequestSchema.parse({})).toEqual({});
  });

  it('requires a non-empty prompt to start a run, and bounds the format', () => {
    expect(StartCouncilRunRequestSchema.safeParse({ prompt: '  ' }).success).toBe(false);
    expect(StartCouncilRunRequestSchema.parse({ prompt: ' go ' }).prompt).toBe('go');
    expect(StartCouncilRunRequestSchema.safeParse({ prompt: 'go', format: 'rave' }).success).toBe(
      false,
    );
  });

  it('allows an empty synthesis-retry body and bounds the format', () => {
    expect(RetryCouncilSynthesisRequestSchema.parse({})).toEqual({});
    expect(RetryCouncilSynthesisRequestSchema.parse({ format: 'analyse' }).format).toBe('analyse');
    expect(RetryCouncilSynthesisRequestSchema.safeParse({ format: 'nope' }).success).toBe(false);
  });
});
