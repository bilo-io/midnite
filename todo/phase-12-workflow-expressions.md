# Phase 12 — Workflow data flow & expressions

> Phase 6 ([phase-6-workflows-mvp.md](phase-6-workflows-mvp.md)) shipped the node-based builder: a workflow is a DAG that the engine runs topologically, passing the **merged whole-output** of a node's direct predecessors as the next node's `input` ([`workflow-engine.service.ts`](../packages/gateway/src/workflows/engine/workflow-engine.service.ts)). `logic.branch` already routes on a dotted path. **Phase 12 turns "blob in, blob out" into field-level data flow:** any node can reference any field of any *named* upstream node, reshape payloads with dedicated data nodes, and persist state across runs with a storage node — plus the n8n-style expression editor that makes it usable. This closes Phase 6 follow-up **P8**.

> **Scope guardrails.** This is the **data/expression layer**, not new integrations or transport. The expression syntax is the new contract → it lives in [`@midnite/shared`](../packages/shared/src/) so the gateway executors and the web editor agree on one grammar (CLAUDE.md: *shared is the contract*). The engine's topological run, cycle rejection, per-node persistence, scheduler, and webhook receiver all stay as-is — we extend the run **context** and the **node-type registry**, we don't rewrite the engine. New persistence (storage node) follows the normal repository → service → executor layering; new tables get a forward-only migration. **Provider-agnostic:** the `ai.claude` node keeps reusing `AnthropicService`; nothing here assumes a provider.

> Effort tags: **S** small · **M** medium · **L** large. Themes are ordered A→F (engine before UI); A–C are prerequisites for D–E. Each is independently shippable behind that ordering.

> **Out of scope — these are [Phase 13](phase-13-workflows-connect.md), not here:** live WS run streaming (P7 — emit `WorkflowEvent`s, swap polling), credential vault + OAuth (P9), Slack/Google/Email integration executors (P10), and CLI workflow parity. Phase 13 *consumes* this phase's expression engine; it does not change the grammar. Also out of scope and deliberately never built: arbitrary-JS `code` nodes (an `eval`/sandbox security surface we avoid — `logic.setData` covers reshaping declaratively).

---

## Theme A — Expression engine in `shared` (the contract) — ✅ DONE (PR #27, 2026-06-20)

The new syntax both sides must agree on. A **safe** resolver — no `eval`, no `Function` — just template interpolation over a typed context.

- [x] **S** Grammar: `{{ ... }}` spans over a typed context (`$json` / `$node` by label / `$env`), dotted + bracket paths (`$json.items[0].id`, `$node["Fetch issues"].json.title`, quoted keys), in [`expression.ts`](../packages/shared/src/expression.ts).
- [x] **M** `resolveExpression` + `resolveParams` (+ `isExpression`): a bare single span returns the **typed** value; mixed text returns a string (objects JSON-stringified); a non-templated string passes through. Pure, dependency-light.
- [x] **S** Missing-reference policy: an unresolved path **throws** a typed `ExpressionError` naming the path; optional access (`{{$json.maybe?.x}}`) resolves to `null`. Honors decision §3 + §1 (no-eval) / §2 ($node by label).
- [x] **S** `expressionable` flag added to `NodeField` ([`node-types.ts`](../packages/shared/src/node-types.ts)), marking the template-capable fields (http `url`/`headers`/`body`, ai `prompt`/`system`, branch `right`) for the editor's ƒx affordance (Theme D).
- [x] **M** Tests (33 cases): paths, brackets, optional, mixed text, escaping `\{{`, missing-ref throw vs optional, type preservation, malformed templates (clear error, no crash), `resolveParams`. `shared` now 34 files / 257 tests; `shared:test`/`typecheck`/`lint`/`build` green; `moon ci` green on PR #27. See [done.md](done.md).

## Theme B — Engine integration (resolve before execute)

Wire the resolver into the run so executors receive **resolved** params and we can debug what each reference became.

- [ ] **M** Build the run context in [`workflow-engine.service.ts`](../packages/gateway/src/workflows/engine/workflow-engine.service.ts): keep accumulating `outputs` (already done), expose them to expressions as `$node` keyed by node **label** (fall back to id), and set `$json` to the node's computed `input`.
- [ ] **M** Resolve a node's params via `resolveParams` **before** handing `ctx.params` to the executor; on `ExpressionError`, fail that node (short-circuit) with a clear message naming the unresolved path.
- [ ] **S** Persist **resolved params** on each `NodeRun` (alongside `input`/`output`) — add the column via a forward-only migration in [`packages/gateway/drizzle/`](../packages/gateway/drizzle/) (next is `0028_*`) and the field in [`run.ts`](../packages/shared/src/run.ts). This is what Theme E surfaces.
- [ ] **S** Strip the now-stale "templating lands later" comment in [`ai-claude.executor.ts`](../packages/gateway/src/workflows/engine/executors/ai-claude.executor.ts); confirm `http.request` URL/headers/body and `ai.claude` prompt all flow through resolution.
- [ ] **M** Engine tests: a 2-node chain where node 2's param pulls `{{$node["..."].json.x}}`; missing-ref fails the right node; resolved params are persisted and returned by `GET /runs/:id`.

