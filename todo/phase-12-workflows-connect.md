# Phase 12 — Workflows, part 2: make them connect

> Phase 6 ([phase-6-workflows-mvp.md](phase-6-workflows-mvp.md)) shipped the workflow builder: a React Flow canvas, a `NodeTypeDefinition` registry in `shared` that drives both the gateway executors and the web palette, a topological `WorkflowEngine` with per-node persistence and run history, three triggers (manual / schedule / signed webhook), and two action nodes (`http.request`, `ai.claude`). Several Phase-6 follow-ups have since landed quietly — `logic.branch` with true/false ports, a `WorkflowsGateway` that already **emits** all six `WorkflowEvent`s over `/ws/workflows`, drag-from-palette, minimap, and the `sonnet4.7` alias fix. **Phase 12 closes the gap between "nodes run" and "nodes work together."**

> The keystone: **nodes can't reference each other's output yet.** There is no `{{expr}}` templating, so a multi-node workflow today is really a set of isolated nodes that each run with static params. That single gap blocks the value of every integration — an HTTP node can't post the AI node's answer, an email node can't include the HTTP node's response. Phase 12 fixes data flow first (Theme A), then builds the secure-credential and integration layers that depend on it (B, C), then brings the CLI and editor up to parity (D, E).

> Status legend: every box starts unchecked. Effort tags: **S** small · **M** medium · **L** large. Themes are ordered by dependency (A → B → C; D and E are independent slices) — pick a slice (see "Recommended slice"), don't do all of it at once.

> **Boundary reminder (CLAUDE.md).** New node types are **one `NodeTypeDefinition` in `shared` + one `NodeExecutor` in the gateway** — the registry is the contract. Wire shapes (events, credential payloads, run results) live in `shared` with zod schemas; `cli` and `web` stay pure HTTP/WS clients. Credentials reuse the existing `gateway/src/crypto/` `CryptoService` (AES-256-GCM, env key `MIDNITE_SECRET_KEY`) — do not introduce a second crypto path.

---

## Current state (baseline to build on)

- **shared:** node graph types, the `NodeTypeDefinition` registry ([`node-types.ts`](../packages/shared/src/node-types.ts)), the `WorkflowEvent` union ([`events/workflow.ts`](../packages/shared/src/events/workflow.ts), 6 event types), and `WorkflowsConfigSchema` (already carries `encryptionKeyEnv` + `oauth`). `WorkflowNode` already has a `credentialId` field ([`node.ts`](../packages/shared/src/node.ts)) — defined, unused.
- **Registered node types (7):** `trigger.manual`, `trigger.schedule`, `trigger.webhook`, `http.request`, `ai.claude`, `logic.branch`.
- **Executors (2):** `HttpRequestExecutor` (SSRF-guarded `fetch`) and `AiClaudeExecutor` (reuses `AnthropicService`) — [`gateway/src/workflows/engine/executors/`](../packages/gateway/src/workflows/engine/executors/).
- **Engine:** topological run with cycle rejection, per-node persistence, short-circuit on failure, `AbortSignal` cancel, branch-port skipping. Emits all 6 `WorkflowEvent`s as it runs ([`workflow-engine.service.ts`](../packages/gateway/src/workflows/engine/workflow-engine.service.ts)).
- **Live updates:** `WorkflowsGateway` (`/ws/workflows`) + `WorkflowEventBus` fan out events server-side **today**. The web hook ([`use-workflow-run.ts`](../packages/web/lib/use-workflow-run.ts)) opens the WS but re-pulls run state over REST on every message — so it's effectively still polling. **Half-wired.**
- **Crypto:** `CryptoService` AES-256-GCM exists and is used for **provider API keys only** ([`crypto/crypto.service.ts`](../packages/gateway/src/crypto/crypto.service.ts), [`agent/provider-credentials.repository.ts`](../packages/gateway/src/agent/provider-credentials.repository.ts)). No workflow-scoped credential store, no OAuth.
- **Editor:** drag-from-palette, minimap, zoom controls, dirty-tracking + manual Save, run-output panel (nodes + logs tabs) all done. No autosave, no run-history replay, no templates.
- **CLI:** task commands only (`add` / `list` / `move` / `serve`). No `workflow` subcommands.

