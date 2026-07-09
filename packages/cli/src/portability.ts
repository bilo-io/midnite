import type { ImportPreview, ImportResult } from '@midnite/shared';

/**
 * Pure presentation + parsing helpers for the `export`/`import` (Phase 49 data
 * portability) commands — extracted from `index.ts` so they're unit-testable
 * without booting commander or a gateway (Phase 60 Theme K). The action handlers
 * stay thin: fetch → call these → print. Mirrors the `bulk.ts` / `search.ts`
 * pure-helper pattern.
 */

export type ImportMode = 'merge' | 'replace';

/** The subset of an export archive's manifest the CLI renders. */
export interface ExportSummary {
  domains: string[];
  counts: Record<string, number>;
  schemaVersion: number;
  secretsMode: string;
}

/**
 * Validate the `--mode` flag. Throws a legible error (→ non-zero exit at the
 * top-level handler) on anything but `merge`/`replace`, rather than silently
 * defaulting — a typo'd mode on a destructive restore must fail loudly.
 */
export function parseImportMode(raw: string): ImportMode {
  if (raw === 'merge' || raw === 'replace') return raw;
  throw new Error(`--mode must be "merge" or "replace" (got "${raw}")`);
}

/** Parse the `--domains a,b,c` allowlist; undefined (all domains) when unset/empty. */
export function parseExportDomains(raw?: string): string[] | undefined {
  if (!raw) return undefined;
  const domains = raw
    .split(',')
    .map((d) => d.trim())
    .filter(Boolean);
  return domains.length > 0 ? domains : undefined;
}

/** Human lines for a completed export (after the `wrote <file>` line). */
export function exportSummaryLines(summary: ExportSummary): string[] {
  const total = Object.values(summary.counts).reduce((n, c) => n + c, 0);
  const lines = [
    `${summary.domains.length} domains, ${total} records (schema v${summary.schemaVersion}, secrets: ${summary.secretsMode})`,
  ];
  for (const d of summary.domains) lines.push(`  ${d}: ${summary.counts[d] ?? 0}`);
  return lines;
}

/** Human lines for a dry-run / pre-flight import preview. */
export function importPreviewLines(preview: ImportPreview, mode: string): string[] {
  const total = Object.values(preview.domainCounts).reduce((n, c) => n + c, 0);
  const conflictTotal = Object.values(preview.conflicts).reduce((n, ids) => n + ids.length, 0);
  const lines = [
    `archive: schema v${preview.manifest.schemaVersion} (${preview.compat}), secrets: ${preview.manifest.secretsMode}`,
    `${Object.keys(preview.domainCounts).length} domains, ${total} records, ${conflictTotal} id conflict(s) — mode: ${mode}`,
  ];
  for (const d of Object.keys(preview.domainCounts).sort()) {
    const conf = preview.conflicts[d]?.length ?? 0;
    lines.push(`  ${d}: ${preview.domainCounts[d] ?? 0}${conf ? ` (${conf} conflict${conf === 1 ? '' : 's'})` : ''}`);
  }
  return lines;
}

/** Human lines for a completed restore. */
export function importResultLines(result: ImportResult): string[] {
  const inserted = Object.values(result.inserted).reduce((n, x) => n + x, 0);
  const skipped = Object.values(result.skipped).reduce((n, x) => n + x, 0);
  const lines = [`restored (${result.mode}): ${inserted} inserted, ${skipped} skipped`];
  for (const d of Object.keys(result.inserted).sort()) {
    const sk = result.skipped[d] ?? 0;
    lines.push(`  ${d}: +${result.inserted[d] ?? 0}${sk ? ` (${sk} skipped)` : ''}`);
  }
  if (!result.reindexed) {
    lines.push('note: search reindex warned — run "search reindex" if search looks stale');
  }
  return lines;
}