## Theme C — Reshape & storage nodes (registry + executors)

New node types — one registry entry in `shared` + one executor in the gateway each (the Phase 6 "adding an integration is one definition + one executor" rule).

- [ ] **M** `logic.setData` — build/merge an object from expression-valued fields (key → `{{expr}}`), with a "keep only set fields" vs "merge onto input" toggle. The explicit reshape node central to *use outputs as inputs*.
- [ ] **M** `logic.merge` — fan-in: combine multiple upstream branches into one payload (by-index append / shallow-merge / collect-into-array mode). Pairs with the engine's existing multi-predecessor handling.
- [ ] **S** `data.filter` / pick — select or drop a set of fields from the payload (lighter than `setData`).
- [ ] **L** `storage.set` / `storage.get` — a persisted key-value store so a run can stash data and a later run (or node) read it. New Drizzle table `workflow_storage` (scoped per workflow; key + JSON value + timestamps), repository → service → executor; values readable via `{{$node}}` within a run and via `storage.get` across runs. *(See Decisions §4 for scoping.)*
- [ ] **S** Register all four in [`node-types.ts`](../packages/shared/src/node-types.ts) with param schemas, ports, and a category so they group in the palette (Theme F); executors under [`engine/executors/`](../packages/gateway/src/workflows/engine/executors/) wired into [`executor-registry.ts`](../packages/gateway/src/workflows/engine/executor-registry.ts).
- [ ] **M** Tests: each executor's param schema + behaviour; `storage.set`→`storage.get` round-trip against `:memory:` SQLite; `logic.merge` modes.

## Theme D — Full n8n-style expression editor (web)

The headline UX: make references discoverable and previewable instead of hand-typed. Most of the phase's polish lives here.

- [ ] **S** **ƒx toggle** per templatable field in the config panel ([`workflow-editor.tsx`](../packages/web/components/workflow-editor.tsx) / its field forms): switch a field between literal and expression mode (driven by the Theme-A `expressionable` flag).
- [ ] **L** **Expression input** with autocomplete: typing `$node["` suggests upstream node labels; `.` after a node suggests fields drawn from that node's **last-run output**; `$json` / `$env` completions too.
- [ ] **L** **Data picker** panel: show the selected node's upstream inputs as an explorable tree of the last run's data; **click a leaf to insert** its `{{...}}` reference at the cursor.
- [ ] **M** **Inline resolved-value preview**: render what an expression resolves to using the last successful run's data (or pinned sample data, Theme E), with a clear "no data yet — run once or pin sample" empty state.
- [ ] **S** Enforce **unique node labels** in the editor (the picker references by label) — inline validation + auto-suffix on collision in [`workflow-store.ts`](../packages/web/lib/workflow-store.ts).
- [ ] **M** Web tests: ƒx toggle round-trips a field to/from an expression; picker inserts a correct reference string; preview renders a resolved value from mocked run data.

## Theme E — Run-history & design-time debugging (web)

See what references actually resolved to — the payoff of Theme B's persisted resolved params.

- [ ] **M** Run-output panel: per node show **input → resolved params → output** (use the new `NodeRun` field), so a failed reference is obvious. Extend the existing `use-workflow-run` polling view ([`use-workflow-run.ts`](../packages/web/lib/use-workflow-run.ts)).
- [ ] **S** **Pin sample data** on a node: store a sample payload (editor-local + optionally persisted) so the Theme-D picker/preview work *before* a real run.
- [ ] **S** Surface `ExpressionError` messages from a failed run inline on the offending node (red port/field), not just in the run log.

## Theme F — Palette grouping & new-node surfacing (web)

Make the growing node set navigable in the left sidebar.

- [ ] **S** Group the palette into **categories** — Triggers · Actions · Logic · Data · Storage — using the registry `category` field; the catalog/accent-hue plumbing already exists ([`workflow-node-catalog.ts`](../packages/web/lib/workflow-node-catalog.ts), `hueVarForCategory`).
- [ ] **S** Add the new nodes (`logic.setData`, `logic.merge`, `data.filter`, `storage.set`, `storage.get`) to the palette with icons + one-line descriptions; collapsible category sections.
- [ ] **S** Palette **search/filter** box (filter node types by name/description) — small quality-of-life win as the set grows.

---

## Files this phase touches

**shared (the contract):**
- [`packages/shared/src/expression.ts`](../packages/shared/src/) — **new**: grammar + `resolveExpression`/`resolveParams` + `ExpressionError`
- [`packages/shared/src/node-types.ts`](../packages/shared/src/node-types.ts) — `expressionable` flag; register `logic.setData` / `logic.merge` / `data.filter` / `storage.*`
- [`packages/shared/src/node.ts`](../packages/shared/src/node.ts), [`run.ts`](../packages/shared/src/run.ts) — resolved-params field on `NodeRun`
- barrel + tests alongside

