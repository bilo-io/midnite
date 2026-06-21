# Phase 23 — Approvals & autonomy policy

> midnite's premise is running **many agents in parallel** and walking away — but every time an agent hits a tool it needs permission for, it **blocks on a human**, and you only see that prompt if you happen to be watching that session's terminal. Today the flow is: an in-PTY **PreToolUse hook** (a blocking HTTP call authenticated by a per-session secret) hits [`ApprovalService.requestDecision()`](../packages/gateway/src/terminal/approval.service.ts), which broadcasts an `approval-request` over the **per-session terminal WS** and waits for a viewer to answer `allow / allow-session / deny` ([`approval.controller.ts`](../packages/gateway/src/terminal/approval.controller.ts) `POST /hooks/sessions/:sessionId/pre-tool-use`). The **only** autonomy primitive is `allow-session` — it adds a tool to an **in-memory, per-session** `allowList` that evaporates when the session ends. There's no cross-session view, no durable policy, and no record of what was decided. **Phase 23 turns tool approvals from a per-terminal interruption into a managed trust layer:** a policy engine that auto-decides the safe cases, a single inbox for everything still needing you, an audit log of every decision, and autonomy modes that set how much midnite acts on its own. It's the natural successor to alerting ([Phase 21](phase-21-notifications.md)) and visibility ([Phase 22](phase-22-fleet-visibility.md)) — once you can *see* the fleet, you can *trust it to run unattended*.

> **Scope guardrails (CLAUDE.md).** This is the **approvals/terminal domain** (gateway). The policy engine extends the existing `requestDecision` allow-list check — it does **not** fork a parallel decision path. New wire shapes (the rule schema, autonomy mode, pending-approval + audit payloads, the inbox WS event) live in [`@midnite/shared`](../packages/shared/src/) with zod schemas; `cli`/`web` stay pure clients. Rules + the audit log are **DB-backed** via a new repository (Drizzle only) behind a service — forward-only migration, no triggers/cross-domain FKs. The approval vocabulary stays `allow / allow-session / deny` ↔ Claude's `allow / deny / ask` (mapped in `ApprovalService`); **fail-safe is sacred** — the policy may only *add* auto-decisions; the no-subscriber and timeout safeties ([`config.terminal.approvals`](../packages/shared/src/config.ts)) are never weakened. `shared` is the contract.

> Effort tags: **S** small · **M** medium · **L** large. **Theme A is the substrate** (the engine everything keys off); **B/C/D** layer on and are independently shippable. The phase is the **balanced full loop** (Decision §3): engine + inbox + audit + modes. Every box starts unchecked — this is net-new work.

---

## Current state (baseline to build on)

- **the bridge (built):** [`approval.service.ts`](../packages/gateway/src/terminal/approval.service.ts) holds the blocked hook HTTP request (`pending` map), broadcasts a `TerminalApprovalRequestMessage` over the session WS, and resolves on a viewer's `approval-response` or on timeout/abort. `summarizeToolCall` ([`lib/summarize-tool-call.ts`](../packages/gateway/src/terminal/lib/summarize-tool-call.ts)) produces the human summary.
- **the only autonomy primitive:** `allow-session` adds a tool to `this.allowList` (a `Map<sessionId, Set<toolName>>`, [`approval.service.ts:39`](../packages/gateway/src/terminal/approval.service.ts)) — checked at the top of `requestDecision` (line 73). **In-memory, per-session, name-only, cleared on session end.**
- **config (thin):** [`config.terminal.approvals`](../packages/shared/src/config.ts) = `{ enabled, timeoutMs (120s), onTimeout: 'deny'|'ask', onNoSubscriber: 'deny'|'ask' }`. No rules, no modes.
- **wire vocabulary:** `ApprovalDecisionSchema = ['allow','allow-session','deny']`, `ApprovalResolutionSchema`, `approval-request` / `approval-response` / `approval-resolved` messages all in [`events/terminal.ts`](../packages/shared/src/events/terminal.ts). The PreToolUse hook request/decision shapes live in `shared` and carry `tool_name` + `tool_input` + `cwd`.
- **surfacing (per-session only):** approvals ride the terminal WS ([`terminal.gateway.ts`](../packages/gateway/src/terminal/terminal.gateway.ts)) and render as an overlay in the live terminal ([`session-terminal-impl.tsx`](../packages/web/components/session-terminal-impl.tsx) / [`live-terminal.tsx`](../packages/web/components/live-terminal.tsx) / [`use-terminal-socket.ts`](../packages/web/hooks/use-terminal-socket.ts)); `replayPending` re-sends on reconnect. **There is no cross-session view.**
- **no persistence:** decisions (incl. timeouts and `allow-session`) are never recorded anywhere durable.

