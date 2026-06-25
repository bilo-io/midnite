# Phase 14 — Workflows, part 2: make them connect

> Phase 6 ([phase-6-workflows-mvp.md](phase-6-workflows-mvp.md)) shipped the workflow builder: a React Flow canvas, a `NodeTypeDefinition` registry in `shared` that drives both the gateway executors and the web palette, a topological `WorkflowEngine` with per-node persistence and run history, three triggers (manual / schedule / signed webhook), and two action nodes (`http.request`, `ai.claude`). Several Phase-6 follow-ups have since landed quietly — `logic.branch` with true/false ports, a `WorkflowsGateway` that already **emits** all six `WorkflowEvent`s over `/ws/workflows`, drag-from-palette, minimap, and the `sonnet4.7` alias fix. **Phase 14 closes the gap between "nodes run" and "nodes work together"** — it picks up where Phase 12 ([phase-12-workflow-expressions.md](phase-12-workflow-expressions.md)) leaves off.

> **What Phase 12 owns vs. what Phase 14 owns.** [Phase 12](phase-12-workflow-expressions.md) makes nodes *pass data to each other* — the `{{expr}}` expression engine, engine-side resolution, reshape/storage nodes, and the n8n-style editor. **Phase 14 makes workflows reach the outside world and run live:** a secure credential vault (Theme B) and real integration executors (Theme C) that template their params off Phase 12's data flow, plus finishing live run streaming (Theme A), CLI parity (Theme D), and editor polish (Theme E). Phase 14 *consumes* templating; it never rebuilds it.

