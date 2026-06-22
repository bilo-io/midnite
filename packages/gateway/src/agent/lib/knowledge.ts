// Pure helpers for Phase 15 Theme D (knowledge-files watcher + MD injection):
// parse Markdown headings for the manifest, render the manifest for the plan
// model, validate its file selection, and format the chosen files into a block
// appended to the agent's execution prompt. No I/O — chokidar + fs reads live in
// knowledge-watcher.service.ts; the LLM call lives in knowledge.service.ts.

/** Max headings kept per file in the manifest — enough to convey what it covers. */
export const MAX_HEADINGS_PER_FILE = 12;
/** Max knowledge files injected into one prompt (bounds selection + reads). */
export const MAX_KNOWLEDGE_FILES = 5;

/** A manifest row: the file's key (posix relative path) + its headings. */
export type KnowledgeManifestEntry = { file: string; headings: string[] };
/** A selected file's content, ready to fold into the prompt. */
export type KnowledgeFile = { file: string; content: string };

/** Extract ATX Markdown headings (`#`..`######`) in document order, capped. Pure. */
export function extractHeadings(markdown: string, max = MAX_HEADINGS_PER_FILE): string[] {
  const out: string[] = [];
  for (const line of markdown.split('\n')) {
    const m = /^\s{0,3}(#{1,6})\s+(.+?)\s*#*\s*$/.exec(line);
    if (m) {
      out.push(m[2]!.trim());
      if (out.length >= max) break;
    }
  }
  return out;
}

/** Render the manifest as a list the plan model chooses filenames from. Pure. */
export function renderManifest(entries: KnowledgeManifestEntry[]): string {
  return entries
    .map((e) => `- ${e.file}${e.headings.length ? ` — ${e.headings.join(' · ')}` : ''}`)
    .join('\n');
}

/**
 * Keep only the model's selections that name a real manifest file, de-duplicated
 * and capped. The model can't introduce a file that isn't on disk. Pure.
 */
export function validateSelection(
  requested: unknown,
  known: ReadonlySet<string>,
  max = MAX_KNOWLEDGE_FILES,
): string[] {
  if (!Array.isArray(requested)) return [];
  const out: string[] = [];
  const seen = new Set<string>();
  for (const r of requested) {
    if (typeof r === 'string' && known.has(r) && !seen.has(r)) {
      seen.add(r);
      out.push(r);
      if (out.length >= max) break;
    }
  }
  return out;
}

/** Truncate a string to at most `maxBytes` UTF-8 bytes (may end mid-char). */
function sliceToBytes(value: string, maxBytes: number): string {
  const buf = Buffer.from(value, 'utf8');
  return buf.length <= maxBytes ? value : buf.subarray(0, maxBytes).toString('utf8');
}

/**
 * Format selected knowledge files into a markdown block to append to the
 * execution prompt, capped to `maxBytes` of content total (UTF-8). Whole files
 * are added until the next would overflow; the overflowing one contributes a
 * byte-capped slice so a single large file still helps. '' for none. Pure.
 */
export function buildKnowledgeBlock(files: KnowledgeFile[], maxBytes: number): string {
  const sections: string[] = [];
  let used = 0;
  for (const f of files) {
    const content = f.content.trim();
    if (!content) continue;
    const bytes = Buffer.byteLength(content, 'utf8');
    if (used + bytes <= maxBytes) {
      sections.push(`### ${f.file}\n\n${content}`);
      used += bytes;
      continue;
    }
    // Doesn't fit whole — include a slice of it (if worth it), then stop.
    const remaining = maxBytes - used;
    if (remaining > 256) {
      sections.push(`### ${f.file}\n\n${sliceToBytes(content, remaining)}\n\n…(truncated)`);
    }
    break;
  }
  if (sections.length === 0) return '';
  return (
    `\n\n---\n\n## Knowledge files\n\n` +
    `Relevant files from the project knowledge folder — use as authoritative background.\n\n` +
    `${sections.join('\n\n')}\n`
  );
}
