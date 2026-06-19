import { describe, expect, it } from 'vitest';
import type {
  Council,
  CouncilRun,
  CouncilRunMember,
  CouncilSynthesisEntry,
} from '@midnite/shared';
import { buildCouncilRunReport, councilReportFilename } from './council-report';

const NOW = new Date('2026-06-19T12:00:00.000Z');

function council(overrides: Partial<Council> = {}): Council {
  return {
    id: 'c1',
    name: 'Product Council',
    synthProvider: 'gemini',
    defaultFormat: 'brainstorm',
    members: [],
    createdAt: '2026-06-01T00:00:00.000Z',
    updatedAt: '2026-06-01T00:00:00.000Z',
    ...overrides,
  };
}

function member(overrides: Partial<CouncilRunMember> = {}): CouncilRunMember {
  return {
    id: 'rm1',
    runId: 'r1',
    memberId: 'm1',
    name: 'Optimist',
    provider: 'claude',
    role: 'Make the strongest case in favour.',
    status: 'succeeded',
    terminalId: 't1',
    output: 'I think we should ship it.',
    startedAt: '2026-06-19T11:00:00.000Z',
    finishedAt: '2026-06-19T11:05:00.000Z',
    ...overrides,
  };
}

function run(overrides: Partial<CouncilRun> = {}): CouncilRun {
  return {
    id: 'r1',
    councilId: 'c1',
    prompt: 'Should we rewrite the gateway in Rust?',
    format: 'brainstorm',
    status: 'completed',
    synthProvider: 'gemini',
    syntheses: [],
    members: [],
    startedAt: '2026-06-19T11:00:00.000Z',
    finishedAt: '2026-06-19T11:10:00.000Z',
    ...overrides,
  };
}

function synthesis(overrides: Partial<CouncilSynthesisEntry> = {}): CouncilSynthesisEntry {
  return {
    format: 'brainstorm',
    synthesis: '## Top ideas\n\n1. Incremental rewrite.',
    synthProvider: 'gemini',
    anonymized: false,
    finishedAt: '2026-06-19T11:10:00.000Z',
    ...overrides,
  };
}

