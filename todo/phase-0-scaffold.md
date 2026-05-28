# Phase 0 — Scaffold

The initial empty monorepo skeleton. Files are written; the items below cover **verification** that the scaffold actually runs end-to-end. Tick each box as you confirm it on a fresh checkout.

## Verification

- [ ] `proto use` installs the pinned node 22.11.0 + pnpm 9.15.0 cleanly
- [ ] `pnpm install` succeeds at the workspace root, all four packages link
- [ ] `pnpm moon run shared:build` produces `packages/shared/dist/`
- [ ] `pnpm moon run gateway:build` produces `packages/gateway/dist/`
- [ ] `pnpm moon run gateway:dev` boots Nest on `http://localhost:7777`, and `curl localhost:7777/health` returns `{"ok":true}`
- [ ] `pnpm moon run cli:build` produces `packages/cli/dist/`, then `node packages/cli/dist/index.js add hello` prints `not implemented yet`
- [ ] `pnpm moon run web:dev` boots Next.js on `http://localhost:3000` and renders the 5 empty kanban columns

## Known gaps to fix while verifying

- [ ] Confirm `@midnite/shared` is consumable from both ESM (cli, web) and CJS (gateway) — the gateway tsconfig uses `module: commonjs` while shared is ESM. May need a dual `exports` map in `packages/shared/package.json` if Nest can't resolve the ESM build.
- [ ] No lint/format config yet — add eslint + prettier when the first non-scaffold PR needs it
- [ ] No tests yet — `moon run :test` will be a no-op until vitest is wired in