> Status legend: every box starts unchecked. Effort tags: **S** small · **M** medium · **L** large. Themes: **B → C** are the dependent spine (vault before integrations, both consuming Phase 12's data flow); **A** (live streaming), **D** (CLI), **E** (editor) are independent slices — pick one, don't do all of it at once.

> **Boundary reminder (CLAUDE.md).** New node types are **one `NodeTypeDefinition` in `shared` + one `NodeExecutor` in the gateway** — the registry is the contract. Wire shapes (events, credential payloads, run results) live in `shared` with zod schemas; `cli` and `web` stay pure HTTP/WS clients. Credentials reuse the existing `gateway/src/crypto/` `CryptoService` (AES-256-GCM, env key `MIDNITE_SECRET_KEY`) — do not introduce a second crypto path.

---

## Current state (baseline to build on)

- **shared:** node graph types, the `NodeTypeDefinition` registry ([`node-types.ts`](../packages/shared/src/node-types.ts)), the `WorkflowEvent` union ([`events/workflow.ts`](../packages/shared/src/events/workflow.ts), 6 event types), and `WorkflowsConfigSchema` (already carries `encryptionKeyEnv` + `oauth`). `WorkflowNode` already has a `credentialId` field ([`node.ts`](../packages/shared/src/node.ts)) — defined, unused. The Phase 12 expression engine ([`expression.ts`](../packages/shared/src/expression.ts), PR #27) and the `expressionable` field marker already exist — Phase 14 builds on them, never re-implements them.
- **Registered node types (7):** `trigger.manual`, `trigger.schedule`, `trigger.webhook`, `http.request`, `ai.claude`, `logic.branch`.
- **Executors (2):** `HttpRequestExecutor` (SSRF-guarded `fetch`) and `AiClaudeExecutor` (reuses `AnthropicService`) — [`gateway/src/workflows/engine/executors/`](../packages/gateway/src/workflows/engine/executors/).
- **Engine:** topological run with cycle rejection, per-node persistence, short-circuit on failure, `AbortSignal` cancel, branch-port skipping. Emits all 6 `WorkflowEvent`s as it runs ([`workflow-engine.service.ts`](../packages/gateway/src/workflows/engine/workflow-engine.service.ts)).
- **Live updates:** `WorkflowsGateway` (`/ws/workflows`) + `WorkflowEventBus` fan out events server-side **today**. The web hook ([`use-workflow-run.ts`](../packages/web/lib/use-workflow-run.ts)) opens the WS but re-pulls run state over REST on every message — so it's effectively still polling. **Half-wired.**
- **Crypto:** `CryptoService` AES-256-GCM exists and is used for **provider API keys only** ([`crypto/crypto.service.ts`](../packages/gateway/src/crypto/crypto.service.ts), [`agent/provider-credentials.repository.ts`](../packages/gateway/src/agent/provider-credentials.repository.ts)). No workflow-scoped credential store, no OAuth.
- **Editor:** drag-from-palette, minimap, zoom controls, dirty-tracking + manual Save, run-output panel (nodes + logs tabs) all done. No autosave, no run-history replay, no templates.
- **CLI:** task commands only (`add` / `list` / `move` / `serve`). No `workflow` subcommands.

---

## Theme A — Live run streaming — **M** ✅ (PR #72)

> **Data flow / `{{expr}}` templating is Phase 12, not here.** The expression engine ([`expression.ts`](../packages/shared/src/expression.ts)) already shipped — `resolveExpression` / `resolveParams`, a typed `ExpressionError`, and the `expressionable` field marker (PR #27). Wiring it through the engine (resolve-before-execute), the `logic.setData` / reshape / storage nodes, and the editor's ƒx affordance are all [phase-12-workflow-expressions.md](phase-12-workflow-expressions.md) (Themes B–F). **Phase 14 consumes that work** — every integration node in Theme C templates its params off upstream output once Phase 12 lands. Do not rebuild the resolver or re-add a `logic.setData` node.

What's left on the **live-updates** side — which Phase 12 explicitly leaves out of scope (its P7) — is finishing the half-wired WS stream so the run panel updates without re-polling:

- [x] Rework [`use-workflow-run.ts`](../packages/web/lib/use-workflow-run.ts) to **apply `WorkflowEvent`s incrementally** to local run state (start → per-node transitions → finish) instead of re-fetching on every message; keep REST as the initial load + reconnect/backfill path only.
- [x] Run-output panel updates node statuses live from the event stream; polling becomes the explicit fallback when the socket is down.
- [x] Test the event→state reducer in isolation (shared event fixtures) so liveness is verifiable without a browser. *(Reused by the CLI `--watch` in Theme D.)*

---

## Theme B — Credential vault — **M**

A secure home for the secrets that integration nodes need. Gate before Theme C.

### B1. Workflow credential store — **M** ✅ DONE (PR #168)
- [x] `workflow_credentials` table + repository (Drizzle migration 0032): `id`, `name`, `type` (`http-bearer`/`http-basic`/`http-header`/`slack`/`smtp`), encrypted `data` blob, timestamps. Reuses `CryptoService` — encrypt on write, decrypt only for server-side resolve, **fail-closed** when `MIDNITE_SECRET_KEY` is absent (same contract as provider keys, see [phase-7](phase-7-hardening-reports-widgets.md) A1).
- [x] `GET/POST/DELETE /workflow-credentials` (names + types only on read — secret is write-only, **never** returned). Zod schemas in `shared`. `service.resolve(id)` decrypts+validates for executors.
- [x] HTTP node uses `credentialId` references for auth (bearer / basic / header) instead of inline plaintext; the engine resolves the credential server-side at execute time.
- [x] Web: a credentials manager (list / add / delete) under Settings → Credentials and a credential picker in the node config panel.

### B2. OAuth2 start/callback — **M** ✅ DONE (PR #203)
- [x] `GET /oauth/:provider/start` → provider consent redirect; `GET /oauth/:provider/callback` → exchange code, store tokens as a `workflow_credentials` row, handle refresh. Driven by the existing `workflows.oauth` config block.
- [x] Token refresh on expiry, transparent to executors.

---

## Theme C — Integration executors — **M** ✅ DONE (PR #168)

The payoff. Each is **one `NodeTypeDefinition` + one executor**, consuming Phase 12's templated params and Theme B's credentials.

- [x] **`slack.message`** — post a message to a channel via a `slack` credential. **S**
- [x] **`email.send`** — SMTP first (simplest, broadest), Gmail OAuth as a follow-on once B2 lands. **S/M**
- ⏳ deferred — **`google.sheetsAppend`** (deferred to Theme B2 OAuth follow-on)
- [x] Each executor: structured output; `integration-nodes.spec.ts` covers both with mocked fetch/nodemailer.

> Keep this list tight for the first pass — three integrations prove the pattern. Mastodon/Discord/webhook-out/etc. are trivial additions later once A+B+C exist.

---

## Theme D — CLI parity — **S** ✅ (PR #78)

Workflows are API-only from the terminal today. Thin commander commands over the typed client (no business logic — CLAUDE.md).

- [x] `midnite workflow list` — table of workflows (name, enabled, trigger, last run).
- [x] `midnite workflow run <id>` — trigger a manual run; `--watch` tails the run via the WS stream (reuse the Theme A reducer) and renders per-node status.
- [x] `midnite workflow runs <id>` — recent run history for a workflow.

---

## Theme E — Editor polish — **S/M**

Quality-of-life on the canvas; independent of A–D.

- [x] **Autosave** — ✅ shipped earlier (PR #43): debounced save on graph change (`use-autosave.ts`) with a saved/dirty indicator in the toolbar; pauses while a save is in flight or a run is active.
- [x] **Run-history replay** — ✅ DONE (PR #170, 2026-06-24). `RunHistoryPanel` lists past runs and steps through node execution order on the canvas via `applyRunState`; a `History` toolbar button toggles it in place of the config panel; auto-play at 700ms/step + Prev/Next/First/Last scrubbing.
- [x] **Starter templates** — ✅ DONE (PR #138, 2026-06-23 — see [done.md](done.md)). A "Start from" gallery in the New-workflow modal seeds a ready-made graph: three templates (AI page summary, daily API digest, track-latest) built only from shipped node types; a pure `buildTemplateGraph` wires `trigger → steps` and seeds via `createWorkflow` + `updateWorkflow`. (Templates use shipped nodes; the doc's Slack/email examples await Theme C executors.)

---

## Done criteria

- [x] Build `webhook → ai.claude → slack.message` where the Slack text is `{{$node["Claude"].json.text}}`, fire the webhook, and see the AI's answer posted to Slack — proving Phase 12 templating + Theme B credentials + a Theme C integration end-to-end.
- [x] A running workflow updates the web run panel **live** from the WS event stream with no REST re-fetch per event; killing the socket falls back to polling.
- [x] A credential's secret material is never returned over the API; with `MIDNITE_SECRET_KEY` unset, credential writes are rejected and integration nodes are disabled (fail-closed).
- [x] `midnite workflow run <id> --watch` streams per-node status to the terminal.
- [x] Invalid `{{expr}}` references fail the node run with a clear message; `:typecheck` / `:lint` / `:test` green across the graph.

---

## Files this phase touches (map)

- **shared:** new `workflow-credential.ts` schema (+ tests); extend [`node-types.ts`](../packages/shared/src/node-types.ts) with the new integration node types; typed client functions for credentials/oauth/workflow-run. (The `{{expr}}` resolver and `expressionable` markers ship in Phase 12 — not re-added here.)
- **gateway:** `workflow_credentials` migration + repository; `WorkflowCredentialsModule` (controller/service); `OAuthController`; new executors under [`workflows/engine/executors/`](../packages/gateway/src/workflows/engine/executors/); template resolution in [`workflow-engine.service.ts`](../packages/gateway/src/workflows/engine/workflow-engine.service.ts); reuse [`crypto/`](../packages/gateway/src/crypto/).
- **web:** rework [`use-workflow-run.ts`](../packages/web/lib/use-workflow-run.ts) into an event reducer; credentials manager + picker; config-panel templating affordances; autosave/replay/templates in the editor.
- **cli:** new `cli/src/commands/workflow.ts` (list/run/runs).
- **Docs:** update [`CLAUDE.md`](../CLAUDE.md) (workflow nodes/credentials), README config docs for `workflows.oauth`/credentials; append to [`done.md`](done.md) as slices land.

---

## Decisions (to confirm in the first PR)

1. **Shipping order** — Phase 12 (data flow) lands first; then within Phase 14 **B (vault) → C (integrations)**, with **A (live streaming) / D (CLI) / E (editor)** sliceable in parallel. Each is independently shippable.
2. **Expression syntax** — ✅ settled in Phase 12: a hand-rolled `{{ }}` resolver over a typed context (`$json` / `$node` by label / `$env`), **no `eval`** ([`expression.ts`](../packages/shared/src/expression.ts)). Phase 14 just uses it.
3. **First integrations** — Slack + Email(SMTP) + Google Sheets. Confirm this trio vs. swapping one (e.g. Discord/webhook-out) for the first pass.
4. **Email transport** — SMTP first (no OAuth dependency), Gmail OAuth as a follow-on once B2 lands. Confirm.
5. **OAuth scope** — build the generic start/callback in B2, or defer OAuth entirely to a later phase and ship C on API-key/SMTP credentials only? (Affects whether Google Sheets makes the first cut.)
