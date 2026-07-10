import type { MemoryCorpus } from '../../memories/memories.service';

/**
 * Retrieval for memory chat (Phase 65 C, Decision §2): at notebook scale
 * (one memory + ≤10 sources) the whole corpus is stuffed into context; FTS ranking
 * only kicks in to *trim* when the corpus exceeds the budget. These helpers are
 * pure so the assembly + trimming logic is unit-testable; the FTS ranking itself
 * lives in the repository (it needs SQLite).
 */

/** Character budget for the stuffed corpus (~6k tokens). Trim only past this. */
export const MEMORY_CORPUS_BUDGET_CHARS = 24_000;

/** A single chunk of grounding context. `sourceId` null = the memory doc itself. */
export type CorpusChunk = { sourceId: string | null; label: string; text: string };

/** Total characters across the memory doc + every source text. */
export function corpusChars(corpus: MemoryCorpus): number {
  return corpus.content.length + corpus.sources.reduce((n, s) => n + s.text.length, 0);
}

/**
 * Pick the chunks to stuff, in prompt order. The memory doc always leads
 * (truncated to the budget if it alone overflows). Sources follow in
 * `rankedSourceIds` order — the caller passes original position order when the
 * corpus is under budget, and FTS relevance rank when it's over — each added
 * whole while it fits; once a source would overflow the budget the rest are
 * dropped (rank-faithful trim). Ids not present in `rankedSourceIds` are appended
 * in their original order so nothing is silently lost when ranking is a no-op.
 */
export function selectCorpusChunks(
  corpus: MemoryCorpus,
  rankedSourceIds: string[],
  budget = MEMORY_CORPUS_BUDGET_CHARS,
): CorpusChunk[] {
  const chunks: CorpusChunk[] = [];
  let used = 0;

  const doc = corpus.content.trim();
  if (doc) {
    const text = doc.length > budget ? doc.slice(0, budget) : doc;
    chunks.push({ sourceId: null, label: corpus.title || 'Memory', text });
    used += text.length;
  }

  const byId = new Map(corpus.sources.map((s) => [s.id, s]));
  const ranked = rankedSourceIds.filter((id) => byId.has(id));
  const order = [...ranked, ...corpus.sources.map((s) => s.id).filter((id) => !ranked.includes(id))];

  for (const id of order) {
    const s = byId.get(id);
    const text = s?.text.trim();
    if (!s || !text) continue;
    if (used + text.length > budget) break; // budget spent — drop the rest (least relevant)
    chunks.push({ sourceId: s.id, label: s.label, text });
    used += text.length;
  }
  return chunks;
}

/** Render the chosen chunks into the grounding block for the prompt. Sources are
 *  tagged with their id so the model can cite them; the memory doc is untagged. */
export function buildContextText(chunks: CorpusChunk[]): string {
  return chunks
    .map((c) =>
      c.sourceId
        ? `[source id: ${c.sourceId}] ${c.label}\n${c.text}`
        : `[memory document] ${c.label}\n${c.text}`,
    )
    .join('\n\n---\n\n');
}
