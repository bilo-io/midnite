import { describe, expect, it } from 'vitest';
import { buildParticipantPrompt, buildVerdictPrompt } from './council-prompts';

describe('buildParticipantPrompt', () => {
  it('frames the perspective and the topic', () => {
    const out = buildParticipantPrompt('Argue for speed over safety.', 'Rewrite in Rust?');
    expect(out).toContain('Argue for speed over safety.');
    expect(out).toContain('Rewrite in Rust?');
    expect(out).toContain('one voice on a council');
  });

  it('falls back to on-the-merits framing for a blank perspective', () => {
    expect(buildParticipantPrompt('   ', 'topic')).toContain('argue on the merits');
  });
});

describe('buildVerdictPrompt', () => {
  it('sections each take under its anonymized label only', () => {
    const out = buildVerdictPrompt('Rewrite in Rust?', [
      { label: 'A', output: 'Yes, for performance.' },
      { label: 'B', output: 'No, churn risk.' },
    ]);
    expect(out).toContain('## Participant A');
    expect(out).toContain('## Participant B');
    expect(out).toContain('Yes, for performance.');
    expect(out).toContain('No, churn risk.');
    // Nothing but labels identifies a participant.
    expect(out).not.toMatch(/claude|gemini|codex|aider|opencode/i);
  });

  it('marks failed participants explicitly instead of omitting them', () => {
    const out = buildVerdictPrompt('topic', [
      { label: 'A', output: 'take' },
      { label: 'B', output: null },
    ]);
    expect(out).toContain('## Participant B\n\n(failed to respond)');
  });
});
