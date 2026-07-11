# Phase 62 — Fable-Digest (retrospectives & fleet digests, workflow-first)

> When agents work unattended, the story of *what happened* evaporates — a done task is a PR link,
> an abandoned one a failure row, and the narrative in between lives only in a transcript nobody
> rereads. Phase 62 turns the fleet's activity into **signal**: a **retrospective per task** (what
> the agent did, what tripped it up, how long it took) and a **periodic fleet digest** (shipped /
> failed / needs-attention / spend, with per-repo/project sections) delivered in-app, to Slack, and
> as markdown. The grounding says the raw material is all there: transcripts persist as JSONL
> (readable post-completion via [`sessions.reader.ts`](../packages/gateway/src/sessions/sessions.reader.ts)),
> `task_events`/`agent_run_stats`/`task_failures`/`ai_review`/check-runs are DB-backed, and a
> **`daily-digest.seed.ts` workflow template already exists** (cron → list-tasks → ai.claude →
> slack.message). The architecture is **workflow-first** (Decision §1): the **workflow engine
> orchestrates** retro + digest generation — new trigger + nodes + seeded pipeline templates —
> while the gateway provides **primitives and storage**. midnite automates its own reporting with
> its own automation product. Fable series #3: **Analyze → Observe → Digest**.

> **Scope guardrails (CLAUDE.md).** **Orchestration lives in workflows; logic lives in services.**
> Node executors ([`workflows/engine/executors/`](../packages/gateway/src/workflows/engine/executors/))
> stay thin — they call gateway services (`RetroBuilder`, `DigestBuilder`) that own the real work,
> exactly like the existing breakdown/classifier pattern. New wire shapes (`TaskRetro`, `Digest`,
> the task-event trigger, node schemas) are **zod in [`shared`](../packages/shared/src/)**.
> Storage is first-class (`task_retros`, `digests` tables, forward-only migrations) — **product
> data, never pruned** by P61 retention. LLM cost follows the house stance: the retro **skeleton is
> deterministic and free** (always generated, service-side); narrative + digest headline are **one
> small plan-model `generateStructured` call each**, budget-capped (P50), usage-tagged (`retro` /
> `digest` features), **fail-soft to the deterministic output**. Transcript access is **bounded**
> (a slicing helper — never feed a whole JSONL to a model). Delivery reuses P21 notifications +
> P44 webhooks + the P18 export framework — no new channels (email stays out of scope). The
> task-event trigger rides the existing `TaskEventBus` (subscribe like the search module does —
> `tasks.service` untouched).

> Effort tags: **S** small · **M** medium · **L** large. Section I builds the primitives (A
> storage+skeleton, B the trigger, C the nodes); Section II ships the pipelines as templates
> (D retro, E digest); Section III surfaces it (F/G) and finishes plumbing (H). A→B→C→D/E→F/G;
> H anytime after A.

---

## Current state (what exists to build on)

- ✅ **Raw material survives completion** — `task_events` (chronological, indexed),
  `agent_run_stats` (attempts, durations, outcomes), `task_failures` (P53 classes +
  `lastOutput`), `ai_review` (P37 verdict+summary), check runs (P30), `prUrl`/`pr_status`; the
  **session transcript** is JSONL under `~/.claude/projects/…`, loadable anytime via
  [`sessions.reader.ts`](../packages/gateway/src/sessions/sessions.reader.ts) `loadTranscript()`
  (structured messages + tool calls). Archival is a DB soft-delete; the JSONL persists.
- ✅ **Structured-LLM pattern** — [`llm.service.ts`](../packages/gateway/src/agent/llm/llm.service.ts)
  `generateStructured()` with the breakdown/classifier services as the template. ❌ **Nothing
  LLM-summarizes activity today** — all P18 reports are deterministic markdown
  ([`task-report.ts`](../packages/gateway/src/tasks/lib/task-report.ts);
  [`council-report.ts`](../packages/gateway/src/councils/lib/council-report.ts) is the
  multi-entity **aggregation** precedent).
