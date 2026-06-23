# Phase 19 — First-run onboarding & setup wizard ✅

> midnite has a lot of moving parts to configure before it does anything useful — an LLM provider + API key (encrypted at rest, Phase 7 A1), an agent CLI on `PATH` (`claude` / `gh`), the `MIDNITE_SECRET_KEY` that makes encrypted credentials usable, an agent pool size, and (eventually) repos. Today those live as **scattered settings pages** ([`settings/agents`](../packages/web/app/(main)/settings/agents/agents-view.tsx) for providers, [`settings/system`](../packages/web/app/(main)/settings/system/system-section.tsx) for tools, …) with **no guided sequence and no notion of "is this install actually set up?"** A fresh user lands on an empty board with no idea what to do first. **Phase 19 adds a first-run onboarding flow:** a single readiness model the gateway computes, a guided wizard that walks a new user through the required setup (reusing the surfaces that already exist), and a soft, dismissible nudge whenever setup is incomplete.

> **The good news — most pieces already exist; this phase *sequences* them.** System-tool detection is built end-to-end: [`environment.service.ts`](../packages/gateway/src/environment/environment.service.ts) probes `ENV_TOOLS_BY_OS` via `detectCli` (a login-shell, PATH-aware check) and `GET /environment` returns per-tool install/version status, which [`env-tool-card.tsx`](../packages/web/app/(main)/settings/system/env-tool-card.tsx) renders with status dots + install/update actions. Provider keys are built: [`providers.controller.ts`](../packages/gateway/src/providers/providers.controller.ts) (`GET /providers`, `PUT /providers/:provider`) + the agents settings view, with keys encrypted via [`crypto`](../packages/gateway/src/crypto/crypto.service.ts). `GET /health` exists but is a bare `{ ok: true }` liveness stub. **The wizard must reuse these, not reimplement them.**

> **Scope guardrails (CLAUDE.md).** The readiness shape (`SetupStatus`) is a new contract → it lives in [`@midnite/shared`](../packages/shared/src/) with a zod schema; `cli`/`web` stay pure clients. The `GET /setup/status` endpoint **composes existing services** (environment, providers, crypto-key presence, config) — it does **not** reach into other domains' repositories. The wizard UI **reuses existing settings components** (env cards, provider form) inside a flow shell; no duplicated forms. Reading config goes through `loadConfig()` only. Business logic stays in services, controllers stay thin.

> Effort tags: **S** small · **M** medium · **L** large. **Theme A is the substrate** (the readiness model gates B/C/D). Every box starts unchecked.

---

## Current state (baseline to build on)

- **environment (built):** [`environment.service.ts`](../packages/gateway/src/environment/environment.service.ts) → `GET /environment` returns `{ os, tools: EnvToolStatus[] }` (installed/version per tool) using `ENV_TOOLS_BY_OS` + `detectCli`. Web [`env-tool-card.tsx`](../packages/web/app/(main)/settings/system/env-tool-card.tsx) + [`environment-accordion.tsx`](../packages/web/app/(main)/settings/system/environment-accordion.tsx) render it. **Tool health-check exists.**
- **providers (built):** [`providers.controller.ts`](../packages/gateway/src/providers/providers.controller.ts) — `GET /providers` (list + active + which have keys), `PUT /providers/active`, `PUT /providers/:provider` (set credential). Keys encrypted at rest; fail-closed without `MIDNITE_SECRET_KEY` (Phase 7 A1).
- **config:** [`config.ts`](../packages/shared/src/config.ts) — `agent.pool` (default 4), `agent.poolEnabled` (default **false**), `repos` (default `[]`), `terminal`, `gateway`, etc., via `loadConfig()`.
- **agent CLI:** [`agents/cli-detect.ts`](../packages/gateway/src/agents/cli-detect.ts) (`detectCli`) + `AgentsService.getAgentCli()` — the same login-shell probe the environment checker uses.
- **settings UI:** appearance · agents (providers/models) · system (env tools) · user · screen-lock — all standalone, no guided sequence.
- **missing:** any aggregate "are we set up?" signal, any first-run detection, any guided flow, any persisted "onboarding complete" marker.

---

## Theme A — Setup-readiness model + endpoint — **M** — ✅ DONE (PR #73, 2026-06-22 — see [done.md](done.md))

The single signal everything else keys off. One contract, one composing endpoint.

