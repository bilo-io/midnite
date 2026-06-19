import { describe, expect, it } from 'vitest';
import { buildMemberPrompt, buildSynthesisPrompt } from './council-prompts';

describe('buildMemberPrompt', () => {
  it('uses idea-generation framing for the brainstorm format', () => {
    const out = buildMemberPrompt('brainstorm', 'Think first principles.', 'New product ideas?');
    expect(out).toContain('idea generator');
    expect(out).toContain('Think first principles.');
    expect(out).toContain('New product ideas?');
  });

  it('uses position framing for non-brainstorm formats', () => {
    const out = buildMemberPrompt('debate', 'Argue for speed over safety.', 'Rewrite in Rust?');
    expect(out).toContain('one member of a panel');
    expect(out).toContain('Argue for speed over safety.');
    expect(out).toContain('Rewrite in Rust?');
  });

  it('falls back to on-the-merits framing for a blank role', () => {
    expect(buildMemberPrompt('analyse', '   ', 'topic')).toContain('respond on the merits');
  });
});

const ENTRIES = [
  { id: 'rm1', name: 'Optimist', role: 'argue for', output: 'Yes, for performance.' },
  { id: 'rm2', name: 'Skeptic', role: 'argue against', output: 'No, churn risk.' },
];

describe('buildSynthesisPrompt (attributed)', () => {
  it('heads each section with the member name + role, with no label map', () => {
    const { body, labelMap } = buildSynthesisPrompt('brainstorm', 'Rewrite in Rust?', ENTRIES, {
      anonymize: false,
    });
    expect(body).toContain('## Optimist');
    expect(body).toContain('## Skeptic');
    expect(body).toContain('Role: argue for');
    expect(body).toContain('Yes, for performance.');
    expect(body).toContain('# Your task — Brainstorm');
    expect(labelMap).toBeUndefined();
  });

  it('uses the council custom prompt as the task for the custom format', () => {
    const { body } = buildSynthesisPrompt('custom', 'topic', ENTRIES, {
      anonymize: false,
      customPrompt: 'Write a one-line haiku verdict.',
    });
    expect(body).toContain('Write a one-line haiku verdict.');
  });

  it('marks members with no output explicitly', () => {
    const { body } = buildSynthesisPrompt(
      'analyse',
      'topic',
      [{ id: 'rm1', name: 'A', role: 'r', output: null }],
      { anonymize: false },
    );
    expect(body).toContain('## A');
    expect(body).toContain('(no response)');
  });
});

describe('buildSynthesisPrompt (anonymized)', () => {
  it('relabels members A/B, hides identities, and returns the label map', () => {
    const { body, labelMap } = buildSynthesisPrompt('debate', 'Rewrite in Rust?', ENTRIES, {
      anonymize: true,
    });
    expect(body).toContain('## Member A');
    expect(body).toContain('## Member B');
    expect(body).toContain('# Your task — Verdict');
    // Nothing but labels identifies a member — no names, roles, or providers.
    expect(body).not.toMatch(/Optimist|Skeptic|argue for|argue against/);
    expect(body).not.toMatch(/claude|gemini|codex|aider|opencode/i);
    // The map covers both members and points back at their run-member ids.
    expect(Object.keys(labelMap!).sort()).toEqual(['A', 'B']);
    expect(new Set(Object.values(labelMap!))).toEqual(new Set(['rm1', 'rm2']));
  });

  it('marks members with no output as "(no response)" under a label', () => {
    const { body } = buildSynthesisPrompt(
      'critique',
      'topic',
      [
        { id: 'rm1', name: 'A', role: 'r', output: 'take' },
        { id: 'rm2', name: 'B', role: 'r', output: null },
      ],
      { anonymize: true },
    );
    expect(body).toContain('(no response)');
  });
});