- ✅ **The workflow seam** — cron **schedule triggers** via
  [`workflow-scheduler.service.ts`](../packages/gateway/src/workflows/scheduler/workflow-scheduler.service.ts);
  node executors in [`workflows/engine/executors/`](../packages/gateway/src/workflows/engine/executors/)
  (incl. `ai.claude`, `slack.message`, `midnite.list-tasks`); and a **seeded
  [`daily-digest.seed.ts`](../packages/gateway/src/workflow-templates/seeds/daily-digest.seed.ts)**
  (08:00 weekdays: list wip/todo → ai.claude → slack) — the blueprint this phase upgrades.
  ❌ Triggers are **manual / schedule / webhook only** — no task-lifecycle trigger.
- ✅ **Delivery channels** — P21 [`notification-dispatcher.service.ts`](../packages/gateway/src/notifications/notification-dispatcher.service.ts)
  (in-app feed + generic webhook channel, fan-out, isolated failures); P44
  [`webhooks/`](../packages/gateway/src/webhooks/) (Slack/Discord-aware outbound + delivery log);
  P18 export framework (`md`/`pdf`). ❌ No email (out of scope).
- ✅ **Surfaces to extend** — the dashboard **widget registry**
  ([`dashboard-widgets.ts`](../packages/web/lib/dashboard-widgets.ts), 40+ types + picker), the
  task detail, the P51/P55 cockpits.
- ❌ **Net-new:** retro/digest contracts + storage, the task-event trigger, the retro/digest
  nodes, the pipelines, and every surface that shows them.

---

# Section I — Primitives (contracts, storage, trigger, nodes)

## Theme A — Retro contract + deterministic skeleton + storage — **M** — ✅ DONE (PR #341, 2026-07-07)

Every terminal task gets a free, factual retrospective — no LLM required.

- [x] **shared:** `TaskRetroSchema` — `{ taskId, outcome, timeline: RetroEvent[], attempts: [{ startedAt,
      endedAt, durationMs, outcome, retryIndex }], failures: TaskFailure[], checks?, review?: { verdict,
      summary }, prUrl?, durations: { waitMs, workMs, totalMs }, narrative: { … , generatedBy: 'llm' } | null,
      createdAt }` + `RetroResponse` + a `DigestSchema` stub (Theme D fills it). Re-exported from `index.ts`.
- [x] **gateway:** a `RetroBuilder` service in a new `retro/` module assembling the **skeleton
      deterministically** from `task_events` + `agent_run_stats` + `task_failures` + `ai_review` + check
      runs + PR — **zero LLM**; a `task_retros` table (JSON blob + queryable key cols, one row per task
      upserted, `narrative` null) + forward-only migration `0074`; `GET /tasks/:id/retro` (scope-checked,
      404 when none built).
- [x] **Auto on terminal:** subscribe to the `TaskEventBus` (the search-module pattern — `tasks.service`
      untouched): on `done`/`abandoned`, build + store the skeleton. Idempotent (skips a same-outcome
      rebuild; a genuine re-terminal upserts), fail-open (a retro failure never touches the task).
      (Needs-attention escalation as a trigger deferred — the task isn't finished, so a retro there is
      premature.)

## Theme B — Task-event workflow trigger — ✅ DONE (PR #351, 2026-07-07)

The workflow-first enabler: workflows that fire when tasks finish. Useful far beyond digests.

- [x] **shared:** extend the trigger union with `{ type: 'task-event', events: ('task.done' |
      'task.abandoned' | 'task.needs-attention')[], filter?: { repo?, projectId?, priority? } }` —
      same zod discipline as schedule/webhook triggers.
- [x] **gateway:** the workflow engine subscribes to the `TaskEventBus`; a matching terminal event
      enqueues a run with the task (id + summary) as trigger input. Debounced/idempotent per
      task-transition (a retried task that re-completes fires once per terminal transition); respects
      enabled/team-scope like other triggers; recorded in `workflow_runs` like any run.
- [x] Editor + template support: the trigger is configurable in the workflow editor's trigger panel
      (event checkboxes + optional repo/project filter) and usable in seeds.

## Theme C — Retro & digest node executors — **M-L** — ✅ DONE (PR #393, 2026-07-11)

