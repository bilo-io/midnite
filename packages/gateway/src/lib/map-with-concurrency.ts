/**
 * Map over `items` with a bounded number of concurrent workers, preserving input
 * order in the results. Fans async work out without serialising it (a plain
 * sequential `await` loop) or letting it run unbounded — e.g. classifying a large
 * bulk paste without hammering the LLM (CLAUDE.md async rule). A worker that
 * rejects propagates, so callers that want best-effort semantics catch inside
 * `fn` and return a result value instead of throwing.
 */
export async function mapWithConcurrency<T, R>(
  items: readonly T[],
  limit: number,
  fn: (item: T, index: number) => Promise<R>,
): Promise<R[]> {
  const results = new Array<R>(items.length);
  const workers = Math.max(1, Math.min(Math.trunc(limit), items.length || 1));
  let next = 0;
  async function run(): Promise<void> {
    while (next < items.length) {
      const i = next++;
      results[i] = await fn(items[i]!, i);
    }
  }
  await Promise.all(Array.from({ length: workers }, () => run()));
  return results;
}
