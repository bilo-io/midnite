/**
 * Shared constants for the Playwright e2e harness.
 *
 * Dedicated ports (not the dev 3000 / 7777) so an e2e run never collides with a
 * gateway or web dev server you have open. `playwright.config.ts` boots both: a
 * real gateway on `:memory:` (fresh per run → deterministic, isolated seed data)
 * and a Next dev server pointed at it via `NEXT_PUBLIC_GATEWAY_URL`.
 */
// Oddball ports unlikely to clash with the dev servers (3000 / 7777) or with a
// parallel agent's e2e run — only this harness uses them, so `freePort` in
// playwright.config.ts only ever clears our own orphans.
export const E2E_WEB_PORT = 3311;
export const E2E_GATEWAY_PORT = 7811;

export const WEB_ORIGIN = `http://localhost:${E2E_WEB_PORT}`;
export const GATEWAY_ORIGIN = `http://localhost:${E2E_GATEWAY_PORT}`;
