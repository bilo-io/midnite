import { createReadStream } from 'node:fs';
import { createInterface } from 'node:readline';

/**
 * Real token usage harvested from a Claude Code transcript (Phase 61 A). Sums are
 * cumulative over the session's assistant turns; `contextTokens` is the *final*
 * turn's window occupancy (see below). `null` from a harvest means no usage
 * records were found — the caller keeps the labeled estimate.
 */
export interface HarvestedUsage {
  /** Concrete model id from the last assistant turn, when present. */
  model?: string;
  inputTokens: number;
  outputTokens: number;
  cachedReadTokens: number;
  cachedWriteTokens: number;
  /** Final assistant turn's context occupancy = input + cache-read + cache-creation. */
  contextTokens: number;
  /** True when a byte cap curtailed the read (sums under-counted; see reader). */
  partial: boolean;
}

/** Shape of the `message.usage` block Claude Code writes on assistant records. */
interface RawUsage {
  input_tokens?: number;
  output_tokens?: number;
  cache_read_input_tokens?: number;
  cache_creation_input_tokens?: number;
}
interface RawRecord {
  type?: string;
  message?: { role?: string; model?: string; usage?: RawUsage };
}

function num(v: unknown): number {
  return typeof v === 'number' && Number.isFinite(v) && v > 0 ? v : 0;
}

/**
 * Fold a sequence of parsed transcript records into a usage total. Pure — no I/O,
 * so it's unit-testable. Returns `null` when no assistant `usage` record is seen.
 * The **last** usage record wins for `contextTokens`/`model` (it reflects the
 * final window state); the token counts accumulate across every turn.
 */
export function accumulateUsage(records: Iterable<unknown>): HarvestedUsage | null {
  let seen = false;
  const acc: HarvestedUsage = {
    inputTokens: 0,
    outputTokens: 0,
    cachedReadTokens: 0,
    cachedWriteTokens: 0,
    contextTokens: 0,
    partial: false,
  };

  for (const rec of records) {
    const r = rec as RawRecord;
    const usage = r?.message?.usage;
    if (!usage || typeof usage !== 'object') continue;
    seen = true;
    const input = num(usage.input_tokens);
    const output = num(usage.output_tokens);
    const cacheRead = num(usage.cache_read_input_tokens);
    const cacheWrite = num(usage.cache_creation_input_tokens);
    acc.inputTokens += input;
    acc.outputTokens += output;
    acc.cachedReadTokens += cacheRead;
    acc.cachedWriteTokens += cacheWrite;
    // Last-writer-wins: the final turn's full prompt context is the occupancy.
    acc.contextTokens = input + cacheRead + cacheWrite;
    if (typeof r.message?.model === 'string') acc.model = r.message.model;
  }

  return seen ? acc : null;
}

/** Default cap on transcript bytes streamed per harvest — generous; guards a
 *  pathologically large JSONL from stalling the Stop-hook path. */
export const TRANSCRIPT_MAX_BYTES = 32 * 1024 * 1024;

/**
 * Stream a transcript JSONL and harvest its usage. Reads line-by-line (bounded
 * memory); stops early and flags `partial` once `maxBytes` is exceeded. Malformed
 * lines are skipped. Returns `null` when the file is unreadable or carries no
 * usage records (caller falls back to the labeled estimate).
 */
export async function harvestTranscriptUsage(
  path: string,
  maxBytes: number = TRANSCRIPT_MAX_BYTES,
): Promise<HarvestedUsage | null> {
  let bytes = 0;
  let capped = false;
  const records: unknown[] = [];
  try {
    const stream = createReadStream(path, { encoding: 'utf8' });
    const rl = createInterface({ input: stream, crlfDelay: Infinity });
    for await (const line of rl) {
      bytes += Buffer.byteLength(line) + 1;
      if (bytes > maxBytes) {
        capped = true;
        break;
      }
      if (!line.trim()) continue;
      try {
        records.push(JSON.parse(line));
      } catch {
        // skip a malformed/partial line
      }
    }
    rl.close();
    stream.destroy();
  } catch {
    return null;
  }

  const usage = accumulateUsage(records);
  if (usage && capped) usage.partial = true;
  return usage;
}
