/**
 * Story-only `fetch` stub for the data-fetching dashboard widgets.
 *
 * The widgets read live gateway data through `usePolling`/`useApiData` → the
 * `@/lib/api` helpers → the global `fetch`. To story them deterministically and
 * offline, `installMockFetch` swaps `globalThis.fetch` for a stub that answers
 * from a list of canned, schema-valid responses keyed by request path. Returns a
 * teardown that restores the real fetch — drive it from a story `beforeEach` so
 * each story installs its own handlers and cleans up (no cross-story leakage).
 *
 * `@/lib/api`'s `fetchJson` throws on a non-2xx response, so a handler with a
 * `status >= 400` exercises a widget's error branch. An **unmatched** request
 * falls through to the real `fetch` — the stub only answers the gateway paths
 * you declare. That pass-through is important: Storybook's own browser runner
 * loads story modules via `fetch`, so intercepting unmatched URLs would break
 * unrelated stories if this mock ever outlived its story.
 */
export type FetchHandler = {
  /** Substring matched against the request URL; the first match wins, so list
   *  more specific paths (e.g. `/agents/cli/statuses`) before broader ones (`/agents`). */
  match: string;
  /** JSON body for a 200 response. Must satisfy the endpoint's zod schema. */
  json?: unknown;
  /** Override the status; `>= 400` drives the widget's error branch. */
  status?: number;
};

export function installMockFetch(handlers: FetchHandler[]): () => void {
  const original = globalThis.fetch;
  globalThis.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
    const url =
      typeof input === 'string' ? input : input instanceof URL ? input.href : input.url;
    const handler = handlers.find((h) => url.includes(h.match));
    if (!handler) {
      return original(input, init);
    }
    const body = handler.json === undefined ? '' : JSON.stringify(handler.json);
    return new Response(body, {
      status: handler.status ?? 200,
      headers: { 'content-type': 'application/json' },
    });
  }) as typeof fetch;
  return () => {
    globalThis.fetch = original;
  };
}
