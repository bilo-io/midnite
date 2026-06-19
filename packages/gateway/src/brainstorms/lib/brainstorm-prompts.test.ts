import { describe, expect, it } from 'vitest';
import { BRAINSTORM_SYNTH_MODES } from '@midnite/shared';
import { SYNTH_SYSTEM_PROMPT, buildContributorPrompt, buildSynthesisPrompt } from './brainstorm-prompts';

describe('buildContributorPrompt', () => {
  it('frames the lens and the challenge, and asks for divergent ideas', () => {
    const out = buildContributorPrompt('First principles', 'How do we grow revenue?');
    expect(out).toContain('First principles');
    expect(out).toContain('How do we grow revenue?');
    expect(out).toContain('idea generator');
    expect(out).toMatch(/distinct/i);
  });

  it('falls back to broad framing for a blank lens', () => {
    expect(buildContributorPrompt('   ', 'challenge')).toContain('generate broadly');
  });
});

describe('buildSynthesisPrompt', () => {
  const entries = [
    { name: 'First principles', lens: 'reason up from fundamentals', output: '- Idea: self-serve' },
    { name: 'Contrarian', lens: 'argue the opposite', output: '- Idea: go enterprise-only' },
  ];

  it('attributes each contributor by name and lens (no anonymization)', () => {
    const out = buildSynthesisPrompt('shortlist', 'Where to grow?', entries);
    expect(out).toContain('## First principles');
    expect(out).toContain('## Contrarian');
    expect(out).toContain('reason up from fundamentals');
    expect(out).toContain('- Idea: self-serve');
    expect(out).toContain('Where to grow?');
  });

  it('marks contributors that produced nothing explicitly', () => {
    const out = buildSynthesisPrompt('gaps', 'topic', [
      { name: 'Alpha', lens: 'a', output: 'ideas' },
      { name: 'Beta', lens: 'b', output: null },
    ]);
    expect(out).toContain('## Beta');
    expect(out).toContain('(no ideas produced)');
  });

  it('emits a distinct task block per mode', () => {
    const titles: Record<string, string> = {
      shortlist: 'Shortlist',
      gaps: 'Gap analysis',
      opportunities: 'Market opportunities',
      critique: 'Critique & risks',
      combine: 'Combine into concepts',
    };
    for (const mode of BRAINSTORM_SYNTH_MODES) {
      const out = buildSynthesisPrompt(mode, 'topic', entries);
      expect(out).toContain(`# Your task — ${titles[mode]}`);
    }
  });
});

describe('SYNTH_SYSTEM_PROMPT', () => {
  it('tells the facilitator to use and attribute the lenses', () => {
    expect(SYNTH_SYSTEM_PROMPT).toMatch(/facilitator/i);
    expect(SYNTH_SYSTEM_PROMPT).toMatch(/attribute/i);
  });
});
