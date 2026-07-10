import type { Memory } from '@midnite/shared';
import type { MemorySourceRow } from '../../db/schema';

/**
 * Total character budget for a stuffed corpus. At notebook scale (one memory +
 * ≤10 sources) the whole corpus normally fits; when it doesn't we trim source
 * bodies (least-important first is out of scope — we simply cap per-source and
 * then the whole) so the LLM call stays within a sane token envelope. Decision §2.
 */
export const CORPUS_CHAR_BUDGET = 24_000;
const PER_SOURCE_CHAR_CAP = 8_000;

/** A single source's contribution to the corpus, already trimmed. */
type CorpusSource = { label: string; body: string };

/**
 * Build the grounding corpus for chat + Studio from a memory and its source rows.
 * Stuffs the memory's own markdown plus each source's title/url and — once Theme B
 * has ingested it — its extracted body text. Forward-compatible: a source with no
 * `extractedText` (not yet ingested, or ingestion failed) contributes just its
 * title + url, so this works whether or not ingestion has run.
 */
export function buildMemoryCorpus(memory: Memory, sourceRows: MemorySourceRow[]): string {
  const parts: string[] = [];
  parts.push(`# ${memory.title}`);
  if (memory.content.trim()) parts.push(memory.content.trim());

  const sources = sourceRows
    .map((row): CorpusSource | null => {
      const label = row.title?.trim() || row.url?.trim() || row.fileName?.trim() || 'Source';
      const meta = row.url ? `${label} (${row.url})` : label;
      const body = row.extractedText?.trim();
      if (!body) return { label: meta, body: '' };
      return { label: meta, body: clip(body, PER_SOURCE_CHAR_CAP) };
    })
    .filter((s): s is CorpusSource => s !== null);

  if (sources.length) {
    parts.push('## Sources');
    for (const [i, s] of sources.entries()) {
      const header = `### [${i + 1}] ${s.label}`;
      parts.push(s.body ? `${header}\n${s.body}` : `${header}\n(link only — body not ingested)`);
    }
  }

  return clip(parts.join('\n\n'), CORPUS_CHAR_BUDGET);
}

/** Whether a corpus has any substance to generate from (content or an ingested source). */
export function corpusHasContent(memory: Memory, sourceRows: MemorySourceRow[]): boolean {
  if (memory.content.trim()) return true;
  return sourceRows.some((r) => r.extractedText?.trim());
}

function clip(text: string, max: number): string {
  return text.length <= max ? text : `${text.slice(0, max)}\n\n…(truncated)`;
}
