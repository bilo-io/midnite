import type { TranscriptMessage } from '@midnite/shared';

/**
 * Phase 62 (Theme H) — a **bounded** transcript excerpt for retro narrative
 * generation. This is the *only* way retro generation touches a session
 * transcript: never feed a whole JSONL to a model. The excerpt is
 *
 *   - the trailing `tailMessages` messages (recent = most relevant), plus
 *   - up to `failureContext` earlier messages that look failure-adjacent
 *     (mention an error/failure), so a narrative can explain what tripped a task
 *     even when the failure happened well before the end,
 *
 * rendered compactly (per-message text truncated, tool calls summarised to a few
 * lines) and hard-capped at `maxChars` — trimmed from the *front* so the most
 * recent content survives the cap. Pure + total: never throws for any input.
 */

export interface TranscriptExcerptOptions {
  /** Hard cap on the returned string. Trimmed from the front. Default 4000. */
  maxChars?: number;
  /** How many trailing messages to always include. Default 12. */
  tailMessages?: number;
  /** How many earlier failure-adjacent messages to pull in. Default 3. */
  failureContext?: number;
  /** Tool-call summary lines rendered per message. Default 3. */
  maxToolCalls?: number;
  /** Per-message text truncation, so one huge message can't dominate. Default 600. */
  maxMessageChars?: number;
}

const DEFAULTS: Required<TranscriptExcerptOptions> = {
  maxChars: 4000,
  tailMessages: 12,
  failureContext: 3,
  maxToolCalls: 3,
  maxMessageChars: 600,
};

const FAILURE_RE = /\b(error|errors|failed|failure|exception|throw|throws|traceback|panic|assert(?:ion)?)\b/i;

function truncate(text: string, max: number): string {
  const t = text.trim();
  if (t.length <= max) return t;
  return `${t.slice(0, max - 1).trimEnd()}…`;
}

function looksFailureAdjacent(m: TranscriptMessage): boolean {
  if (m.text && FAILURE_RE.test(m.text)) return true;
  return (m.toolCalls ?? []).some((c) => FAILURE_RE.test(`${c.name} ${c.summary}`));
}

function renderMessage(m: TranscriptMessage, opts: Required<TranscriptExcerptOptions>): string {
  const lines: string[] = [];
  const text = m.text ? truncate(m.text, opts.maxMessageChars) : '';
  lines.push(`[${m.role}]${text ? ` ${text}` : ''}`);
  const calls = m.toolCalls ?? [];
  for (const c of calls.slice(0, opts.maxToolCalls)) {
    lines.push(`  ⨯ ${c.name}: ${truncate(c.summary, 160)}`);
  }
  if (calls.length > opts.maxToolCalls) {
    lines.push(`  … +${calls.length - opts.maxToolCalls} more tool call(s)`);
  }
  return lines.join('\n');
}

export function transcriptExcerpt(
  messages: readonly TranscriptMessage[],
  options: TranscriptExcerptOptions = {},
): string {
  const opts = { ...DEFAULTS, ...options };
  if (!messages.length) return '';

  const tailStart = Math.max(0, messages.length - opts.tailMessages);
  // Indices we keep: the tail window, plus the latest failure-adjacent messages
  // that fall *before* the tail (the tail already covers everything after it).
  const kept = new Set<number>();
  for (let i = tailStart; i < messages.length; i++) kept.add(i);

  let pulled = 0;
  for (let i = tailStart - 1; i >= 0 && pulled < opts.failureContext; i--) {
    const m = messages[i];
    if (m && looksFailureAdjacent(m)) {
      kept.add(i);
      pulled++;
    }
  }

  const orderedIdx = [...kept].sort((a, b) => a - b);
  const blocks: string[] = [];
  let prev = -1;
  for (const idx of orderedIdx) {
    // Mark a gap when non-contiguous (failure context lifted from earlier).
    if (prev !== -1 && idx !== prev + 1) blocks.push('  …');
    const m = messages[idx];
    if (m) blocks.push(renderMessage(m, opts));
    prev = idx;
  }

  let out = blocks.join('\n');
  if (out.length > opts.maxChars) {
    // Keep the most recent content: trim from the front and mark the elision.
    out = `…\n${out.slice(out.length - opts.maxChars + 2)}`;
  }
  return out;
}