- [x] **`SetupStatus` contract in `shared`** (`setup.ts`): a list of **checklist items**, each `{ id, label, state: 'ok' | 'warn' | 'missing', detail? }`, plus a derived **`ready: boolean`**. Items cover: a provider configured with a key, the agent CLI present, `MIDNITE_SECRET_KEY` present, the agent pool sized/enabled, and (forward-compat) at least one repo. zod schema + tests.
- [x] **`GET /setup/status`** — a thin `SetupController` + `SetupService` that **composes** `ProvidersService` (a provider with a key + active), `CryptoService` (is the secret key usable), `AgentsService` (configured agent CLI on PATH — the `claude`/`gemini`/… detector, since `EnvironmentService` only probes the dev toolchain), and the loaded config (pool/repos) into a `SetupStatus`. No new persistence; pure aggregation.
- [x] **`ready` definition** (Decision §3): `ready` = **≥1 provider has a key** (or a working agent CLI for CLI-driven providers) **AND** `MIDNITE_SECRET_KEY` is present. Tool *warnings* (outdated version) are `warn`, not `missing`, and don't block `ready`. Rule documented next to the schema in `isSetupReady`.

---

## Theme B — Guided wizard UI — **M–L** — ✅ DONE (PR #121, 2026-06-23 — see [done.md](done.md))

A first-run flow that walks the user through the required setup, reusing the existing components.

- [x] **Wizard shell** — `SetupWizard` modal overlay with step breadcrumb (done=✓, active=filled, future=hollow), back/skip nav, Escape/× to dismiss. `SetupWizardController` auto-opens on first visit when `!ready` + not previously dismissed (localStorage flag). Mounts in the main layout alongside `SetupNudge`.
- [x] **Step: System tools** — shows `claude` + `gh` status from `GET /environment` with Install links; re-check button; Continue skips over any issues.
- [x] **Step: Provider + key** — provider dropdown + API key input (`updateProvider` → `setActiveProvider`); existing key shown masked.
- [x] **Step: Concurrency / pool** — pool-size range slider backed by `useLocalStorage` (matches agents settings page); no gateway write needed (localStorage is the source of truth).
- [x] **Step: Repo (optional)** — name + path inputs → `createRepo` (Phase 13 registry); "skip — manage repos later" link never blocks.
- [x] **Finish** — re-fetches `SetupStatus`; green "You're all set!" badge when `ready`; deep-links for remaining items; "Start building" routes to `/tasks`.
- [x] **`SetupNudge` wired** — new `onOpenWizard` prop; nudge CTA becomes "Open setup wizard" when the wizard is wired in.

---

## Theme C — First-run detection & soft gating — **S–M** — ✅ DONE (PR #79, 2026-06-22 — see [done.md](done.md))

Surface the wizard when it's useful; never get in the way.

