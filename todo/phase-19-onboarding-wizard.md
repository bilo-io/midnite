# Phase 19 — First-run onboarding & setup wizard

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

## Theme A — Setup-readiness model + endpoint — **M**

The single signal everything else keys off. One contract, one composing endpoint.

- [ ] **`SetupStatus` contract in `shared`** (`setup.ts`): a list of **checklist items**, each `{ id, label, state: 'ok' | 'warn' | 'missing', detail? }`, plus a derived **`ready: boolean`**. Items cover: a provider configured with a key, the agent CLI present (`claude`/`gh` from the environment probe), `MIDNITE_SECRET_KEY` present, the agent pool sized/enabled, and (forward-compat) at least one repo. zod schema + tests.
- [ ] **`GET /setup/status`** — a thin `SetupController` + `SetupService` that **composes** `EnvironmentService` (tool presence), `ProvidersService` (a provider with a key + active), `CryptoService` (is the secret key usable), and `loadConfig()` (pool/repos) into a `SetupStatus`. No new persistence for the *computation*; pure aggregation.
- [ ] **`ready` definition** (Decision §3): `ready` = **≥1 provider has a key** (or a working agent CLI for CLI-driven providers) **AND** `MIDNITE_SECRET_KEY` is present. Tool *warnings* (outdated version) are `warn`, not `missing`, and don't block `ready`. Document the rule next to the schema.

---

## Theme B — Guided wizard UI — **M–L**

A first-run flow that walks the user through the required setup, reusing the existing components.

- [ ] **Wizard shell** — a multi-step flow component (step list + progress + next/back/skip) at a route or modal; steps render from the `SetupStatus` so completed items show as done.
- [ ] **Step: System tools** — embed the existing [`env-tool-card`](../packages/web/app/(main)/settings/system/env-tool-card.tsx) / accordion against `GET /environment`; highlight missing required tools (`claude`/`gh`) with the existing install actions. No new detection.
- [ ] **Step: Provider + key** — reuse the agents/provider form to pick a provider, paste a key (`PUT /providers/:provider`), set active; reflect the `MIDNITE_SECRET_KEY` requirement (fail-closed) inline.
- [ ] **Step: Concurrency / pool** — set `agent.pool` + toggle `agent.poolEnabled` (a small config-write path; reuse whatever settings write mechanism exists, else add a minimal one).
- [ ] **Step: Repo (optional, forward-compatible)** — Decision §1/§5: if **Phase 13's repo registry** (`GET/POST /repos`) exists, use it; **otherwise** a minimal `midnite.json`-config repo add (or a clearly-labelled "skip — manage repos later" pointer). Never a hard requirement.
- [ ] **Finish** — a summary against `SetupStatus` (all green / what's still amber) + a "you're ready" CTA into the board.

---

## Theme C — First-run detection & soft gating — **S–M**

Surface the wizard when it's useful; never get in the way.

- [ ] **On load, fetch `/setup/status`.** If `!ready` (or never completed), show a **dismissible, resumable** "finish setting up" banner + a compact checklist, and an entry into the wizard. **Soft only — never block the board** (Decision §2).
- [ ] **Persist a completed/dismissed flag** (Decision §4): a small **server-side** marker (per-install — e.g. an `admin`/settings key) so it's consistent across browsers, with a localStorage fallback for "dismissed this session." Re-show if setup regresses to not-`ready`.
- [ ] First-run = `!ready` **and** never-completed → auto-open the wizard once; thereafter it's the banner unless reopened.

---

## Theme D — Ongoing Status panel — **S**

The readiness checklist isn't only for first-run — a setup can break later (a revoked key, an uninstalled CLI).

- [ ] A **Status / readiness panel** in [`settings/system`](../packages/web/app/(main)/settings/system/system-section.tsx) rendering the same `SetupStatus` (the green/amber/red checklist) as a permanent view, with deep-links to the relevant settings page per item.
- [ ] Reuses Theme A's endpoint — no second source of truth for "are we set up."

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

- [ ] **Fresh install** (no provider key, no `MIDNITE_SECRET_KEY`) → `GET /setup/status` returns `ready: false` with `missing` items for provider + secret key; the web shows the first-run wizard.
- [ ] Walking the wizard — install/confirm tools (reusing env cards), set a provider key, set the secret key, set pool size — flips each checklist item to `ok` and `ready` to `true`; the finish step reflects all-green.
- [ ] The first-run nudge is **soft**: the board is usable throughout; the banner is dismissible and reappears only if setup regresses to not-`ready`; the completed flag survives a reload.
- [ ] The **optional repo step** works both ways: with Phase 13's registry present it uses `POST /repos`; without it, it does the minimal config add or shows the skip pointer — never blocking.
- [ ] The **Status panel** in settings shows the same checklist; revoking a key / removing the CLI turns the matching item amber/red without touching first-run state.
- [ ] `moon run :typecheck` · `moon run :lint` · `moon run :test` green across the graph; `moon ci` green. (Run web tests from the **primary checkout**, not a `.git` worktree.)

---

## Decisions / open questions

1. **Wizard steps** *(settled in brainstorm: core + optional repo).* Welcome → tools → provider+key → concurrency → finish are core; the repo step is **optional and forward-compatible** (uses Phase 13's registry if present, else a minimal config add / skip pointer).
2. **First-run gating** *(settled in brainstorm: soft).* A dismissible, resumable banner + checklist + wizard; **never** block the board. Forgiving when readiness is mis-detected.
3. **`ready` definition** *(recommend).* `ready` = ≥1 provider with a key (or a working agent CLI) **and** `MIDNITE_SECRET_KEY` present. Tool *version* warnings are `warn`, not blocking. Confirm the exact minimal set in the A PR.
4. **Completed/dismissed flag location** *(recommend: server-side).* A small per-install marker (via the `admin`/settings persistence) so it's consistent across browsers; localStorage as a session-dismiss fallback. Alternative: localStorage-only (simpler, per-browser).
5. **Repo step ↔ Phase 13 coordination** *(resolved direction; timing open).* The repo step is written to **prefer** the Phase 13 registry and **degrade** to config/skip when it's absent — so Phase 19 doesn't block on Phase 13, and automatically upgrades once P13 lands.
6. **Config-write surface** *(open).* Does a settings-write path for `agent.pool`/`poolEnabled` already exist, or does this phase add a minimal one? Confirm in the B PR; keep it thin and `loadConfig()`-respecting.