Thin nodes over real services — the workflow vocabulary for reporting.
Landed — items moved to [`done.md`](done.md). Four executors reach their
services via lazy ports (RETRO_ACCESSOR / TASK_LISTER / NOTIFIER / DIGEST_BUILDER)
so `WorkflowsModule` gains no imports; a new `digests/` module (table + migration
`0082` + repository + `DigestBuilder`) + a bounded transcript slicer in
`sessions/lib`; full structured `DigestSchema`; `retro`/`digest` LLM features. All
LLM calls fail-soft to deterministic output. (The transcript slicer was built here
rather than waiting for Theme H, which will formalize/reuse it.)

---

# Section II — Pipelines (seeded workflow templates)

## Theme D — Retro pipeline template — **S-M** — ✅ DONE (PR #399, 2026-07-11)

The narrative writes itself when work ends.

- [x] A seeded **"Task retrospectives"** template: `task-event` trigger (`done` + `abandoned`) →
      `midnite.generate-retro` → `logic.branch` (notable?) →(true) `midnite.notify` (`retro.notable`).
      Notability is a **deterministic** signal (`isRetroNotable` in `shared`) surfaced by the
      `generate-retro` executor as `outcome` + `notable` — true on abandoned / `retries-exhausted` /
      `gate-failed` / a failed check-run, so the branch fires notify regardless of whether the LLM
      narrative was produced; a clean `done` stays quiet (the `false` handle has no target).
      (`long-overrun` deferred — no baseline to measure "overrun" against without a config knob.)
- [x] Seeded via the template marketplace (P36) as **installable + one-click enable** (Decision §4);
      the deterministic skeleton (Theme A) exists regardless, so AI-off just means "no LLM narrative"
      while the `notable` branch still works (it's computed from the skeleton, not the LLM).
- [x] Template docs: cost per run (one small plan-model call, tag `retro`), budget-cap behaviour
      (routes through `LlmService` → P50 caps / P61 attribution; degrades to the skeleton when
      exhausted), and how to add a Slack step — all in the seed header.

## Theme E — Digest pipeline template (upgrade the existing seed) — **M** — ✅ DONE (PR #401, 2026-07-11)

The morning "what did the fleet do?" — assembled by the product itself.

- [x] **Upgrade [`daily-digest.seed.ts`](../packages/gateway/src/workflow-templates/seeds/daily-digest.seed.ts):**
      schedule trigger (08:00 weekdays) → `midnite.list-completed-tasks` (24h window) →
      `midnite.build-digest` → **parallel, failure-isolated** delivery fan-out: `slack.message`
      (rich Block Kit blocks, headline as fallback text) **and** `midnite.notify` (in-app,
      `digest.generated` → `/digests`) — replacing the old freeform list-tasks→ai.claude draft
      with the real, structured digest. Slack is **optional / best-effort**: the credential slot is
      optional and an unbound `slot:` sentinel makes `slack.message` **skip cleanly** (never fails
      the run), so the template one-click-enables with in-app-only delivery. `slack.message` gained
      an optional, expressionable Block Kit `blocks` param (`union([array, string])` so the raw
      `{{ $json.blocks }}` survives graph validation, then resolves to the typed array at run time).
- [x] **Global scope with per-repo/project sections** in one digest (settled) — `build-digest`
      already emits per-repo sections; the seed runs the global 24h window, and its
      `sinceHours`/`repo`/`projectId` node params stay editable per install for a per-project variant.
- ⏳ **Deferred (follow-up):** P44 delivery to registered outbound webhooks. The webhook delivery
      engine subscribes **only** to the `TaskEventBus` (task-scoped events) — digests have no seam.
      Fanning them out needs a new `digest.generated` webhook event + per-provider formatter + an
      emit from `DigestBuilder.build`; deferred to keep this slice at **M** (Slack + in-app cover
      the delivery targets today).

---

# Section III — Surfaces & plumbing

## Theme F — Retro surfaces — **M** — ✅ DONE (PR #402, 2026-07-11)

- [x] **Task detail:** a **Retrospective** tab (page variant, gated on the task being terminal —
      a skeleton is always built then) rendering the full retro (timing, failure story, AI review,
      checks, PR, attempts, timeline) + the narrative under an **"AI summary"** honesty badge when
      present (`generatedBy`); a `narrative: null` skeleton omits the block silently.
- [x] **Markdown export:** `GET /tasks/:id/retro/export` via the P18 framework
      (`buildTaskRetroReport`, mirroring [`task-report.ts`](../packages/gateway/src/tasks/lib/task-report.ts))
      — `md` server-side, `pdf` client-side, wired into the existing `ExportMenu`.
- [x] The P51 session cockpit links to the task's retro once terminal (a **"View retrospective"**
      deep-link to `?tab=retro`).

