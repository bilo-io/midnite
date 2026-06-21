# Phase 6 — Workflows (node-based automation builder)

> A visual, n8n/Make-style workflow builder. A workflow is a directed graph of nodes wired by edges; it starts at a **trigger** (manual Play, cron schedule, or signed webhook) and flows data through **action nodes** (HTTP, AI/Claude). Every run is persisted and shown in run history. The MVP polls run state; live WebSocket streaming, the credential vault + OAuth, Slack/Google/Email executors, and logic nodes are the named follow-ups. A **node-type registry** in `shared` drives both the gateway executors and the web palette/config forms — adding an integration is one definition + one executor.

## shared (`packages/shared/src`)

- [x] `node.ts` — `WorkflowNode` (generic `params`), `WorkflowEdge`, `WorkflowGraph`
- [x] `node-types.ts` — `NodeTypeDefinition` registry + per-type param schemas; MVP types: `trigger.manual/schedule/webhook`, `http.request`, `ai.claude`
- [x] `trigger.ts` — `Trigger` discriminated union (manual / schedule{cron,tz} / webhook{method,hasSecret})
- [x] `run.ts` — `WorkflowRun`, `NodeRun`, status enums, run request/response
- [x] `workflow.ts` — `Workflow`, `WorkflowSummary`, create/update requests, webhook-info response
- [x] `events/workflow.ts` — `WorkflowEvent` union (defined for the WS phase; not emitted in the MVP)
- [x] `config.ts` — `WorkflowsConfigSchema` (`enabled`, `defaultTimezone`, `schedulerTickMs`, `webhookBaseUrl`, `encryptionKeyEnv`, `oauth`), defaulted onto `MidniteConfigSchema`
- [x] Barrel exports + registry/param-validation tests

## gateway (`packages/gateway/src/workflows`)

- [x] Drizzle tables `workflows`, `workflow_runs`, `node_runs` (+ migration `0003_workflows`)
- [x] `WorkflowsModule` → controller / service / repository
  - [x] `GET/POST /workflows`, `GET/PATCH/DELETE /workflows/:id`
  - [x] `POST /workflows/:id/run`, `GET /workflows/:id/runs`, `GET /workflows/:id/runs/:runId`
  - [x] `POST /workflows/:id/webhook/rotate`
- [x] `WorkflowEngine` — topological run (cycle rejection), per-node persistence, short-circuit on failure, `AbortSignal` cancel, background execution (poll-friendly)
- [x] `ExecutorRegistry` + `NodeExecutor` strategy; `http.request` (SSRF-guarded `fetch`) and `ai.claude` (reuses `AnthropicService`) executors
- [x] Scheduler: single `WorkflowScheduler` tick loop (croner `nextRun`, `last_fired_at` durability, gated on `workflows.enabled`)
- [x] Webhook receiver `POST /hooks/workflows/:id/:token` (hashed secret, constant-time compare)
- [x] Tests: graph algorithms, engine success/failure/validation, service create/update-sync/webhook (`:memory:` SQLite)

## web (`packages/web`)

- [x] Deps: `@xyflow/react`, `zustand`; `lib/api.ts` workflow client functions
- [x] Routes: `/workflows` (list) and `/workflows/[id]` (full-bleed editor); nav entry
- [x] React Flow canvas (dynamic `ssr:false`), custom node view, palette, config panel (generic field forms + trigger config + cron preview + webhook URL), toolbar (name / enable / **Play** / Save), run-output panel
- [x] Zustand editor store (scoped to the route); `use-workflow-run` polling hook; React Flow theming via design tokens + `--node-*` hues

## Done criteria

- [x] Create a workflow, build `manual → http.request`, press **Run**, see a persisted run with per-node status + output
- [x] `ai.claude` node runs a Claude completion (verified with `haiku4.5`)
- [x] Schedule + webhook triggers wired end-to-end (webhook fires a run from an external POST with the body as trigger output; bad token → 404)
- [x] Invalid node params → 400; `:typecheck` / `:test` green across the graph

## Follow-ups (next phases)

- [ ] P7 — Live run streaming over the first `WebSocketGateway` (emit `WorkflowEvent`s; swap polling for a WS subscription) → **moved to [Phase 14](phase-14-workflows-connect.md)**
- [x] P8 — Logic nodes (`logic.branch` true/false ports, `logic.setData`/`logic.merge`) + `{{expr}}` templating — **closed by [Phase 12](phase-12-workflow-expressions.md)** (expression engine + reshape nodes; PRs #27/#33/#34)
- [ ] P9 — Credential vault (AES-256-GCM, `encryptionKeyEnv`) + OAuth2 start/callback; HTTP node moves to credential references → **moved to [Phase 14](phase-14-workflows-connect.md)**
- [ ] P10 — Integration executors: Slack, Google Docs/Sheets, Email (SMTP → Gmail OAuth) → **moved to [Phase 14](phase-14-workflows-connect.md)**
- [ ] P11 — Polish: ✅ drag-from-palette · ✅ minimap/zoom · ✅ **autosave (PR #43)** · **remaining:** run-history replay, templates; CLI `workflow` commands → [Phase 14](phase-14-workflows-connect.md) (CLI parity)
- [x] Map the default `ai.claude` model alias to a model the deployment's credential can access — the node now defaults to the canonical **`sonnet4.6`** (in the adapter's supported list) instead of the retired `sonnet4.7`, which 404'd. The legacy `sonnet4.7`/`opus4.7` aliases stay resolving for old configs. (PR #46)
