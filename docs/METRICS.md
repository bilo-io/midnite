# Metrics & usage model

midnite records two *different* kinds of number, from two different sources. Keeping
them straight is the whole point of this page — the observability layer never invents
a figure, and where a number is an estimate it says so (Phase 61).

## The two sources

| | **Gateway LLM usage** (`/usage/summary`) | **Agent-session cost** (`/usage/attribution`) |
|---|---|---|
| Source | The gateway's *own* LLM calls (chat-to-board, Studio, breakdowns, retros…) metered inline through `UsageService` as each call returns | Real token counts **harvested from each Claude Code agent session's transcript** on the Stop hook, written to `session_usage` (Phase 61 A) |
| Answers | "What did midnite's own AI features cost?" | "Which task / repo / project / session did the agent fleet spend on?" |
| Grouping | by provider / model / feature | by `task` / `repo` / `project` / `session` |

They are **not** added together — different layers, different questions.

## Measured vs. estimated (the honesty contract)

Every cost is priced from a static per-model price table. A session's cost is:

- **measured** — the model is in the price table and the token counts came from the
  harvested transcript. This is the real thing.
- **estimated** — a fallback figure (0 today; the seam exists for models we can only
  approximate). Surfaced in its **own column**, never folded silently into "measured".
- **unpriced** — the session ran on a model with **no price-table entry**. Its *tokens*
  still count; its *cost* can't be known, so it's reported as an `unpriced` session
  count rather than a fabricated dollar amount.

`GET /usage/attribution` (and `midnite usage`) return `estCostUsd`,
`measuredCostUsd`, `estimatedCostUsd`, and `unpricedSessions` side by side so the split
is always visible.

## Where session tokens come from

When an agent session ends, the Stop hook hands the gateway the session transcript;
`session_usage` stores the input / output / cache-read / cache-creation token counts
parsed from it (Phase 61 A). These are **measured**, not modelled — they're the
provider's own per-turn accounting, summed. A session on an unpriced model still
records tokens (so throughput is honest) but contributes no cost.

## Live gauges vs. persisted history

- **Gauges** (`MetricsGauges`) — queue depth, slots used/total, last tick latency — are
  **live, in-memory** signals. They're lost on restart.
- **Gauge history** survives restarts: a sampler writes one `gauge_samples` row every
  `metrics.sampleIntervalMs` (default **60s**; `0` disables sampling). Read it via
  `GET /metrics/gauges/history` (Phase 61 D).
- **Ops summary** (`GET /metrics/ops`) aggregates `agent_run_stats` into throughput /
  duration buckets / outcome counts — persistent history, windowed by `from`/`to`.
- **Cycle time** (`GET /metrics/cycle-time`, Phase 61 C) reports `todo→wip→done`
  wait/work/end-to-end p50/p90 from `task_events`.

## Rollups & retention

Raw rows don't grow forever (Phase 61 E):

- A rollup job runs every `metrics.rollupIntervalMs` (default **1h**; `0` disables it),
  aggregating closed time buckets into `metrics_rollup` and pruning the raw rows it has
  rolled up. Read aggregates via `GET /metrics/rollups`.
- The gauge sampler prunes `gauge_samples` older than `metrics.rawRetentionDays`
  (default **30**; `0` keeps them forever) on each run.

All three knobs live under `metrics` in `midnite.json`:

```json
{ "metrics": { "sampleIntervalMs": 60000, "rawRetentionDays": 30, "rollupIntervalMs": 3600000 } }
```

## From the CLI (Phase 61 I)

Both commands take a window (`--since 24h|7d|…`, or explicit `--from`/`--to` ISO) and a
global `--json` for machine output.

```bash
# Agent-session cost attribution, grouped and cost-sorted, with the measured/estimated split
midnite usage --by repo          # or: project | task | session   (default: repo)
midnite usage --by project --since 7d
midnite usage --by task --json

# Fleet ops summary — live gauges, outcomes, run durations, per-day throughput
midnite ops                      # one-shot
midnite ops --watch              # refresh every 5s (Ctrl-C to stop); --interval <sec> to change
midnite ops --since 24h --json
```

`usage` flags an unpriced-session count when any bucket ran on a model without a price;
`ops --watch` clears and reprints on the interval (JSON mode stays one-shot so a pipe
gets a single value).
