# Completed work

Append new entries at the **top**. Each entry: one heading with the date, a short summary, and the tickbox list of what landed.

---

## 2026-05-28 — Phase 0 scaffold

Initial empty monorepo skeleton based on [`docs/INITIAL_PLAN.md`](../docs/INITIAL_PLAN.md). Stack overrides confirmed: Nest.js (Fastify adapter) for the gateway, Next.js App Router for the web.

- [x] Workspace root: `.prototools`, `.moon/{workspace,toolchain,tasks}.yml`, `pnpm-workspace.yaml`, root `package.json`, `tsconfig.base.json`, `.gitignore`, `.editorconfig`
- [x] `midnite.json` sample config
- [x] `knowledge/` placeholder folder
- [x] `packages/shared` — zod config schema (`config.ts`), task types (`task.ts`)
- [x] `packages/gateway` — Nest.js + Fastify adapter, `/health` controller, drizzle dir placeholder
- [x] `packages/cli` — commander program with `add` / `list` / `move` / `serve` stubs
- [x] `packages/web` — Next.js App Router with placeholder kanban layout (5 columns)
- [x] `todo/` tracker folder
- [x] `CLAUDE.md` brief

> Verification (`pnpm install`, `moon run gateway:dev`, `moon run web:dev`, `node packages/cli/dist/index.js add hello`) is the next implementer's responsibility — see [phase-0-scaffold.md](phase-0-scaffold.md) for the unchecked verification items.