---

## Theme A — Data flow (the keystone) — **L**

Make nodes pass data to each other. Until this lands, every other theme is half-useful.

### A1. `{{expr}}` templating in node params — **M**
- [ ] A safe expression resolver in `shared` (`lib/template.ts`): `{{ nodes.<id>.output.foo }}`, `{{ trigger.body.x }}`, `{{ env.X }}` — string interpolation over a per-run context, **no arbitrary JS eval** (dot-path + a small whitelist of helpers only).
- [ ] Engine builds a run-scoped context object (trigger output + each completed node's output keyed by node id) and resolves templated params **per node, just before execute** — [`workflow-engine.service.ts`](../packages/gateway/src/workflows/engine/workflow-engine.service.ts).
- [ ] `NodeTypeDefinition` params gain a `templatable` marker so the web config panel shows which fields accept `{{…}}` (and offers an upstream-output picker).
- [ ] `ai.claude` executor stops hard-coding "append JSON of inputs" and instead templates its prompt; `http.request` URL/headers/body become templatable.
- [ ] Unresolved/invalid references → a clear node-run failure (not a silent empty string), surfaced in the run-output panel.

### A2. `logic.setData` node — **S**
- [ ] A node type + executor that emits a static/templated object as its output, for shaping/renaming data mid-graph. Pairs with A1 templating.

### A3. Finish live run streaming — **M**
- [ ] Rework [`use-workflow-run.ts`](../packages/web/lib/use-workflow-run.ts) to **apply `WorkflowEvent`s incrementally** to local run state (start → per-node transitions → finish) instead of re-fetching on every message; keep REST as the initial load + reconnect/backfill path only.
- [ ] Run-output panel updates node statuses live from the event stream; polling becomes the explicit fallback when the socket is down.
- [ ] Test the event→state reducer in isolation (shared event fixtures) so liveness is verifiable without a browser.

---

## Theme B — Credential vault — **M**

A secure home for the secrets that integration nodes need. Gate before Theme C.

### B1. Workflow credential store — **M**
- [ ] `workflow_credentials` table + repository (Drizzle migration): `id`, `name`, `type` (e.g. `slack`, `smtp`, `google-oauth`, `http-bearer`), encrypted `data` blob, timestamps. Reuse `CryptoService` — encrypt on write, decrypt on read, **fail-closed** when `MIDNITE_SECRET_KEY` is absent (same contract as provider keys, see [phase-7](phase-7-hardening-reports-widgets.md) A1).
- [ ] `GET/POST/DELETE /workflow-credentials` (names + types only on read — **never** return secret material to the client). Zod schemas in `shared`.
- [ ] HTTP node uses `credentialId` references for auth (bearer / basic / header) instead of inline plaintext; the engine resolves the credential server-side at execute time.
- [ ] Web: a credentials manager (list / add / delete) and a credential picker in the node config panel.

### B2. OAuth2 start/callback — **M**
- [ ] `GET /oauth/:provider/start` → provider consent redirect; `GET /oauth/:provider/callback` → exchange code, store tokens as a `workflow_credentials` row, handle refresh. Driven by the existing `workflows.oauth` config block.
- [ ] Token refresh on expiry, transparent to executors.

---

## Theme C — Integration executors — **M**

The payoff. Each is **one `NodeTypeDefinition` + one executor**, consuming Theme A (templated params) and Theme B (credentials).

- [ ] **`slack.message`** — post a message to a channel via a `slack` credential. **S**
- [ ] **`email.send`** — SMTP first (simplest, broadest), Gmail OAuth as a follow-on once B2 lands. **S/M**
- [ ] **`google.sheetsAppend`** — append a row to a sheet via a `google-oauth` credential. **M**
- [ ] Each executor: SSRF/scope guards as appropriate, structured output (so downstream nodes can template off it), and a `:memory:`-SQLite engine test with the network mocked.

> Keep this list tight for the first pass — three integrations prove the pattern. Mastodon/Discord/webhook-out/etc. are trivial additions later once A+B+C exist.

---

## Theme D — CLI parity — **S**

Workflows are API-only from the terminal today. Thin commander commands over the typed client (no business logic — CLAUDE.md).

- [ ] `midnite workflow list` — table of workflows (name, enabled, trigger, last run).
- [ ] `midnite workflow run <id>` — trigger a manual run; `--watch` tails the run via the WS stream (reuse the Theme A reducer) and renders per-node status.
- [ ] `midnite workflow runs <id>` — recent run history for a workflow.

---

## Theme E — Editor polish — **S/M**

Quality-of-life on the canvas; independent of A–D.

- [ ] **Autosave** — debounced save on graph change, replacing/augmenting the manual Save button; clear saved/dirty indicator.
- [ ] **Run-history replay** — select a past run and step/play through its node transitions on the canvas (the Theme A event reducer replayed over a stored run).
- [ ] **Starter templates** — a small gallery ("AI summarize a webhook → Slack", "scheduled HTTP check → email on failure") that seed a new workflow graph.

---

## Done criteria

- [ ] Build `webhook → ai.claude → slack.message` where the Slack text is `{{ nodes.<aiId>.output.text }}`, fire the webhook, and see the AI's answer posted to Slack — proving templating (A) + credentials (B) + an integration (C) end-to-end.
- [ ] A running workflow updates the web run panel **live** from the WS event stream with no REST re-fetch per event; killing the socket falls back to polling.
- [ ] A credential's secret material is never returned over the API; with `MIDNITE_SECRET_KEY` unset, credential writes are rejected and integration nodes are disabled (fail-closed).
- [ ] `midnite workflow run <id> --watch` streams per-node status to the terminal.
- [ ] Invalid `{{expr}}` references fail the node run with a clear message; `:typecheck` / `:lint` / `:test` green across the graph.

---

## Files this phase touches (map)

- **shared:** new `shared/src/lib/template.ts` + tests; extend [`node-types.ts`](../packages/shared/src/node-types.ts) (new types, `templatable` markers); new `workflow-credential.ts` schema; typed client functions for credentials/oauth/workflow-run.
- **gateway:** `workflow_credentials` migration + repository; `WorkflowCredentialsModule` (controller/service); `OAuthController`; new executors under [`workflows/engine/executors/`](../packages/gateway/src/workflows/engine/executors/); template resolution in [`workflow-engine.service.ts`](../packages/gateway/src/workflows/engine/workflow-engine.service.ts); reuse [`crypto/`](../packages/gateway/src/crypto/).
- **web:** rework [`use-workflow-run.ts`](../packages/web/lib/use-workflow-run.ts) into an event reducer; credentials manager + picker; config-panel templating affordances; autosave/replay/templates in the editor.
- **cli:** new `cli/src/commands/workflow.ts` (list/run/runs).
- **Docs:** update [`CLAUDE.md`](../CLAUDE.md) (workflow nodes/credentials), README config docs for `workflows.oauth`/credentials; append to [`done.md`](done.md) as slices land.

---

## Decisions (to confirm in the first PR)

1. **Shipping order** — recommended **A (data flow) → B (vault) → C (integrations) → D (CLI) / E (editor)**, A first because everything downstream depends on templating. Each is independently shippable.
2. **Expression syntax** — `{{ dot.path }}` over a per-run context with a small helper whitelist, **no `eval`**. Confirm whether to adopt a tiny existing lib or hand-roll the resolver (lean hand-roll for the security surface).
3. **First integrations** — Slack + Email(SMTP) + Google Sheets. Confirm this trio vs. swapping one (e.g. Discord/webhook-out) for the first pass.
4. **Email transport** — SMTP first (no OAuth dependency), Gmail OAuth as a follow-on once B2 lands. Confirm.
5. **OAuth scope** — build the generic start/callback in B2, or defer OAuth entirely to a later phase and ship C on API-key/SMTP credentials only? (Affects whether Google Sheets makes the first cut.)
