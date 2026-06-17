// Scrape a pull/merge-request URL from an agent's terminal output. Used by the
// Stop hook to decide whether an autonomous run actually completed (opened a PR)
// vs merely paused. Last match wins — the most recently announced PR is the one
// the agent just opened. Pure; unit-tested.

const PR_URL =
  /https?:\/\/(?:github\.com\/[\w.-]+\/[\w.-]+\/pull\/\d+|gitlab\.com\/[\w./-]+\/-\/merge_requests\/\d+)/g;

export function extractPrUrl(text: string): string | undefined {
  const matches = text.match(PR_URL);
  return matches ? matches[matches.length - 1] : undefined;
}
