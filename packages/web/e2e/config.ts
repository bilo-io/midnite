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

// Use 127.0.0.1, not `localhost`: the gateway binds IPv4 (config default host
// 127.0.0.1), but on Node ≥18 with verbatim DNS ordering `localhost` can resolve
// to ::1 (IPv6) first — so the Node-side health poll + seed fetch would hit a
// port nothing is listening on. Pinning IPv4 keeps every hop consistent.
export const WEB_ORIGIN = `http://127.0.0.1:${E2E_WEB_PORT}`;
export const GATEWAY_ORIGIN = `http://127.0.0.1:${E2E_GATEWAY_PORT}`;

// Where the Theme E1 screenshot capture writes its PNGs (relative to this
// package). Not a Playwright `toHaveScreenshot` baseline dir — these are
// preview artifacts (browsable locally, uploadable as CI artifacts), so the
// folder is gitignored. Committed OS-pinned visual baselines are Theme E2.
export const SCREENSHOTS_DIR = 'e2e/__shots__';