**gateway:**
- [`packages/gateway/src/workflows/engine/workflow-engine.service.ts`](../packages/gateway/src/workflows/engine/workflow-engine.service.ts) — run context (`$json`/`$node`/`$env`), resolve-before-execute, persist resolved params
- [`packages/gateway/src/workflows/engine/executors/`](../packages/gateway/src/workflows/engine/executors/) — new executors; tidy [`ai-claude.executor.ts`](../packages/gateway/src/workflows/engine/executors/ai-claude.executor.ts) comment
- [`packages/gateway/src/workflows/engine/executor-registry.ts`](../packages/gateway/src/workflows/engine/executor-registry.ts) — register new executors
- [`packages/gateway/src/db/schema.ts`](../packages/gateway/src/db/schema.ts) + [`packages/gateway/drizzle/`](../packages/gateway/drizzle/) — `workflow_storage` table, `node_runs.resolved_params` column (migration `0028_*`)
- `workflow_storage` repository/service under [`packages/gateway/src/workflows/`](../packages/gateway/src/workflows/)

**web:**
- [`packages/web/components/workflow-editor.tsx`](../packages/web/components/workflow-editor.tsx) — ƒx toggle, expression input, data-picker panel, resolved preview
- [`packages/web/lib/workflow-store.ts`](../packages/web/lib/workflow-store.ts) — unique-label enforcement, pinned sample data
- [`packages/web/lib/use-workflow-run.ts`](../packages/web/lib/use-workflow-run.ts) — input/resolved/output in run history
- [`packages/web/lib/workflow-node-catalog.ts`](../packages/web/lib/workflow-node-catalog.ts) — categories, new nodes, palette search
- [`packages/web/components/nodes/workflow-node-view.tsx`](../packages/web/components/nodes/workflow-node-view.tsx) — error surfacing on nodes

---

## Verification

- [ ] Build `manual → http.request → ai.claude` where the AI prompt references `{{$node["HTTP Request"].json.body.title}}`; run it; the prompt the model receives contains the fetched value, and the run shows resolved params per node.
- [ ] A missing reference (`{{$node["Typo"].json.x}}`) fails the referencing node with a clear path-naming error; optional access (`{{$json.maybe?.x}}`) resolves to `null` and the node succeeds.
- [ ] `logic.setData` builds an object from two upstream nodes' fields; `logic.merge` combines two branches; `data.filter` drops a field — each verified in a run.
- [ ] `storage.set` in one run, `storage.get` in a later run returns the stored value (round-trip across runs against `:memory:` in tests, and live).
- [ ] In the editor: toggle a field to ƒx, autocomplete an upstream node, click a leaf in the data picker to insert a reference, and see the resolved-value preview from the last run / pinned sample.
- [ ] Palette shows grouped categories (Triggers · Actions · Logic · Data · Storage) with the new nodes and a working search filter.
- [ ] `moon run :typecheck` · `moon run :lint` · `moon run :test` green across the graph (run web tests from the primary checkout, not a `.git` worktree).

---

## Decisions / open questions

1. **Expression syntax** *(recommend: resolved).* n8n-style `{{ }}` with dotted/bracket paths and `$json`/`$node`/`$env`, **no `eval`/`Function`**. Matches the codebase's own `{{$json.field}}` comment and avoids a sandbox. *Settled in brainstorm.*
2. **Reference upstream nodes by** *(recommend: resolved).* Node **label** (enforce unique labels in the editor), falling back to id. Labels are what the picker shows; ids are ugly. Re-labelling a node is the known cost — flag references to a renamed/missing label in the editor.
3. **Missing-reference behaviour** *(recommend: resolved).* Hard-fail the node by default; opt into `?` optional access for fields that may be absent. Predictable beats silently-null.
4. **Storage node scoping** *(open).* Per-workflow KV (simplest, no cross-workflow coupling) vs a project/global namespace (more powerful, more footguns). **Recommend per-workflow for this phase**, with the table carrying a nullable scope column so a global tier can be added later without a breaking migration.
5. **Design-time data for the picker** *(recommend: resolved).* Use the **last successful run's** per-node outputs; "pin sample data" (Theme E) covers never-run nodes. No separate "test this node" execution endpoint in this phase.
6. **Theme D ambition** *(settled).* Full n8n-style picker — ƒx toggle + autocomplete + click-to-insert + inline preview. (Confirmed in brainstorm over the lighter "expression fields only" option.)
7. **`logic.merge` semantics** *(open).* Which combine modes ship — by-index append, shallow-merge, collect-into-array? **Recommend all three behind a mode param**; revisit if one is clearly unused.
