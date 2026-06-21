import type { BulkCreateTaskResponse } from '@midnite/shared';

type BulkCounts = BulkCreateTaskResponse['counts'];

/** Truncate a prompt for the summary table so a long line doesn't wrap the cell. */
function truncate(text: string, max = 48): string {
  return text.length > max ? `${text.slice(0, max - 1)}…` : text;
}

/**
 * Process exit code for a bulk add. A partial batch is a success (Decision §2):
 * we only fail when at least one line was attempted and **every** one failed —
 * a clear "nothing landed" signal for scripts. An all-skipped batch (blank /
 * comment lines only) created nothing but isn't an error.
 */
export function bulkExitCode(counts: BulkCounts): number {
  return counts.created === 0 && counts.failed > 0 ? 1 : 0;
}

/** The trailing one-line tally, e.g. `3 created, 1 skipped, 1 failed`. */
export function bulkSummaryLine(counts: BulkCounts): string {
  return `${counts.created} created, ${counts.skipped} skipped, ${counts.failed} failed`;
}

/** Table rows for the per-line result: line → kind → status (or its error). */
export function bulkResultRows(res: BulkCreateTaskResponse): string[][] {
  return res.results.map((r) => [
    truncate(r.line),
    r.error ? '—' : (r.kind ?? '—'),
    r.error ? `error: ${r.error}` : (r.status ?? '—'),
  ]);
}
