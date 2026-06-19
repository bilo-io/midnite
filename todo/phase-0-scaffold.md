# Phase 0 — Scaffold ✅

The initial empty monorepo skeleton. The items below cover **verification** that the scaffold runs end-to-end.

> **Status (2026-06-19): complete.** Confirmed against the live project rather than a pristine clone — the workspace builds, lints, and tests green in CI via `moon ci` ([.github/workflows/ci.yml](../.github/workflows/ci.yml)), and all four packages have shipped many features since. Note the package count grew from four to six (`desktop`, `site` added).

## Verification

- [x] `proto use` installs the pinned node 22.11.0 + pnpm 9.15.0 cleanly
- [x] `pnpm install` succeeds at the workspace root, all packages link
- [x] `pnpm moon run shared:build` produces `packages/shared/dist/`
- [x] `pnpm moon run gateway:build` produces `packages/gateway/dist/`
- [x] `pnpm moon run gateway:dev` boots Nest on `http://localhost:7777`, and `curl localhost:7777/health` returns `{"ok":true}`
- [x] `pnpm moon run cli:build` produces `packages/cli/dist/` — note the `add` stub is long gone; the CLI now makes real REST calls (see Phase 1)
- [x] `pnpm moon run web:dev` boots Next.js on `http://localhost:3000` and renders the kanban board

## Known gaps to fix while verifying — all resolved

- [x] `@midnite/shared` is consumable from both ESM (cli, web) and CJS-interop (gateway) — the project builds across all consumers
- [x] Lint/format config added — `eslint.config.mjs`, `.prettierrc.json`, `.prettierignore` at the root; `moon ci` runs lint
- [x] Tests wired in — Vitest across `shared` and `gateway` (270+ gateway tests as of 2026-06-19)