## Theme G — Digest surfaces — **M**

- [ ] A **Digests feed** (a page or a section under Ops/dashboard): list of generated digests
      (date, headline, counts) → a detail render of the structured digest (sections, highlights,
      deep-links into tasks/retros); markdown export per digest.
- [ ] A **digest dashboard widget** (latest headline + counts) registered in
      [`dashboard-widgets.ts`](../packages/web/lib/dashboard-widgets.ts) with the existing picker/
      sizing conventions.
- [ ] Digest + retro entities are **searchable** (FTS index: headline/narrative → the P20 pattern)
      so "that thing the digest mentioned" is findable.

## Theme H — Transcript slicing, CLI, config & docs — **S-M** — ◐ PARTIAL (PR #403, 2026-07-11)

- [x] A **bounded transcript-excerpt helper** (`sliceTranscript` in
      [`sessions/lib/transcript-slice.ts`](../packages/gateway/src/sessions/lib/transcript-slice.ts))
      — built in Theme C (tail-N messages + char cap), the only way retro generation touches a
      transcript.
- [◐] **CLI:** `midnite retro <taskId>` (render + `--json` + `--export [file]`) landed over the
      existing retro routes. **`midnite digest [--latest | --list]` deferred** — it needs a
      `GET /digests` read API that Theme G (digest surfaces, in flight) is building; a tiny follow-up
      adds the command once G lands the endpoint (avoids two loops building the same controller).
- [x] **Config + docs:** `retro.autoSkeleton` (default on, gates the auto-skeleton subscriber) +
      `retro.narrativeMaxTokens` (default 700, bounds the narrative call) in the shared schema; the
      cost model (skeleton free · narrative one small call · fail-soft) documented in
      [`docs/RETROS.md`](../docs/RETROS.md) + a README pointer. `digest.enabled`/cadence stays on the
      workflow, as designed.

---

## Files this phase touches (map)

- **New/edit (shared):** `TaskRetro` / `Digest` / retro+digest node schemas + the `task-event`
  trigger in [`shared/src/`](../packages/shared/src/) (workflow trigger union, node registry);
  client methods in [`web/lib/api.ts`](../packages/web/lib/api.ts) + [`cli/src/client.ts`](../packages/cli/src/client.ts)
- **New (gateway):** `task_retros` + `digests` tables in [`db/schema.ts`](../packages/gateway/src/db/schema.ts)
  + forward-only [`drizzle/`](../packages/gateway/drizzle/) migrations; `RetroBuilder` +
  `DigestBuilder` services (+ `buildTaskRetroReport`); the bus-subscribed skeleton hook; node
  executors `generate-retro` / `list-completed-tasks` / `build-digest` / `notify` in
  [`workflows/engine/executors/`](../packages/gateway/src/workflows/engine/executors/)
- **Edit (gateway):** the workflow trigger layer (task-event trigger riding
  [`task-event-bus.ts`](../packages/gateway/src/tasks/task-event-bus.ts));
  [`daily-digest.seed.ts`](../packages/gateway/src/workflow-templates/seeds/daily-digest.seed.ts)
  (upgraded) + a new retro-pipeline seed; retro/digest routes on the tasks + a small digests
  controller; FTS index mappers (P20 pattern)
- **Edit (web):** task detail (Retrospective section), a Digests feed view, the widget registry +
  digest widget, the workflow editor's trigger panel (task-event option)
- **New (cli):** `retro` + `digest` commands in [`cli/src/index.ts`](../packages/cli/src/index.ts)
- **Reuse:** `generateStructured` + budget caps + usage tagging, `loadTranscript`, the P18 export
  framework, P21 dispatcher, P44 webhooks, the P36 template marketplace, the P57 summary DTOs,
  P61 spend/cycle endpoints (best-effort) — no new channels, no parallel pipeline.

