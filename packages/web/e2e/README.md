# Web e2e flow tests (Playwright)

Phase 10 Theme D — end-to-end flow tests that drive the **real Next.js app
against a real gateway**, covering the cross-package paths unit/component tests
can't (navigation, the kanban drag, live data, the office canvas).

## Run

```bash
moon run web:e2e                       # from the repo root (recommended)
pnpm exec playwright test              # from packages/web
pnpm exec playwright test --headed     # watch it drive a browser
pnpm exec playwright test board        # a single spec
```

First time only, install the browser: `pnpm exec playwright install chromium`.

> Run from the **primary checkout**, not a `.git/worktrees` worktree — Vite/Next
> tooling can't collect files under `.git/**`.

## How it works

[`playwright.config.ts`](../playwright.config.ts) boots two servers for the run:

- **Gateway** (`tsx src/main.ts`) on **:7799**, against a temp `:memory:` SQLite
  (fresh per run → deterministic), with its agent pool disabled and no LLM
  credentials ([`e2e/fixtures/midnite.e2e.json`](fixtures/midnite.e2e.json)) — it
  serves real REST/WS but never spawns an agent or makes an external call.
- **Next dev** on **:3100**, pointed at that gateway via `NEXT_PUBLIC_GATEWAY_URL`.

Dedicated ports keep an e2e run from colliding with your dev `:3000`/`:7777`.
Specs seed data over the gateway REST API ([`helpers/gateway.ts`](helpers/gateway.ts))
and assert against accessible roles/text — never pixels or test IDs.

> **One run per machine at a time.** The ports and the temp DB path are fixed, so
> a second concurrent `web:e2e` on the same box would free the first run's ports
> and wipe its DB. Fine for CI (isolated) and normal local use; don't run two at once.

## Not in `moon ci`

`web:e2e` is heavier and spawns servers, so it's kept out of the default `:test`
gate and out of `moon ci` (`runInCI: false`). A dedicated CI job + screenshot
artifacts are Phase 10 Theme F / E.
