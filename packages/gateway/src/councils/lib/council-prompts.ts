/**
 * Prompt builders for council runs: the per-member response framing and the
 * format-specific synthesis prompt. Pure functions.
 *
 * The synthesis task varies by format, and the format also decides whether
 * members are *attributed* (shown by name + role) or *anonymized* (shuffled and
 * relabeled A/B/C so the synthesizer judges them blind). Anonymization happens
 * HERE, at prompt-build time — never at capture — so the same captured responses
 * can be re-synthesized attributed or anonymized. When anonymizing, the builder
 * returns the label→runMemberId map so the caller can archive it on the
 * synthesis entry (the only place the de-anonymization mapping is stored).
 */

import type { CouncilFormat } from '@midnite/shared';

/** The one-shot prompt a member CLI responds to the prompt with, through its role. */
export function buildMemberPrompt(format: CouncilFormat, role: string, prompt: string): string {
  if (format === 'brainstorm') {
    return [
      'You are an idea generator on a panel. Generate ideas through this role/angle:',
      '',
      role.trim() || '(no specific role given — generate broadly and creatively)',
      '',
      'Prompt:',
      prompt.trim(),
      '',
      'Produce 5–8 distinct, non-obvious ideas. For each idea give a short title, one or two sentences',
      'describing it, and a brief note on why it could work. Be divergent — avoid near-duplicates and',
      'obvious answers, and push past the first thing that comes to mind.',
      'Respond in markdown, under 600 words. Do not use tools, do not read or write files — answer directly.',
    ].join('\n');
  }
  return [
    'You are one member of a panel responding to a prompt. Respond from this role/angle:',
    '',
    role.trim() || '(no specific role given — respond on the merits)',
    '',
    'Prompt:',
    prompt.trim(),
    '',
    'Give your substantive take: your position and the ideas or arguments behind it, your strongest points',
    'and reasoning, the key risks or trade-offs you see, and one concrete recommendation. Be specific and',
    'non-obvious — push past the first thing that comes to mind.',
    'Respond in markdown, under 600 words. Do not use tools, do not read or write files — answer directly.',
  ].join('\n');
}

/** Framing for attributed synthesis — the synthesizer sees who said what. */
export const SYNTH_SYSTEM_PROMPT_ATTRIBUTED = [
  'You are the facilitator of a panel session. Several members have each responded to a prompt from a',
  'named role. Their roles are shown to you — use them, and attribute points to the member and role they',
  'came from. Be constructive, concrete, and decisive.',
].join(' ');

/** Framing for anonymized synthesis — the synthesizer judges blind. */
export const SYNTH_SYSTEM_PROMPT_ANONYMIZED = [
  'You are the impartial moderator of a panel. Several anonymous members have each responded to a prompt',
  'from their own perspective. You do not know — and must not speculate about — who or what produced each',
  'response. Weigh the responses strictly on their merits.',
].join(' ');

/** The format-specific task block appended after the pooled responses. `custom` has none — it uses the council's stored prompt. */
const FORMAT_TASK: Record<Exclude<CouncilFormat, 'custom'>, string> = {
  brainstorm: [
    '# Your task — Brainstorm',
    '',
    'Cluster all the responses above into themes, and within each theme remove duplicates and',
    'near-duplicates. Then curate a shortlist of the strongest 5–10 ideas overall. For each shortlisted',
    'idea give a one-line rationale and note which member/role it came from. End by naming the single most',
    'promising idea and why.',
  ].join('\n'),
  debate: [
    '# Your task — Verdict',
    '',
    'Write a verdict in markdown:',
    '1. **Synthesis** — where the members agree and where they genuinely diverge.',
    '2. **Assessment** — for each member (by label), their strongest point and weakest point.',
    '3. **Verdict** — weigh the positions against each other and give a final recommendation, including',
    '   which member(s) made the most convincing case and why.',
  ].join('\n'),
  analyse: [
    '# Your task — Analysis',
    '',
    'Give a neutral, structured analysis across all the responses: the main themes, where they agree and',
    'where they are in tension, and the quality of the evidence or reasoning behind the key claims.',
    'Conclude with what we now know with confidence and the most important open questions or uncertainties.',
  ].join('\n'),
  critique: [
    '# Your task — Critique',
    '',
    'Stress-test the positions impartially. For each, give its biggest strength, its biggest risk or',
    'weakness, and one concrete way to strengthen or de-risk it. Be candid — flag positions that look',
    'attractive but are likely to fail, and say why.',
  ].join('\n'),
  motivate: [
    '# Your task — Motivate',
    '',
    'Build the strongest optimistic case from the responses. Pull together the most promising threads,',
    'explain why this can work and what the upside looks like, and rally around the best path forward. End',
    'with concrete, momentum-building next steps.',
  ].join('\n'),
  demotivate: [
    '# Your task — Devil’s advocate',
    '',
    'Run a skeptical pre-mortem. Assume this fails and work backwards: surface the fatal flaws, the reasons',
    'each idea will not survive contact with reality, and the risks the responses underweighted or ignored.',
    'Be blunt — the goal is to expose every reason not to proceed.',
  ].join('\n'),
};

type SynthEntry = { id: string; name: string; role: string; output: string | null };

/**
 * Build the synthesis prompt body for `format`: the prompt, then each member's
 * response, then the task block. Attributed formats head each section with the
 * member's name + role; anonymized formats shuffle and relabel A/B/C and return
 * the label→runMemberId map. A null output marks a member that produced nothing.
 */
export function buildSynthesisPrompt(
  format: CouncilFormat,
  prompt: string,
  entries: SynthEntry[],
  opts: { anonymize: boolean; customPrompt?: string },
): { body: string; labelMap?: Record<string, string> } {
  const task = format === 'custom' ? (opts.customPrompt ?? '').trim() : FORMAT_TASK[format];

  if (opts.anonymize) {
    // Shuffle (Fisher–Yates), then label in shuffled order so the labels carry
    // no positional hint of which member is which.
    const shuffled = [...entries];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j]!, shuffled[i]!];
    }
    const labelMap: Record<string, string> = {};
    const sections = shuffled.map((e, i) => {
      const label = String.fromCharCode(65 + i); // A, B, C, …
      labelMap[label] = e.id;
      return e.output === null
        ? `## Member ${label}\n\n(no response)`
        : `## Member ${label}\n\n${e.output}`;
    });
    return { body: [`# Prompt\n\n${prompt.trim()}`, ...sections, task].join('\n\n'), labelMap };
  }

  const sections = entries.map((e, i) => {
    const heading = `## ${e.name.trim() || `Member ${i + 1}`}`;
    const roleLine = e.role.trim() ? `*Role: ${e.role.trim()}*\n\n` : '';
    return e.output === null
      ? `${heading}\n\n${roleLine}(no response)`
      : `${heading}\n\n${roleLine}${e.output}`;
  });
  return { body: [`# Prompt\n\n${prompt.trim()}`, ...sections, task].join('\n\n') };
}