describe('buildCouncilRunReport — attributed format', () => {
  const md = buildCouncilRunReport(
    council({
      members: [
        {
          id: 'm1',
          councilId: 'c1',
          name: 'Optimist',
          provider: 'claude',
          role: 'r',
          position: 0,
          createdAt: '',
          updatedAt: '',
        },
      ],
    }),
    run({
      syntheses: [synthesis()],
      members: [
        member({ id: 'rm1', name: 'Optimist', provider: 'claude', output: 'Ship it.' }),
        member({
          id: 'rm2',
          name: 'Skeptic',
          provider: 'gemini',
          role: 'Argue the contrary view.',
          output: 'Too risky.',
        }),
      ],
    }),
    { now: NOW },
  );

  it('opens with a title carrying the council name and active format label', () => {
    expect(md).toMatch(/^# Product Council — Brainstorm/);
  });

  it('includes the export date and the prompt', () => {
    expect(md).toContain('*Exported 2026-06-19*');
    expect(md).toContain('## Prompt');
    expect(md).toContain('Should we rewrite the gateway in Rust?');
  });

  it('renders the active synthesis under a format-labelled heading', () => {
    expect(md).toContain('## Synthesis — Brainstorm');
    expect(md).toContain('Incremental rewrite.');
  });

  it('lists members by name with provider, role, and captured output', () => {
    expect(md).toContain('### Optimist');
    expect(md).toContain('### Skeptic');
    expect(md).toContain('Claude');
    expect(md).toContain('Gemini');
    expect(md).toContain('**Role:** Argue the contrary view.');
    expect(md).toContain('Ship it.');
    expect(md).toContain('Too risky.');
  });

  it('emits no label legend for an attributed synthesis', () => {
    expect(md).not.toContain('Label legend');
  });
});

describe('buildCouncilRunReport — anonymized format with labelMap legend', () => {
  const md = buildCouncilRunReport(
    council(),
    run({
      format: 'debate',
      syntheses: [
        synthesis({
          format: 'debate',
          synthesis: 'Member A made the strongest case.',
          anonymized: true,
          labelMap: { A: 'rm2', B: 'rm1' },
        }),
      ],
      members: [
        member({ id: 'rm1', name: 'Optimist', output: 'Yes.' }),
        member({ id: 'rm2', name: 'Skeptic', output: 'No.' }),
      ],
    }),
    { now: NOW },
  );

  it('uses the debate format label in the heading', () => {
    expect(md).toMatch(/^# Product Council — Debate/);
    expect(md).toContain('## Synthesis — Debate');
  });

  it('renders a de-anonymization legend resolving A/B back to member names', () => {
    expect(md).toContain('Label legend');
    expect(md).toContain('**A** → Skeptic');
    expect(md).toContain('**B** → Optimist');
  });
});

describe('buildCouncilRunReport — multiple syntheses', () => {
  const md = buildCouncilRunReport(
    council(),
    run({
      format: 'debate',
      syntheses: [
        synthesis({ format: 'brainstorm', synthesis: 'Brainstorm distillation.' }),
        synthesis({ format: 'debate', synthesis: 'Debate verdict.', finishedAt: '2026-06-19T11:20:00.000Z' }),
      ],
      members: [member()],
    }),
    { now: NOW },
  );

  it('promotes the active (debate) format to the main Synthesis section', () => {
    const synthHeading = md.indexOf('## Synthesis — Debate');
    const archivedHeading = md.indexOf('## Archived syntheses');
    expect(synthHeading).toBeGreaterThan(-1);
    expect(archivedHeading).toBeGreaterThan(synthHeading);
    expect(md).toContain('Debate verdict.');
  });

  it('lists the other format under archived syntheses', () => {
    expect(md).toContain('## Archived syntheses');
    expect(md).toContain('## Synthesis — Brainstorm');
    expect(md).toContain('Brainstorm distillation.');
  });
});

describe('buildCouncilRunReport — missing / failed members', () => {
  const md = buildCouncilRunReport(
    council(),
    run({
      status: 'completed',
      syntheses: [synthesis()],
      members: [
        member({ id: 'rm1', name: 'Optimist', status: 'succeeded', output: 'Ship it.' }),
        member({
          id: 'rm2',
          name: 'Skeptic',
          status: 'failed',
          output: undefined,
          error: 'process exited with code 1',
          finishedAt: '2026-06-19T11:02:00.000Z',
        }),
        member({
          id: 'rm3',
          name: 'Pragmatist',
          status: 'timeout',
          output: undefined,
          error: undefined,
        }),
      ],
    }),
    { now: NOW },
  );

  it('surfaces a failed member with its error and status', () => {
    expect(md).toContain('### Skeptic');
    expect(md).toContain('failed');
    expect(md).toContain('process exited with code 1');
  });

  it('marks a member with no output and no error explicitly', () => {
    expect(md).toContain('### Pragmatist');
    expect(md).toContain('timed out');
    expect(md).toContain('_(no output captured)_');
  });
});

describe('buildCouncilRunReport — no synthesis recorded', () => {
  it('falls back to a placeholder synthesis section', () => {
    const md = buildCouncilRunReport(
      council(),
      run({ status: 'failed', syntheses: [], synthesis: undefined, members: [member()] }),
      { now: NOW },
    );
    expect(md).toContain('## Synthesis');
    expect(md).toContain('No synthesis recorded.');
  });
});

describe('councilReportFilename', () => {
  it('builds a safe, dated, format-tagged filename', () => {
    expect(councilReportFilename(council({ name: 'Product Council!' }), run())).toBe(
      'product-council-brainstorm-2026-06-19.md',
    );
  });

  it('falls back to "council" for an empty name', () => {
    expect(councilReportFilename(council({ name: '   ' }), run({ format: 'debate' }))).toBe(
      'council-debate-2026-06-19.md',
    );
  });
});
