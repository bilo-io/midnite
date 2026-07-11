import type { MemoryArtifactKind } from '@midnite/shared';

/**
 * The kinds this module prompts for — the Phase 65 D text + infographic artifacts.
 * The file-backed audio/video kinds (Theme E) use their own structured prompts in
 * `studio-media.ts`, so they're intentionally excluded here.
 */
export type StudioTextKind = Exclude<MemoryArtifactKind, 'audio-overview' | 'video-overview'>;

/** The text/SVG artifact kinds this module prompts for (D). */
export const STUDIO_TEXT_KINDS: StudioTextKind[] = [
  'brief',
  'faq',
  'study-guide',
  'timeline',
  'infographic',
];

/** The per-kind generation prompt (system + a short instruction) in one place. */
type StudioPrompt = { system: string; instruction: string; maxTokens: number };

const GROUNDING =
  'You are a knowledge-studio assistant. Work ONLY from the provided corpus (a ' +
  'memory note and its sources). Never invent facts not present in it. If the ' +
  'corpus is thin, produce the best artifact you can from what is there and say ' +
  'so briefly rather than padding with invented detail.';

const MARKDOWN_RULES =
  'Output GitHub-flavored Markdown only — no preamble, no code fence around the ' +
  'whole document, no "Here is…" wrapper. Start directly with the content.';

const STUDIO_PROMPTS: Record<StudioTextKind, StudioPrompt> = {
  brief: {
    system: `${GROUNDING} ${MARKDOWN_RULES}`,
    instruction:
      'Write a concise executive brief of the corpus: a one-paragraph overview, ' +
      'then 3–6 key-point bullets, then a short "So what" takeaway. Keep it tight.',
    maxTokens: 1200,
  },
  faq: {
    system: `${GROUNDING} ${MARKDOWN_RULES}`,
    instruction:
      'Produce an FAQ of 5–8 question/answer pairs that a reader of this corpus ' +
      'would most likely ask. Format each as a bold question followed by a concise ' +
      'answer. Only include questions the corpus actually answers.',
    maxTokens: 1600,
  },
  'study-guide': {
    system: `${GROUNDING} ${MARKDOWN_RULES}`,
    instruction:
      'Create a study guide: a short "Key concepts" list with one-line definitions, ' +
      'a "Deep dive" section with 3–5 themed subsections, and a "Review questions" ' +
      'list at the end. Use headings and bullets.',
    maxTokens: 2000,
  },
  timeline: {
    system: `${GROUNDING} ${MARKDOWN_RULES}`,
    instruction:
      'Extract a chronological timeline from the corpus as a Markdown list, each ' +
      'entry "**<when>** — <what happened>". Order earliest→latest. If the corpus ' +
      'has no explicit dates, order by logical/narrative sequence and say so in a ' +
      'one-line note at the top.',
    maxTokens: 1400,
  },
  infographic: {
    system:
      `${GROUNDING} You output a SINGLE self-contained SVG document that visually ` +
      'summarises the corpus — a poster-style infographic with a title, 3–6 stat/ ' +
      'concept cards or a simple flow, and short labels. Rules: return ONLY the ' +
      '`<svg>…</svg>` markup (no XML prolog, no markdown fence, no prose). Use a ' +
      'viewBox of "0 0 800 600", inline styles only, no external fonts/images/ ' +
      'scripts, and readable contrast on a light background. Keep text short so it ' +
      'fits its box.',
    instruction:
      'Design the infographic now as one self-contained SVG. Output only the SVG.',
    maxTokens: 4000,
  },
};

/** Build the LLM request pieces for a Studio artifact kind over a stuffed corpus. */
export function studioPromptFor(
  kind: StudioTextKind,
  corpus: string,
): { system: string; userText: string; maxTokens: number } {
  const p = STUDIO_PROMPTS[kind];
  return {
    system: p.system,
    userText: `${p.instruction}\n\n---\nCORPUS:\n${corpus}`,
    maxTokens: p.maxTokens,
  };
}

/**
 * Extract the SVG markup from a model response — models often wrap it in a
 * ```svg fence or add a stray line. Returns the `<svg>…</svg>` slice, or the
 * trimmed input if no tag is found (the caller decides how to treat that).
 */
export function extractSvg(raw: string): string {
  const start = raw.indexOf('<svg');
  const end = raw.lastIndexOf('</svg>');
  if (start !== -1 && end !== -1 && end > start) {
    return raw.slice(start, end + '</svg>'.length);
  }
  return raw.trim();
}

/** Strip a leading/trailing markdown code fence a model sometimes wraps around a doc. */
export function stripMarkdownFence(raw: string): string {
  const trimmed = raw.trim();
  const fence = /^```(?:markdown|md)?\n([\s\S]*?)\n```$/;
  const m = trimmed.match(fence);
  return m ? m[1]!.trim() : trimmed;
}
