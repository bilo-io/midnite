import type { TranscriptMessage } from '@midnite/shared';

/**
 * Phase 62 Theme C — a minimal, **bounded** transcript excerpt for feeding a task
 * retro narrative to the LLM. Selects the tail-N messages plus failure-adjacent
 * context (messages that look like errors, with the message either side), renders
 * them as `role: text` lines, and enforces a hard character cap — keeping the most
 * recent content when it overflows. Pure + total: an empty/absent transcript
 * yields `''`, so callers can fail soft (skeleton-only narrative).
 */
export interface TranscriptSliceOptions {
  /** How many trailing messages to always include. Default 12. */
  tailMessages?: number;
  /** Hard character cap on the returned excerpt. Default 6000. */
  charCap?: number;
}

const DEFAULT_TAIL = 12;
const DEFAULT_CHAR_CAP = 6000;
const FAILURE_RE = /error|fail|exception|traceback|panic|fatal/i;

export function sliceTranscript(
  messages: TranscriptMessage[] | undefined,
  opts: TranscriptSliceOptions = {},
): string {
  if (!messages || messages.length === 0) return '';
  const tail = Math.max(0, opts.tailMessages ?? DEFAULT_TAIL);
  const cap = Math.max(1, opts.charCap ?? DEFAULT_CHAR_CAP);

  const selected = new Set<number>();
  // Always keep the tail (most-recent context).
  for (let i = Math.max(0, messages.length - tail); i < messages.length; i++) {
    selected.add(i);
  }
  // Plus failure-adjacent context: any error-looking message + its neighbours.
  for (let i = 0; i < messages.length; i++) {
    if (FAILURE_RE.test(messages[i]?.text ?? '')) {
      if (i - 1 >= 0) selected.add(i - 1);
      selected.add(i);
      if (i + 1 < messages.length) selected.add(i + 1);
    }
  }

  const lines: string[] = [];
  for (const i of [...selected].sort((a, b) => a - b)) {
    const m = messages[i];
    if (!m) continue;
    const text = (m.text ?? '').trim();
    if (!text) continue;
    lines.push(`${m.role}: ${text}`);
  }

  const out = lines.join('\n');
  if (out.length <= cap) return out;
  // Overflow: keep the tail end (most recent), marked as truncated.
  return `…${out.slice(out.length - (cap - 1))}`;
}
