# Retrospectives & digests (Fable series #3)

midnite turns the fleet's activity into **signal**: a **retrospective per task**
(what the agent did, what tripped it up, how long it took) and, on top, periodic
fleet **digests**. This doc covers the retro cost model, the config knobs, and the
CLI. It complements [`METRICS.md`](METRICS.md) (observability) — same honesty
discipline, different surface.

## The retrospective

When a task reaches a terminal state (`done` / `abandoned`), the gateway builds a
`task_retros` row: a **deterministic skeleton** assembled from data already
persisted — `task_events`, `agent_run_stats`, `task_failures`, the Phase 37 AI
review, Phase 30 check runs, and the PR — with **zero LLM calls**. It carries:

- **outcome** — `done` or `abandoned`
- **timeline** — the task's event history
- **attempts** — each agent run (start/end, duration, outcome, retry index)
- **failures** — the P53 failure records (class + detail)
- **durations** — `wait` (todo→first wip), `work` (first wip→terminal), `total`
- **review** / **checks** / **prUrl** — when present
- **narrative** — the LLM summary, or `null` in a pure skeleton

The skeleton is built by a subscriber on the task event bus, **fail-open**: a retro
error never touches the task write path. It's **idempotent** — a re-terminal with a
changed outcome rebuilds, but a routine `task.updated` on a done task does not.

## The narrative (optional, honestly labelled)

The **retro workflow** (`task-retrospectives` template) layers an LLM narrative on
top: one small `generateStructured` call on the plan model producing `whatHappened`
/ `whatTrippedIt` / `notable`. It is:

- **bounded** — `maxTokens` = `retro.narrativeMaxTokens` (default 700), and the
  transcript it reads is capped by the bounded slicer (never a whole JSONL);
- **budget-aware** — the P50 spend caps apply; over budget ⇒ skipped;
- **fail-soft** — AI off, no transcript, or an LLM error ⇒ the skeleton renders
  cleanly with `generatedBy: null`. **No fake narrative, ever.**

Every surface honours the `generatedBy` provenance: the web Retro tab shows an
"AI summary" badge only when a narrative exists; the CLI prints `skeleton only`
vs `AI narrative`.

## Cost model (at a glance)

| Part | Cost |
|------|------|
| Skeleton (always) | **free** — deterministic, no LLM |
| Narrative (when the retro workflow runs) | **one small plan-model call**, ≤ `retro.narrativeMaxTokens`, budget-capped, fail-soft |
| Digest headline | one small plan-model call, fail-soft to a deterministic string |

## Config

```jsonc
{
  "retro": {
    "autoSkeleton": true,        // build the deterministic skeleton on every terminal
                                 // transition (default). false ⇒ retros only from an
                                 // explicit workflow run.
    "narrativeMaxTokens": 700    // token cap for the narrative's single plan-model call
  }
}
```

Both default so a fresh install gets factual retros with no setup. The narrative
is produced by the workflow, not this config — these knobs only gate the
auto-skeleton and bound the narrative call.

## CLI

```sh
midnite retro <taskId>              # rendered summary (outcome, timing, failures,
                                    # review, attempts) + the narrative when present
midnite retro <taskId> --json       # the raw TaskRetro
midnite retro <taskId> --export     # the retro as markdown, to stdout
midnite retro <taskId> --export r.md # …or to a file

midnite digest list                 # recent fleet digests, most-recent-first
midnite digest list -n 5            # cap the feed length
midnite digest show <id>            # a full digest (counts, sections, highlights,
                                    # best-effort spend + cycle time)
midnite digest show --latest        # …or the most recent one
midnite digest show <id> --json     # the raw Digest
midnite digest show <id> --export   # the digest as markdown, to stdout
midnite digest show <id> --export d.md # …or to a file
```

The retro markdown is the same document the web Retro tab exports (`GET
/tasks/:id/retro/export`); the digest markdown matches the `/digests` feed's
export (`GET /digests/:id/export`) — both round-trip into any report. `midnite
digest` reads the same global digests the web feed shows; there's no `digest.enabled`
switch — digests are produced by the daily-digest workflow (Theme E).
