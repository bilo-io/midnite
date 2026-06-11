/**
 * Prompt builders for council runs: the per-participant framing and the
 * anonymized synthesis (verdict) prompt. Pure functions — the runner supplies
 * already-shuffled, labeled outputs so this file never sees identities.
 */

/** The one-shot prompt a participant CLI argues the topic with. */
export function buildParticipantPrompt(perspective: string, topic: string): string {
  return [
    'You are one voice on a council debating a topic. Argue strictly from this perspective:',
    '',
    perspective.trim() || '(no specific perspective given — argue on the merits)',
    '',
    'Topic:',
    topic.trim(),
    '',
    'Give your position, your strongest arguments, the key risks you see, and one concrete recommendation.',
    'Respond in plain text, under 600 words. Do not use tools, do not read or write files — answer directly.',
  ].join('\n');
}

export const VERDICT_SYSTEM_PROMPT = [
  'You are the impartial moderator of a council debate. Several anonymous participants have each argued',
  'a topic from their own perspective. You do not know — and must not speculate about — who or what',
  'produced each position. Weigh the positions strictly on their merits.',
].join(' ');

/**
 * The synthesis prompt: the topic plus each participant's take under its
 * anonymized label. `entries` must already be shuffled; a null output marks a
 * participant that failed to respond.
 */
export function buildVerdictPrompt(
  topic: string,
  entries: Array<{ label: string; output: string | null }>,
): string {
  const sections = entries.map(({ label, output }) =>
    output === null
      ? `## Participant ${label}\n\n(failed to respond)`
      : `## Participant ${label}\n\n${output}`,
  );
  return [
    `# Topic\n\n${topic.trim()}`,
    ...sections,
    [
      '# Your task',
      '',
      'Write a verdict in markdown:',
      '1. **Synthesis** — where the participants agree and where they genuinely diverge.',
      '2. **Assessment** — for each participant (by label), their strongest point and weakest point.',
      '3. **Verdict** — weigh the options against each other and give a final recommendation, including',
      '   which participant(s) made the most convincing case and why.',
    ].join('\n'),
  ].join('\n\n');
}
