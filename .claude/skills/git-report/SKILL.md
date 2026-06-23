---
name: git-report
description: Git activity report for the repo over a day/week/month — merged PRs (linked), phases tackled + per-phase diff, and overall phase progress, as tables + a chart.
argument-hint: "[today | yesterday | YYYY-MM-DD | this-week | this-month | YYYY-MM-DD..YYYY-MM-DD]"
allowed-tools: Bash, Read, Glob, Grep, AskUserQuestion, Artifact, Agent
---

A git activity + phase-progress report for **midnite** over a chosen window.

**Style:** terse — lead with the report, don't narrate the gathering.

## 1 · Pick the window
If `$ARGUMENTS` already names a period (`today`, `yesterday`, a `YYYY-MM-DD`, `this-week`, `this-month`, or a `START..END` range), use it. Otherwise **AskUserQuestion** — one question, options **Today · Yesterday · This week · This month** (Other = a specific date or `START..END`).

Resolve to a concrete inclusive `START`/`END` (`YYYY-MM-DD`). macOS `date`:
- today `date +%F` · yesterday `date -v-1d +%F`
- this-week (Mon→today) START `date -v-monday +%F`, END `date +%F`
- this-month START `date -v1d +%F`, END `date +%F`

Echo the resolved range back in one line before the report.

## 2 · Gather (read-only) — fan out to subagents

The gathering is independent and read-heavy (raw PR JSON + ~30 phase-doc reads), so once `START`/`END` are resolved **dispatch two read-only subagents in a single message** so they run concurrently. Pass the resolved `START`/`END` into each prompt. Each returns a compact structured digest — keep the raw JSON and file dumps out of this thread; you compose the report from the digests.

**Subagent A — GitHub / PR data:**
- **Merged PRs in range** (the spine of the report):
  ```bash
  gh pr list --state merged --search "merged:START..END" \
    --json number,title,url,mergedAt,additions,deletions,author --limit 200
  ```
  (Default limit is 30 — keep `--limit 200`; bump it and note if the cap is hit.)
- **Status mix** for the range: also run `--state all --search "updated:START..END"` and bucket by state → merged / still-open / closed-unmerged.
- **Phase mapping:** parse each PR's title (and body if needed) for `Phase N` (+ Theme). Cross-check against phase docs touched in range: `git log --since=START --until="END 23:59" --name-only -- 'todo/phase-*.md'`. PRs with no phase → an "—" bucket.
- If `gh` isn't available/authed, say so and fall back to merge commits via `git log` — don't fail the report.
- **Return:** the merged-PR rows (`number, title, url, mergedAt, additions, deletions, author, phase`), the status-mix counts, and the phase→PRs aggregation.

**Subagent B — repo doc / phase state:**
- **Phase progress (whole repo, not just the range):** for each `todo/phase-*.md` count `- [x]`/`✅` vs `- [ ]` (exclude `OUT OF SCOPE`/`deferred`); read the status markers in `todo/README.md` Quick links. Compute done/total + %.
- **Items shipped in range:** count `done.md` entries whose date falls in `START..END`, grouped by phase.
- **Return:** one row per phase (`number, title, done, total, %, statusMarker`) plus the per-phase shipped-in-range counts.

## 3 · Report — markdown, tables-first
Emit in this order:

`# 📈 Git report — START → END`

A one-line **status mix**: `N merged · M open · K closed-unmerged`.

`## 🔀 Merged PRs` — newest first, link every PR via its `url`:
| PR | Title | Phase | Δ lines | Merged |
|----|-------|-------|---------|--------|
| [#69](url) | … | 25 · Theme D | +982 / −12 | 19:53 |

`## 🧭 Phases tackled` — aggregate the range's PRs per phase:
| Phase | PRs | Δ lines (period) | Items → done |
|-------|-----|------------------|--------------|
Sum the additions/deletions of the PRs mapped to each phase; `Items → done` = `done.md` entries dated in range for that phase.

`## 📊 Phase progress (overall)` — every phase, with a unicode bar:
| Phase | Status | Done / total | % | Bar |
|-------|--------|--------------|---|-----|
| 25 · UI library | ✅ | 18 / 18 | 100% | `██████████` |
Bar = 10 cells: `█` × round(%/10), `░` for the rest. Status emoji from the checkbox ratio + README markers: ✅ complete · 🔄 in progress · ⬜ not started.

End with a one-line **headline** — e.g. *"5 PRs · +2.3k/−1.0k · Phase 25 closed, Phase 15 advanced; 24/29 phases complete."*

## 4 · Optional richer chart
For a week/month window, or if the user asks for a visual, offer an **Artifact**: a small self-contained HTML page with a bar chart of PRs (and lines changed) per day plus a phase-completion chart. Otherwise the unicode bars suffice — they render in the terminal, whereas mermaid does not.
