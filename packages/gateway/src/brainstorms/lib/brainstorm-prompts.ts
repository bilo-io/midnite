/**
 * Prompt builders for brainstorm runs: the per-contributor idea-generation
 * framing and the mode-specific synthesis prompt. Pure functions. Unlike a
 * council, ideas are *attributed* — the synthesizer sees each contributor's
 * name and lens — and the synthesis task varies by mode.
 */

import type { BrainstormSynthMode } from '@midnite/shared';

/** The one-shot prompt a contributor CLI generates ideas with, through its lens. */
export function buildContributorPrompt(lens: string, prompt: string): string {
  return [
    'You are an idea generator on a brainstorming panel. Generate ideas through this lens:',
    '',
    lens.trim() || '(no specific lens given — generate broadly and creatively)',
    '',
    'Challenge:',
    prompt.trim(),
    '',
    'Produce 5–8 distinct, non-obvious ideas. For each idea give a short title, one or two sentences',
    'describing it, and a brief note on why it could work. Be divergent — avoid near-duplicates and',
    'obvious answers, and push past the first thing that comes to mind.',
    'Respond in markdown, under 600 words. Do not use tools, do not read or write files — answer directly.',
  ].join('\n');
}

export const SYNTH_SYSTEM_PROMPT = [
  'You are the facilitator of a brainstorming session. Several contributors have each generated ideas',
  'through a named lens. Their lenses are shown to you — use them, and attribute ideas to the contributor',
  'and lens they came from. Be constructive, concrete, and decisive.',
].join(' ');

/** The mode-specific task block appended after the pooled ideas. */
const MODE_TASK: Record<BrainstormSynthMode, string> = {
  shortlist: [
    '# Your task — Shortlist',
    '',
    'Cluster all the ideas above into themes, and within each theme remove duplicates and near-duplicates.',
    'Then curate a shortlist of the strongest 5–10 ideas overall. For each shortlisted idea give a one-line',
    'rationale and note which contributor/lens it came from. End by naming the single most promising idea',
    'and why.',
  ].join('\n'),
  gaps: [
    '# Your task — Gap analysis',
    '',
    'Look across every contribution and identify what is MISSING. List the important directions, angles,',
    'segments, or risks that NO contributor explored, plus ideas that were raised but left underdeveloped.',
    'For each gap, explain why it matters and suggest a concrete idea that would fill it.',
  ].join('\n'),
  opportunities: [
    '# Your task — Market opportunities',
    '',
    'Reframe the ideas as market opportunities. Select the most promising and, for each, estimate demand',
    'signal, feasibility, and differentiation as High / Medium / Low with a one-line justification each.',
    'Then rank the opportunities and recommend where to focus first and why.',
  ].join('\n'),
  critique: [
    '# Your task — Critique & risks',
    '',
    'Identify the strongest ideas across all contributions. For each, give its biggest strength, its biggest',
    'risk or weakness, and one concrete way to strengthen or de-risk it. Be candid — flag ideas that look',
    'attractive but are likely to fail, and say why.',
  ].join('\n'),
  combine: [
    '# Your task — Combine into concepts',
    '',
    'Merge the best fragments across contributors into 3–5 fully-formed concepts. For each concept, give it',
    'a name, list the source ideas/lenses it combines, describe how it works, and explain why the',
    'combination is stronger than its parts.',
  ].join('\n'),
};

/**
 * The synthesis prompt: the challenge, then each contributor's ideas attributed
 * under their name + lens, then the task block for `mode`. A null output marks a
 * contributor that produced no ideas.
 */
export function buildSynthesisPrompt(
  mode: BrainstormSynthMode,
  prompt: string,
  entries: Array<{ name: string; lens: string; output: string | null }>,
): string {
  const sections = entries.map(({ name, lens, output }) => {
    const heading = `## ${name}`;
    const lensLine = lens.trim() ? `*Through the lens: ${lens.trim()}*\n\n` : '';
    return output === null
      ? `${heading}\n\n${lensLine}(no ideas produced)`
      : `${heading}\n\n${lensLine}${output}`;
  });
  return [`# Challenge\n\n${prompt.trim()}`, ...sections, MODE_TASK[mode]].join('\n\n');
}