> **Honest constraint that shapes the design.** A pending approval *is* an in-memory blocking HTTP call bounded by `timeoutMs` (default 120s). So the **inbox is a live cross-session view + a countdown**, not a durable work queue — you answer before it auto-resolves. The durable artifact is the **audit log** (Theme C), not the pending set.

---

## Theme A — Policy engine (gateway) — **M**

The substrate: decide the safe cases automatically, escalate the rest. Extend the existing allow-list check into a real evaluation step.

### A1. Rule model + storage — **S–M**
- [ ] An `ApprovalRule` shape in [`@midnite/shared`](../packages/shared/src/) (`approval-rule.ts`): `{ id, enabled, effect: 'allow' | 'deny', toolName (or '*'), match?: { commandPrefix?: string[], pathGlob?: string[] }, scope: 'global', note? }`. zod + tests. (Per-repo scope is **deferred** — Decision §5.)
- [ ] **DB-backed** `approval_rules` table (forward-only migration, next after [`0029`](../packages/gateway/drizzle/)) + a `ApprovalRulesRepository` (Drizzle only). **Seeded** on first boot from `config.terminal.approvals` defaults; thereafter the **DB is authoritative** (the [Phase 13](phase-13-repos-first-class.md) "config seeds, DB owns" pattern). `GET/POST/PATCH/DELETE /approvals/rules` — thin controller, validate against the shared schema.

### A2. Evaluation step in `requestDecision` — **M**
- [ ] Before broadcasting to humans, evaluate the rules against `tool_name` + `tool_input` → `auto-allow | auto-deny | escalate`. Replaces/wraps the current per-session `allowList` short-circuit (which stays as the runtime `allow-session` cache layered on top of persisted rules).
- [ ] **Conservative input matching** (Decision §2): `pathGlob` for `Write`/`Edit`/`Read` targets, a `commandPrefix` allow-list for `Bash` (e.g. `git status`, `ls`, `pnpm test`). **Never auto-`allow` a risky tool on a fuzzy match** — an unmatched or ambiguous `Bash`/destructive call **escalates to a human**; auto-`deny` is allowed for explicit deny rules. Pattern matching is advisory for *allow*, authoritative for *escalate*.
- [ ] **Fail-safe preserved:** the engine only *adds* auto-decisions. `onNoSubscriber` / `onTimeout` / abort semantics are unchanged; a pending escalation with no viewer still falls back per config.

### A3. Mode gate — **S**
- [ ] The engine respects the active **autonomy mode** (Theme D): `manual` bypasses all auto-`allow` rules (everything escalates as today); `guarded`/`autonomous` apply rules. Mode is read at evaluation time.

---

## Theme B — Cross-session approvals inbox (gateway + web) — **M**

One place to triage everything still needing you, across all running agents.

- [ ] **`ApprovalService.listPending()`** — expose the in-memory pending set (session/task id, tool, summary, cwd, requested-at, timeout deadline) without leaking the held HTTP resolver.
- [ ] **Surfacing** (Decision §4): a dedicated **approvals WS event** (a small `ApprovalsGateway`, or a `pending-approvals` member reusing `/ws/tasks`) so the inbox updates live as requests arrive/resolve; `GET /approvals/pending` for the initial load. Keep the per-session terminal overlay working unchanged.
- [ ] **Web inbox** — a queue surface in the app chrome (sibling to the [Phase 21](phase-21-notifications.md) notification center, but for *blocking* requests): list each pending request with task/tool/summary/cwd and a **live countdown** to its timeout; answer inline (`allow` / `allow-session` / `deny`) → reuses the existing `resolveByUser` path.
- [ ] **"Make a rule from this"** — from a pending request, one click to create an `approval_rule` (e.g. "always allow `Read`", "always allow `Bash` starting `git status`") → Theme A. The bridge between answering once and never being asked again.

