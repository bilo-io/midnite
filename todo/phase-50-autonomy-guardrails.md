# Phase 50 — Autonomy Guardrails & Blast Radius (enforce, don't just record)

> midnite's whole bet is **autonomous agents acting unattended** — editing code, running
> commands, opening and merging PRs. Phase 23 built the approvals *engine* and Phase 33 the
> *audit log*, but almost every blast-radius control today is **recorded, not enforced**: spend
> is tracked but never blocks ("Calls are NOT blocked"), there's **no kill switch or global
> pause** (only per-task stop; disabling the pool needs a config reload + restart), sessions
> spawn with a **full unscrubbed env** and no destructive-action limits, and audit coverage has
> holes (approval-rule edits, repo mutations, guardrail changes all unaudited — and
> `ApprovalsController` isn't even RBAC-gated). Phase 50 **hardens the autonomy story**: it turns
> safety into real enforcement at **two layers** — the **scheduler** (don't *start* risky or
> over-budget work) and the **act path** (deny dangerous tools *mid-run*) — and gives operators a
> panel + CLI to drive it. The good news the grounding surfaced: the **enforcement seam already
> exists** — Claude Code's **PreToolUse hook makes a blocking call** that can genuinely `deny` a
> tool before it runs. This phase builds on that seam rather than inventing one.

> **Scope guardrails (CLAUDE.md).** This work **extends the existing
> [`approvals/`](../packages/gateway/src/approvals/) module** into midnite's single **safety
> domain** — pause/kill + spend/rate caps + destructive rules + policy mode all live here (no new
> parallel module; the alternative was rejected in Decision §1). Enforcement wires into two
> **existing** points, additively: the scheduler tick
> ([`pool/agent-pool-scheduler.service.ts`](../packages/gateway/src/pool/agent-pool-scheduler.service.ts))
> and the PreToolUse decision path
> ([`terminal/approval.service.ts`](../packages/gateway/src/terminal/approval.service.ts) →
> [`approvals.service.ts`](../packages/gateway/src/approvals/approvals.service.ts) `evaluate`).
> Every new setting/rule/decision is a **zod schema in [`shared`](../packages/shared/src/)**;
> settings are **DB-backed** (an emergency stop must survive a restart — never config-only).
> Guardrail state changes are **audited** ([`AuditService`](../packages/gateway/src/audit/audit.service.ts))
> and **RBAC-gated** ([`role.guard.ts`](../packages/gateway/src/auth/role.guard.ts), admin+).
> Enforcement is **fail-safe** (over-budget/paused ⇒ don't spawn; a blast-radius match ⇒ deny),
> and existing behavior is **preserved** when guardrails are unset (defaults = today's behavior).
> Web + CLI stay pure gateway clients over the typed API.

> Effort tags: **S** small · **M** medium · **L** large. **A** (kill switch/pause) + **B**
> (spend/rate caps) are the **scheduling-layer** gates; **C** (destructive limits) is the
> **act-path** gate and the hardest; **D** (audit + RBAC) closes the accountability gaps; **E**
> (panel) + **F** (CLI) make it operable. A→B (both hook the scheduler tick) then C (the act
> path); D is cross-cutting; E/F consume A–D.

---

## Current state (what exists — ENFORCED vs. RECORDED)

- **Approvals engine (Phase 23)** — [`approvals/approvals.service.ts`](../packages/gateway/src/approvals/approvals.service.ts):
  `getMode()` (`manual` | `guarded` | `autonomous`) + `evaluate(toolName, toolInput)` →
  `escalate` | `auto-allow` | `auto-deny`. Tables: `approval_rules` (`effect` allow/deny,
  `toolName` wildcard, `match` JSON `{commandPrefix[], pathGlob[]}`, `scope`), `approval_settings`
  (singleton `mode`), `approval_log`. **ENFORCED** via the act-path seam below; rule CRUD is
  **not** RBAC-gated (any member can edit rules).
- **The enforcement seam (act path)** — Claude Code's **PreToolUse** hook
  (`POST /hooks/sessions/:sessionId/pre-tool-use`, [`terminal/approval.controller.ts`](../packages/gateway/src/terminal/approval.controller.ts))
  makes a **blocking** call into [`terminal/approval.service.ts`](../packages/gateway/src/terminal/approval.service.ts)
  `requestDecision()`, which consults `approvals.evaluate()` and returns `{ decision: 'allow' | 'deny' | 'ask' }`
  — **Claude blocks the tool until we answer.** Fail-safe on no-subscriber/timeout via
  `config.terminal.approvals`. **This is the lever Theme C pulls.**
- **The spawn path** — `AgentPoolScheduler.tick()` (feature-flagged `poolEnabled`) → `AgentRunnerService.start()`
  → `TerminalService.spawnAgentSession()`. Soft caps exist (`agent.pool`, `agent.maxPerRepo`,
  `agent.perUserMaxSlots`) — the scheduler just **skips** a task when full; **no pause/kill**. The
  session spawns with a **full unscrubbed env** and **no `allowedTools`**.
- **Usage (Phase 7/18)** — [`usage/usage.service.ts`](../packages/gateway/src/usage/usage.service.ts)
  records `llm_usage` and `budgetWarnings()` **soft-warns only** ("Calls are NOT blocked"). Nothing
  reads it to gate a spawn.
- **Audit (Phase 33)** — [`audit/audit.service.ts`](../packages/gateway/src/audit/audit.service.ts)
  records `audit_log` `{ entityType, entityId, userId?, action, payload?, createdAt }`; covers tasks/auth/
  workflows/users/teams. **Gaps:** approval-rule CRUD, repo/project mutations, and (this phase's) guardrail
  changes are **unaudited**; approval decisions live only in `approval_log`.
- **RBAC (Phase 35)** — [`auth/role.guard.ts`](../packages/gateway/src/auth/role.guard.ts) `@RequiresRole`
  (owner>admin>member>viewer) via `TeamsService.getMembership`. Applied on tasks/projects/teams; **absent on
  `ApprovalsController`**.
- **Config** — [`shared/src/config/`](../packages/shared/src/config/): `agent.*`, `usage.dailyBudgetUsd`/
  `monthlyBudgetUsd`/`warnAtRatio`, `terminal.approvals.*`. Extended (not replaced) here.

---

## Theme A — Kill switch & global pause (scheduling gate) — **M** — ✅ DONE (PR #274, 2026-07-02)

An emergency stop that actually stops, and survives a restart.

- [x] **shared:** the safety contract — `GuardrailSettings` (`pausedGlobal` + `pausedRepos`/`pausedTeams` id sets
      + `pausedBy`/`pausedAt`), `PauseScope` (`global`|`repo`|`team`), `PauseRequest`, `EmergencyStopRequest`, a
      `guardrails.updated` WS event + `isTaskPaused` helper. Zod in [`shared/src/guardrails.ts`](../packages/shared/src/guardrails.ts).
- [x] **gateway (approvals module):** pause state persisted on the `approval_settings` singleton (migration `0064`)
      so it's **DB-backed, not config** — survives a restart. `ApprovalsService.getGuardrails / setPause /
      emergencyStop / isTaskPaused / isGloballyPaused`; admin-gated + audited `GuardrailsController`.
- [x] **enforce at the scheduler:** `AgentPoolScheduler.tick()` short-circuits on a global pause and filters the
      ready-set via `isTaskPaused` for scoped (repo/team) pauses. A paused system spawns nothing.
- [x] **emergency stop:** `POST /guardrails/emergency-stop` sets pause **and** broadcasts `guardrails.updated
      { emergencyStop }`; the pool reacts by aborting matching in-flight agents (`runner.stop → todo`, requeued not
      abandoned — Decision §A; event-driven so approvals needn't depend on the pool). Web shows a paused banner +
      pause/emergency-stop control; resume clears it. *(Two-tier pause-vs-stop per Stage-2.5; full Safety panel = E,
      CLI = F.)*

---

## Theme B — Spend & rate caps that block (scheduling gate) — **M-L** — ✅ DONE (PR #279, 2026-07-02)

Promote budgets from advisory to enforced. **Enforced globally** (Stage-2.5 decision): `llm_usage` carries no
repo/team cost attribution, so per-scope *spend* caps aren't computable without new plumbing — deferred; the rate
cap is likewise global for now.

- [x] **shared/config:** hard caps distinct from the existing soft `warnAtRatio` — `usage.hardDailyCapUsd` /
      `hardMonthlyCapUsd` and a spawn-rate limit (`agent.maxSpawnsPerHour`). Zod-validated. A `BudgetStatus`
      contract + a derived `Task.heldReason` (`over-budget` | `rate-limited`) + an `agent.held` notification kind.
- [x] **gateway:** `UsageService.checkBudget()` (today's/this-month's spend vs. the hard cap — inert with no
      query when no cap is set) and a spawn-rate counter (in-memory sliding 1h window; resets on restart — a
      throttle, not a durable ledger, per Stage-2.5).
- [x] **enforce at the scheduler:** `tick()` holds a spawn when over the hard budget (all ready tasks) or the
      spawn-rate window is full (the remaining ready tasks) — the task stays `todo`, re-evaluated next tick
      (mirrors the soft-cap skip; no new status).
- [x] **surface the reason:** a derived `Task.heldReason` (a leaf `HeldTasksRegistry` the scheduler replaces each
      tick, attached on read — never persisted) drives an amber board chip ("Held: over budget" / "Held:
      rate-limited"); a `task.updated` broadcast fires on each held-state edge, plus one edge-triggered
      `agent.held` notification per cap-type breach.

---

## Theme C — Destructive-action limits (act-path gate) — **L** — ✅ DONE (PR #286, 2026-07-03)

Deny the genuinely dangerous, mid-run — the heart of blast-radius.

- [x] **built-in blast-radius ruleset:** a **code-defined, config-driven** detector (`approvals/lib/blast-radius.ts`,
      not deletable `approval_rules` rows — Stage-2.5) — force-push (`git push --force`/`-f`/`--force-with-lease`),
      protected-branch push (`main`/`master`, incl. `HEAD:main` refspecs), recursive force delete (`rm -rf` + flag
      variants), and secret/credential-file access (file-tool paths **and** file refs inside a Bash command, glob-matched
      over `.env`/keys/creds). `ApprovalsService.evaluate()` now returns `{ verdict, ruleId?, reason? }`; a blast-radius
      match is `auto-deny` with a reason.
- [x] **denials override mode:** the floor is checked **first** in `guarded`/`autonomous` so a hard-deny overrides the
      mode (an `autonomous` agent can't force-push). **`manual` is untouched** (a human reviews every call — Stage-2.5).
      Enabled by default; protected branches + globs are **global** config (`guardrails.blastRadius.*`; per-repo overrides deferred).
- [x] **scrub the spawn env:** `spawnAgentSession()` strips the gateway's **own** secrets (`MIDNITE_SECRET_KEY` + the
      configured auth-token/JWT/workflows-key env names) via `scrubGatewaySecrets`, **preserving the agent's provider
      auth** (`ANTHROPIC_API_KEY` etc — a broad strip would break the agent) + the `MIDNITE_*` hook wiring (re-injected
      after). Behind `guardrails.scrubSpawnEnv` (**default off** → preserves today's env). The `--allowedTools` flag is deferred.
- [x] every blast-radius decision is logged (`approval_log` with the matched `ruleId` + audited via the Theme D
      `approval.decided` mirror); the reason is surfaced to the agent as the denial message.

---

## Theme D — Audit completeness + RBAC gaps — **M** — ✅ DONE (PR #281, 2026-07-03)

Make every unattended action and every guardrail change accountable.

- [x] **close audit gaps:** `AuditService.record()` on approval-rule CRUD, guardrail mode changes, and repo +
      project mutations; every act-path `approval_log` decision is **mirrored** into the audit trail
      (`approval.decided`, entityId = sessionId) so "what did agents do + what did we allow/deny" is one query.
      (Pause/kill were already audited in Theme A; hard-cap edits are config-only in Theme B — no endpoint to audit.)
- [x] **RBAC-gate the safety surface:** `@RequiresRole('admin')` on `ApprovalsController` rule create/update/delete
      + the autonomy-mode PATCH. (Pause/kill endpoints were already admin-gated in Theme A.) Reads stay open (the
      Settings page shows the policy); static-token / single-user installs are unaffected (RoleGuard skips with no
      `req.user`).
- [x] **audit record hygiene:** distinct entity types (`approval_rule`, `project`) + consistent verbs + a
      before/after `payload` diff for rule/mode/repo/project updates, so the Theme E feed is readable.

---

## Theme E — Safety control panel (web) — **M-L**

One place to see and steer the guardrails.

- [ ] A **Settings → Safety** page (admin-gated): **policy mode** toggle (manual/guarded/autonomous), an
      **approval-rules editor** (allow/deny, tool, command-prefix/path-glob), **spend & rate caps**, the
      **protected-actions** config (branches + globs), and the **kill switch / pause** control (scope picker +
      big emergency-stop).
- [ ] A **live audit + decisions feed** (WS `guardrails.updated` + audit stream): recent allow/deny decisions,
      blocked spawns, guardrail changes — with who/what/when.
- [ ] A persistent **paused banner** on the board when the system (or the current repo/team) is paused, with a
      resume affordance. Typed client methods in [`web/lib/api.ts`](../packages/web/lib/api.ts).

---

## Theme F — CLI safety commands — **S** — ✅ DONE (PR #284, 2026-07-03)

Hit the brakes from a shell — for when the UI is the thing that's down.

- [x] `midnite guardrails status` (mode, pause state, configured caps, last 10 act-path denials — respects global
      `--json`), `midnite guardrails pause|resume [--repo <name> | --team <id>]` (default global), and
      `midnite kill [--repo|--team] [--yes]` (emergency stop; interactive confirm at a TTY, **refuses without
      `--yes` in `--json`/non-TTY**).
- [x] Extended the `GatewayClient` ([`cli/src/client.ts`](../packages/cli/src/client.ts)) with
      `getGuardrails` / `setPause` / `emergencyStop` / `getApprovalLog`; thin commander commands per the house
      pattern (pure render/parse helpers in `cli/src/guardrails.ts`). **gateway:** `GET /guardrails` now returns a
      read-only `caps` block (config-sourced mode + hard/soft spend caps + spawns-per-hour) so `status` reads the
      whole picture in one call — the web Safety panel (Theme E) reuses it. `GuardrailCaps` zod contract in `shared`.

---

## Files this phase touches (map)

- **New/edit (shared):** guardrail settings + emergency-stop + hard-cap + protected-action schemas in
  [`shared/src/`](../packages/shared/src/) (extending the approvals contract); config additions in
  [`shared/src/config/`](../packages/shared/src/config/); a `guardrails.updated` WS event in
  [`shared/src/events/`](../packages/shared/src/events/); client methods in
  [`web/lib/api.ts`](../packages/web/lib/api.ts) + [`cli/src/client.ts`](../packages/cli/src/client.ts)
- **Edit (gateway, approvals module):** [`approvals/approvals.service.ts`](../packages/gateway/src/approvals/approvals.service.ts)
  (`isPaused`, blast-radius rules, `evaluate` extension), `approvals.controller.ts` (pause/kill/caps endpoints
  + `@RequiresRole('admin')`); `approval_settings` columns in [`db/schema.ts`](../packages/gateway/src/db/schema.ts)
  + a forward-only [`drizzle/`](../packages/gateway/drizzle/) migration
- **Edit (gateway, enforcement points):** [`pool/agent-pool-scheduler.service.ts`](../packages/gateway/src/pool/agent-pool-scheduler.service.ts)
  (pause + budget + rate gate in `tick()`); [`usage/usage.service.ts`](../packages/gateway/src/usage/usage.service.ts)
  (`checkBudget` + spawn-rate); [`terminal/terminal.service.ts`](../packages/gateway/src/terminal/terminal.service.ts)
  (env scrub + `allowedTools`); [`terminal/approval.service.ts`](../packages/gateway/src/terminal/approval.service.ts)
  (blast-radius path)
- **Edit (gateway, audit/RBAC):** `AuditService` call sites (approvals, repos, projects, guardrails);
  `@RequiresRole` on the safety controllers
- **New (web):** a Settings → Safety page + rules editor + caps + kill switch + live feed under
  [`app/(main)/settings/`](../packages/web/app/(main)/settings/); a board paused banner
- **New (cli):** `guardrails` + `kill` commands in [`cli/src/index.ts`](../packages/cli/src/index.ts)
- **Reuse:** the PreToolUse seam, `AgentRunnerService.stop/cancel`, `role.guard.ts`, `AuditService`, WS broadcast.

---

## Verification

- [ ] **Kill switch:** an emergency stop pauses the system (DB-backed — **survives a gateway restart**), the
      scheduler spawns nothing while paused, in-flight agents are aborted, and the board shows a paused banner;
      resume restores normal scheduling.
- [ ] **Pause scope:** a per-repo (and per-team) pause holds only that scope's tasks; other repos keep flowing.
- [ ] **Spend cap blocks:** with a hard daily/monthly cap set and exceeded, the scheduler **does not spawn**
      (task stays `todo`, "held: over budget" surfaced); under the cap it spawns normally. Soft `warnAtRatio`
      still only warns.
- [ ] **Rate cap blocks:** exceeding `maxSpawnsPerHour` holds further spawns ("held: rate-limited") and recovers
      as the window rolls.
- [ ] **Destructive deny (act path):** a PreToolUse `git push --force` / a write to `main` / an `rm -rf` / a
      `.env` read is **denied before execution** and logged — **even in `autonomous` mode**; a normal edit/commit
      is unaffected. The spawned session env is **scrubbed** of secrets.
- [ ] **Audit completeness:** approval-rule edits, guardrail changes (pause/kill/cap), repo/project mutations,
      and act-path allow/deny decisions all appear in the audit trail with who/what/when; the safety endpoints
      **reject non-admins**.
- [ ] **Panel + CLI:** an admin can set mode, edit rules, set caps, and hit the kill switch from the web panel
      and from `midnite guardrails` / `midnite kill`; the live feed reflects decisions.
- [ ] **Defaults preserve behavior:** with guardrails unset (no caps, not paused, env-scrub opt-out), the system
      behaves exactly as before this phase.
- [ ] `moon run :typecheck` · `moon run :lint` · `moon run :test` green (approvals service tests for pause +
      budget + blast-radius `evaluate`; scheduler tests asserting a paused/over-budget tick spawns nothing;
      env-scrub unit test; audit-coverage tests; web RTL for the Safety page; CLI snapshot).

---

## Decisions / open questions

1. **Fold into `approvals/`, not a new module** *(settled).* The approvals module becomes midnite's single
   **safety domain** — pause/kill, spend/rate caps, destructive rules, and policy mode all live here, surfaced by
   one panel. Avoids a parallel module fighting approvals for the same concerns.
2. **Layered enforcement — scheduler *and* act path** *(settled).* Scheduling-layer gates (pause, budget, rate)
   stop risky/expensive work from **starting**; the act-path gate (blast-radius deny) stops dangerous actions
   **mid-run**. Defense in depth — either layer alone leaves a hole.
3. **Pause/kill is DB-backed, not config** *(recommend).* An emergency stop must not require a config reload or
   restart, and must survive a crash — it lives in the `approval_settings` singleton, read by the scheduler each tick.
4. **Blast-radius denials override policy mode** *(recommend).* Mode can relax *escalation* (autonomous auto-allows
   more), but a hard-denied action (force-push to main, secret read) stays denied in every mode. Protected branches
   + globs are per-repo configurable.
5. **Env scrub is the one behavior-changing spawn edit** *(recommend, opt-out default).* Stripping secrets from the
   agent's env shrinks blast radius, but could surprise a workflow that relied on an inherited var — ship it behind a
   config default that preserves today's env, flip the default to scrubbed once validated.
6. **Hard caps are separate knobs from soft warnings** *(recommend).* Keep the existing `warnAtRatio` soft-warn
   behavior; add distinct `hardDailyCapUsd`/`hardMonthlyCapUsd`/rate limits that *block*. `0` = disabled = today's
   behavior.
7. **Unify decisions into audit** *(recommend).* Act-path allow/deny (today only in `approval_log`) is mirrored/
   cross-linked into `audit_log` so one query answers "what did agents do, and what did we permit?".
8. **Out of scope** *(settled).* OS/container sandboxing of agent processes, network-egress firewalling, and
   anomaly/ML detection are deferred — this phase is policy-and-budget enforcement + operability, not process isolation.