---

## Verification

- [ ] **Skeleton always:** every task reaching `done`/`abandoned`/needs-attention gets a
      deterministic `task_retros` row (timeline, attempts, failures, durations, review, PR) with
      **zero LLM calls**; re-terminal transitions upsert, never duplicate; a retro failure never
      affects the task.
- [ ] **Workflow-first narrative:** with the retro template enabled, a completed task's retro gains
      a narrative (one plan-model call, usage-tagged `retro`); with LLM off / budget capped / the
      template disabled, the skeleton renders cleanly with `generatedBy: null` — **no fake
      narrative, no failure**.
- [ ] **Task-event trigger:** a workflow with `{ type: 'task-event', events: ['task.done'] }` fires
      exactly once per terminal transition (idempotent under retries), respects repo/project filters
      + team scope, and appears in `workflow_runs` like any run.
- [ ] **Digest pipeline:** the upgraded daily-digest template produces a stored digest (global
      headline + per-repo/project sections + retro highlights + spend/cycle stats when P61 data
      exists) and delivers it to **Slack (formatted)**, **in-app notification**, and **markdown
      export**; the P44 delivery log records the webhook attempt.
- [ ] **Surfaces:** the task detail shows the Retrospective (honesty-labeled); the Digests feed
      lists + renders digests with working deep-links; the dashboard widget shows the latest
      headline; retros/digests are findable via global search; `midnite retro`/`digest` work with
      `--json`.
- [ ] **Bounded transcripts:** narrative generation never reads more than the slicing helper's cap
      (verified on an oversized JSONL); a missing/deleted transcript degrades to events-only
      narrative input.
- [ ] **Product data:** `task_retros`/`digests` are excluded from P61 retention pruning; P18
      exports render (`md` + client `pdf`).
- [ ] `moon run :typecheck` · `:lint` · `:test` green (shared schema units; gateway RetroBuilder/
      DigestBuilder/trigger/node tests with LLM fakes incl. fail-soft + idempotency; a seeded-
      template run test; web RTL for the retro section + digest feed; CLI snapshot; **web tests
      from the primary checkout, not a `.git` worktree**).

---

## Decisions / open questions

1. **Workflow-first orchestration** *(settled — user call).* Retro narrative + digest generation +
   delivery run as **workflows** (a new task-event trigger, retro/digest nodes, seeded templates) —
   midnite dogfoods its own automation. Node executors stay thin; `RetroBuilder`/`DigestBuilder`
   services own the logic (CLAUDE.md layering).
2. **The skeleton is service-side and always on** *(recommend).* The deterministic retro costs
   nothing and shouldn't depend on a workflow being enabled — the bus-subscribed hook stores it on
   every terminal transition; workflows add the narrative on top. Honors "auto + cheap" without
   coupling core data to pipeline config.
3. **LLM cost stance** *(settled).* One small plan-model call per retro narrative + one per digest
   headline — budget-capped (P50), usage-tagged, **fail-soft to deterministic output**, honesty
   label (`generatedBy`) end-to-end. Transcript input is hard-capped by the slicing helper.
4. **Templates are installable + one-click enable** *(recommend).* Ship both pipelines as P36
   marketplace seeds rather than force-enabled — visible, editable, disable-able; the digest cadence
   is just the workflow's cron.
5. **Digest scope: global with per-repo/project sections** *(settled).* One artifact per cadence;
   per-project installs are a template-parameter variant, not a separate system.
6. **Delivery = in-app + Slack/Discord webhooks + markdown export** *(settled).* All plug-in (P21 /
   P44 / P18). **Email is out of scope** (no infra exists).
7. **Retros/digests are product data** *(settled).* Stored first-class, searchable (P20), never
   pruned by P61 retention.
8. **Out of scope** *(settled).* Email delivery, cross-instance/team digest rollups, a memory/
   learning loop feeding retros back into agent prompts (the natural **fable #4** — retros are
   deliberately structured to feed it), and digest personalization per user.