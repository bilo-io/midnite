import type { AudioScript, VideoDeck } from '@midnite/shared';

/**
 * Phase 65 E — pure prompt + render helpers for the file-backed Studio artifacts
 * (audio & video). The structured schemas the LLM output is validated against live
 * in `@midnite/shared` (`memory-studio.ts`); here we build the prompts and render
 * the honest markdown fallbacks (transcript / outline). No I/O.
 */

const GROUNDING =
  'You are a knowledge-studio producer. Work ONLY from the provided corpus (a memory ' +
  'note and its sources). Never invent facts not present in it. Keep it engaging but ' +
  'faithful; if the corpus is thin, be brief rather than padding with invention.';

// ── Audio overview (two-host podcast) ───────────────────────────────────────

export const AUDIO_SCRIPT_SYSTEM =
  `${GROUNDING} Write a lively but concise two-host audio overview (a podcast-style ` +
  'conversation) that explains the corpus to a curious listener. Host A hosts and ' +
  'asks; Host B is the expert who explains. Alternate speakers, 8–16 short turns ' +
  'total, no stage directions or sound cues — just what each host says.';

export function audioScriptUserText(corpus: string): string {
  return `Write the two-host audio overview now as structured segments.\n\n---\nCORPUS:\n${corpus}`;
}

/** Render the script as a readable transcript — the honest fallback with no TTS. */
export function renderAudioTranscript(script: AudioScript): string {
  const lines = [`# ${script.title}`, '', '_Two-host audio overview — transcript_', ''];
  for (const s of script.segments) {
    lines.push(`**Host ${s.speaker}:** ${s.text.trim()}`, '');
  }
  return lines.join('\n').trim();
}

// ── Video overview (narrated slideshow) ──────────────────────────────────────

export const VIDEO_DECK_SYSTEM =
  `${GROUNDING} Design a short narrated slideshow (4–8 slides) summarising the corpus. ` +
  'Each slide has a punchy heading, up to 4 short bullet points, and one or two ' +
  'sentences of spoken narration a presenter would say over it. Keep bullets terse; ' +
  'the narration carries the detail.';

export function videoDeckUserText(corpus: string): string {
  return `Design the narrated slideshow now as structured slides.\n\n---\nCORPUS:\n${corpus}`;
}

/** The narration read aloud across all slides, joined into one script. */
export function deckNarration(deck: VideoDeck): string {
  return deck.slides.map((s) => s.narration.trim()).join('\n\n');
}

/** Render the deck as a markdown outline — the honest fallback with no video. */
export function renderVideoOutline(deck: VideoDeck): string {
  const lines = [`# ${deck.title}`, '', '_Narrated slideshow — outline_', ''];
  for (const [i, s] of deck.slides.entries()) {
    lines.push(`## ${i + 1}. ${s.heading}`);
    for (const b of s.bullets) lines.push(`- ${b}`);
    lines.push('', `> ${s.narration.trim()}`, '');
  }
  return lines.join('\n').trim();
}