- [x] **On load, fetch `/setup/status`.** When `!ready`, show a **dismissible** "finish setting up" corner card + a compact checklist, with each unfinished item deep-linking into its settings surface (the dedicated wizard is Theme B — not built yet). **Soft only — never blocks the board** (Decision §2): hidden when `ready`, hidden on `/settings/*` (Theme D's view), re-fetches on window focus so a regressed setup re-surfaces.
- ◐ **Persist a completed/dismissed flag** (Decision §4): shipped the **sanctioned localStorage/session fallback** (sessionStorage — dismiss lasts the session, returns in a fresh session while still `!ready`). The **server-side per-install marker** is deferred to Theme B (the wizard), where auto-open-once + cross-browser consistency actually need it — avoids a gateway migration colliding with the in-flight schema work.
- ⏳ First-run auto-open of the **wizard** — deferred to Theme B (no wizard yet); the soft card covers the nudge in the meantime.

---

## Theme D — Ongoing Status panel — **S** — ✅ DONE (PR #82, 2026-06-22 — see [done.md](done.md))

The readiness checklist isn't only for first-run — a setup can break later (a revoked key, an uninstalled CLI).

- [x] A **Status / readiness panel** in [`settings/system`](../packages/web/app/(main)/settings/system/system-section.tsx) (`SetupStatusPanel`) rendering the same `SetupStatus` (green/amber/red checklist) as a permanent view, with a Ready/Setup-incomplete badge, a deep-link per item, and a Re-check button. Re-checks on focus so a regressed setup turns amber/red without a reload.
- [x] Reuses Theme A's endpoint — no second source of truth. Shared presentation helper ([`lib/setup-items.ts`](../packages/web/lib/setup-items.ts)) keeps the panel and the Theme-C nudge in lock-step.

---

## Out of scope (named, not built here)

- **Ops observability / metrics** — queue depth, tick latency, LLM-spend dashboards, trace correlation: that's a separate observability phase. Phase 19's "health" is **setup readiness**, not runtime metrics.
- **Installing tools for the user** beyond the **existing** env-card install/update actions — the wizard surfaces and links, it doesn't add a new installer.
- **Repo cloning / on-disk management** — the (optional) repo step registers an existing checkout; cloning is out (matches [phase-13](phase-13-repos-first-class.md)'s own boundary).
- **Provider OAuth** — API-key entry only; OAuth is [phase-14](phase-14-workflows-connect.md).
- **Multi-user / team onboarding** — single-install setup only.

---

## Files this phase touches (map)

- **shared:** new [`setup.ts`](../packages/shared/src/) (`SetupStatus` + item schema + `ready` rule) + barrel + tests; typed client `getSetupStatus` (+ a completed-flag get/set if server-side).
- **gateway:** new `setup/` module — `setup.controller.ts` (`GET /setup/status`, + the completed-flag route if server-side), `setup.service.ts` composing `EnvironmentService` / `ProvidersService` / `CryptoService` / `loadConfig()`; register in `AppModule`. A minimal config/settings **write** path for pool/`poolEnabled` if one doesn't already exist (kept thin). No new cross-domain repository access.
- **web:** a wizard shell + steps under [`app/(main)/`](../packages/web/app/(main)/) (or a modal) reusing [`env-tool-card`](../packages/web/app/(main)/settings/system/env-tool-card.tsx) + the provider form; a first-run banner/checklist in the main layout; a Status panel in [`settings/system`](../packages/web/app/(main)/settings/system/system-section.tsx); client calls in [`lib/api.ts`](../packages/web/lib/api.ts).
- **Docs:** update [`CLAUDE.md`](../CLAUDE.md) (setup/readiness model) + README (first-run flow, required env: provider key + `MIDNITE_SECRET_KEY` + agent CLI); append to [`done.md`](done.md) as slices land.

---

## Verification

- [x] **Fresh install** (no provider key, no `MIDNITE_SECRET_KEY`) → `GET /setup/status` returns `ready: false` with `missing` items; the web shows the first-run wizard (auto-opens when `!ready` and not dismissed).
- [x] Walking the wizard — tools check, set a provider key, set pool size, optionally add a repo — reaches the Finish step; the Finish step re-fetches `SetupStatus` and shows a green "You're all set!" badge when `ready`.
- [x] The first-run nudge is **soft**: the board is usable throughout; the wizard is dismissible (×/Escape/localStorage flag); the nudge re-surfaces on window focus if setup regresses.
- [x] The **optional repo step** uses `POST /repos` (Phase 13 registry); a "skip — manage repos later" link never blocks.
- [x] The **Status panel** in settings shows the same checklist; the nudge's CTA opens the wizard directly via the `onOpenWizard` callback.
- [x] `moon run :typecheck` green; web 403/403 (run from outside `.git/worktrees`).

---

## Decisions / open questions

1. **Wizard steps** *(settled in brainstorm: core + optional repo).* Welcome → tools → provider+key → concurrency → finish are core; the repo step is **optional and forward-compatible** (uses Phase 13's registry if present, else a minimal config add / skip pointer).
2. **First-run gating** *(settled in brainstorm: soft).* A dismissible, resumable banner + checklist + wizard; **never** block the board. Forgiving when readiness is mis-detected.
3. **`ready` definition** *(recommend).* `ready` = ≥1 provider with a key (or a working agent CLI) **and** `MIDNITE_SECRET_KEY` present. Tool *version* warnings are `warn`, not blocking. Confirm the exact minimal set in the A PR.
4. **Completed/dismissed flag location** *(recommend: server-side).* A small per-install marker (via the `admin`/settings persistence) so it's consistent across browsers; localStorage as a session-dismiss fallback. Alternative: localStorage-only (simpler, per-browser).
5. **Repo step ↔ Phase 13 coordination** *(resolved direction; timing open).* The repo step is written to **prefer** the Phase 13 registry and **degrade** to config/skip when it's absent — so Phase 19 doesn't block on Phase 13, and automatically upgrades once P13 lands.
6. **Config-write surface** *(open).* Does a settings-write path for `agent.pool`/`poolEnabled` already exist, or does this phase add a minimal one? Confirm in the B PR; keep it thin and `loadConfig()`-respecting.