---

## Theme C — Approval audit log (gateway + web) — **S–M**

The durable trust record — especially for what was decided *without* you.

- [ ] A `approval_log` table (forward-only migration) + repository: one row per resolution — `{ id, session_id, task_id?, tool_name, summary, resolution (allow|deny|allow-session|auto-allow|auto-deny|timeout|expired), rule_id?, decided_by ('user'|'policy'|'timeout'|'system'), created_at }`. Written from `settle()` in [`approval.service.ts`](../packages/gateway/src/terminal/approval.service.ts) (and on every auto-decision).
- [ ] `GET /approvals/log?from=&to=&taskId=` (paged) + zod shape in `shared`.
- [ ] **Web history view** — a readable log ("what did I auto-approve?"); link each entry to its task/session and the rule that fired. Could surface on the [Phase 22](phase-22-fleet-visibility.md) `/ops` page or its own; reuses the export seam later ([Phase 18](phase-18-reports-exports.md)).

---

## Theme D — Autonomy modes & settings (shared + gateway + web) — **S–M**

A single high-level knob over the policy, plus the management UI.

- [ ] **Mode** in [`@midnite/shared`](../packages/shared/src/) + `config.terminal.approvals.mode` (default `manual` — **no behaviour change** for existing users until they opt in): `manual` (ask everything, today's behaviour) · `guarded` (auto-approve the safe-default tool set, ask the rest) · `autonomous` (rules decide; escalate only genuinely-risky/unmatched). Modes are **presets that seed/sit over** the Theme-A rules, not a separate engine.
- [ ] A small **config-write path** for the mode (mirror whatever settings-write mechanism exists; keep it thin + `loadConfig()`-respecting).
- [ ] **Settings panel** — pick the mode, CRUD rules (Theme A), and view the audit log (Theme C). Make the **safe-default tool set** visible and explained (Decision §6).

---

## Out of scope (named, not built here)

- **Per-repo / per-project rule scoping** — rules are **global** this phase; per-repo scoping ties into [Phase 13](phase-13-repos-first-class.md) and is the natural follow-on (Decision §5).
- **Weakening the existing safeties** — the no-subscriber fallback, the timeout, and the per-session secret are untouched; the policy only adds auto-decisions on top.
- **Approvals for non-`claude` PTYs** — the hook is `command: "claude"`-specific; ad-hoc shells and other backends are unchanged.
- **Notifying on a pending approval via external channels** (Slack/webhook) — a [Phase 21](phase-21-notifications.md) synergy (a `→waiting on approval` is exactly a notify-worthy moment); the in-app inbox is here, external dispatch is P21's job.
- **A full RBAC / multi-user approver model** — single-install, single approver; team approval routing is out.
- **Learning/auto-suggesting rules from history** — the audit log is a record this phase, not a training signal.

---

## Files this phase touches (map)

- **shared:** new [`approval-rule.ts`](../packages/shared/src/) (`ApprovalRule` + create/update requests) and an `ApprovalLogEntry` + `PendingApproval` (inbox) shape; an `autonomyMode` + `mode` field on [`config.terminal.approvals`](../packages/shared/src/config.ts); a `pending-approvals` WS event member (reuse or new). Barrels + tests; typed clients for rules/log/pending.
- **gateway:** extend [`approval.service.ts`](../packages/gateway/src/terminal/approval.service.ts) with the evaluation step + `listPending()` + audit writes; new `ApprovalRulesRepository` + `ApprovalLogRepository` (+ migration after [`0029`](../packages/gateway/drizzle/)); rule/log/pending routes on [`approval.controller.ts`](../packages/gateway/src/terminal/approval.controller.ts) (or a sibling controller); the inbox WS via [`terminal.gateway.ts`](../packages/gateway/src/terminal/terminal.gateway.ts) or a small new gateway; seed-from-config on boot. The hook entry ([`POST /hooks/sessions/:sessionId/pre-tool-use`](../packages/gateway/src/terminal/approval.controller.ts)) is unchanged.
- **web:** an **approvals inbox** in the app chrome (countdown + inline answer + "make a rule"); a **Settings > Approvals** panel (mode + rules CRUD + audit log); the existing per-session terminal overlay stays as-is; client calls in [`lib/api.ts`](../packages/web/lib/api.ts).
- **Docs:** update [`CLAUDE.md`](../CLAUDE.md) (approval policy engine + autonomy modes) + README (`config.terminal.approvals.mode`, the safe-default set); append to [`done.md`](done.md) as slices land.

---

## Verification

- [ ] In `manual` mode, behaviour is unchanged: a tool prompt appears on the watched terminal and (now) in the inbox; answering `allow`/`deny`/`allow-session` works exactly as before.
- [ ] In `guarded` mode, a safe tool (`Read`/`Grep`) is **auto-allowed** without a prompt and recorded in the audit log as `auto-allow`; a `Bash rm -rf …` (unmatched/risky) still **escalates** to a human.
- [ ] A `commandPrefix` rule (`git status`) auto-allows that command but **not** an arbitrary `Bash`; a `pathGlob` deny rule auto-denies writes outside the repo and logs `auto-deny`.
- [ ] The **inbox** shows pending approvals from **multiple sessions at once**, each with a live countdown; answering one resolves the blocked agent without opening its terminal; "make a rule from this" creates a persisted rule that prevents the next prompt.
- [ ] Rules persist across a gateway restart (DB-backed); a fresh DB **seeds** rules from `config.terminal.approvals`; thereafter the DB is authoritative.
- [ ] The **audit log** records user decisions, auto-decisions (with the rule id), timeouts, and session-end expirations; `GET /approvals/log` pages them; the web history view links to the task/rule.
- [ ] Fail-safe holds: with no viewer connected and no matching auto-`allow` rule, the configured `onNoSubscriber` fallback still applies; a timeout still resolves per `onTimeout`.
- [ ] `moon run :typecheck` · `moon run :lint` · `moon run :test` green across the graph; `moon ci` green. (Run web tests from the **primary checkout**, not a `.git` worktree.)

---

## Decisions / open questions

1. **Rule storage** *(settled in brainstorm).* **DB-backed `approval_rules`**, CRUD'd in the UI, **seeded from `config.terminal.approvals`** on first boot; DB authoritative thereafter (the Phase 13 pattern). Adds a migration + CRUD; most flexible.
2. **Match granularity** *(settled in brainstorm).* **Tool name + conservative input patterns** — `pathGlob` for file tools, `commandPrefix` allow-list for `Bash`. Never auto-`allow` a risky tool on a fuzzy match; unmatched/ambiguous **escalates**. Patterns are advisory for allow, authoritative for escalate.
3. **Phase scope** *(settled in brainstorm).* The **full loop** — engine + cross-session inbox + audit log + autonomy-mode presets — at a focused depth.
4. **Inbox WS channel** *(open).* A dedicated `ApprovalsGateway` (clean separation) vs a `pending-approvals` member on the existing `/ws/tasks` fan-out (fewer sockets). Recommend the lighter reuse unless it muddies the tasks channel; settle in the B PR.
5. **Rule scope** *(deferred).* Rules are **global** this phase; **per-repo scoping** is the follow-on once [Phase 13](phase-13-repos-first-class.md) repos are first-class.
6. **Safe-default tool set** *(open).* The exact tools auto-allowed in `guarded` mode (candidates: `Read`, `Grep`, `Glob`, `LS`, read-only `Bash` prefixes). Pick the conservative concrete set in the A/D PR and make it visible in settings.
7. **Mode default** *(recommend: `manual`).* Ship `manual` as the default so existing installs see **no behaviour change**; opting into `guarded`/`autonomous` is explicit.
