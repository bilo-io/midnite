---
name: git-report
description: Git activity report for the repo over a day/week/month — merged PRs (linked), phases tackled + per-phase diff, and overall phase progress, as tables + a chart.
argument-hint: "[today | yesterday | YYYY-MM-DD | this-week | this-month | YYYY-MM-DD..YYYY-MM-DD]"
allowed-tools: Bash, Read, Write, Glob, Grep, AskUserQuestion, Artifact, Agent, SendUserFile
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

**Timezone — render every time in SAST** (`Africa/Johannesburg`, UTC+2, no DST). The host clock is SAST, so `date +%F` already yields the SAST date and `git log --since/--until` is SAST. The trap is GitHub: `gh`'s `mergedAt` is **UTC** (`…Z`) and a bare-date `merged:`/`updated:` search buckets by the **UTC** day — both must be pinned to SAST explicitly (see §2), or the window slips and every merge time reads 2h early. Any "now"/"generated" stamp you print is plain `date` (already SAST).

## 2 · Gather (read-only) — fan out to subagents

The gathering is independent and read-heavy (raw PR JSON + ~30 phase-doc reads), so once `START`/`END` are resolved **dispatch two read-only subagents in a single message** so they run concurrently. Pass the resolved `START`/`END` into each prompt. Each returns a compact structured digest — keep the raw JSON and file dumps out of this thread; you compose the report from the digests.

**Subagent A — GitHub / PR data:**
- **Merged PRs in range** (the spine of the report) — pin the window to SAST with a `+02:00` offset on both bounds so the search brackets the **SAST** day, not the UTC day:
  ```bash
  gh pr list --state merged \
    --search "merged:${START}T00:00:00+02:00..${END}T23:59:59+02:00" \
    --json number,title,url,mergedAt,additions,deletions,author --limit 200
  ```
  (Default limit is 30 — keep `--limit 200`; bump it and note if the cap is hit.)
  **The `Merged` column must be SAST.** `mergedAt` is UTC — convert it with jq (`+7200`; SAST has no DST so the constant is safe year-round) rather than slicing the raw `…Z` string:
  ```bash
  ... | jq -r 'sort_by(.mergedAt) | reverse | .[]
        | "\(.number)\t\(.mergedAt|fromdateiso8601+7200|strftime("%H:%M"))\t\(.additions)\t\(.deletions)\t\(.title)"'
  ```
  Pitfall: do **not** display the raw `mergedAt` HH:MM (that's UTC), and do **not** use `date -ju -f '%Y-%m-%dT%H:%M:%SZ' "$utc"` — the `-u` flag forces UTC *output* too, so it returns the time unconverted (16:19Z → "16:19", not "18:19"). The jq `+7200` path is the reliable one.
- **Status mix** for the range: also run `--state all --search "updated:${START}T00:00:00+02:00..${END}T23:59:59+02:00"` and bucket by state → merged / still-open / closed-unmerged.
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

`## 🔀 Merged PRs` — newest first, link every PR via its `url`. The **Merged** column is **SAST** (`mergedAt` converted per §2):
| PR | Title | Phase | Δ lines | Merged (SAST) |
|----|-------|-------|---------|---------------|
| [#69](url) | … | 25 · Theme D | +982 / −12 | 19:53 |

`## 🧭 Phases tackled` — aggregate the range's PRs per phase:
| Phase | PRs | Δ lines (period) | Items → done |
|-------|-----|------------------|--------------|
Sum the additions/deletions of the PRs mapped to each phase; `Items → done` = `done.md` entries dated in range for that phase.

`## 📊 Phase progress (overall)` — every phase, with a unicode bar:
| Phase | Status | Done / total | % | Bar |
|-------|--------|--------------|---|-----|
| 25 · UI library | ✅ | 18 / 18 | 100% | `██████████` |
Bar = 10 cells: `█` × round(%/10), `░` for the rest. Status emoji from the checkbox ratio + README markers: ✅ complete · 🔄 wip · ⬜ not started.

End with a one-line **headline** — e.g. *"5 PRs · +2.3k/−1.0k · Phase 25 closed, Phase 15 advanced; 24/29 phases complete."*

## 4 · Optional richer chart
For a week/month window, or if the user asks for a visual, offer an **Artifact**: a small self-contained HTML page with a bar chart of PRs (and lines changed) per day plus a phase-completion chart. Otherwise the unicode bars suffice — they render in the terminal, whereas mermaid does not.

## 5 · PDF export (end-of-day full-day report)

For a **complete-day window** — a past date, `yesterday`, or `today` **when this is the day's final report** (current SAST time ≥ 22:00, i.e. the ~23:00 run) — also export the report as a polished PDF and surface it in chat. Do it **once per day**: skip it on the 09:00 / 17:00 mid-day runs. (Also export on demand, for any window, whenever the user asks.)

A bundled, data-driven template lives at `.claude/skills/git-report/pdf-template.html` — all three tables render from one `DATA` object, so you only edit that block (no hand-written rows). Steps:

1. Copy the template into your scratchpad: `cp .claude/skills/git-report/pdf-template.html "$TMP/git-report-$END.html"`.
2. Replace the object between `/* DATA-START */` and `/* DATA-END */` with this run's values — **identical to the chat tables**. Tuple shapes are documented inline; `status` is `"done"` (complete) / `"wip"` (in progress) / `"todo"` (not started); all times SAST.
3. Render with headless Chrome (JS builds the tables, so allow virtual time):
   ```bash
   "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome" \
     --headless=new --disable-gpu --no-pdf-header-footer --virtual-time-budget=3000 \
     --print-to-pdf="$HOME/Desktop/midnite-git-report-$END.pdf" \
     "file://$TMP/git-report-$END.html"
   ```
   If Chrome isn't at that path, detect a Chromium/Edge binary; if none exists, say so and skip the PDF — **never fail the report over it**.
4. Surface it with **SendUserFile** (the PDF path) alongside the chat report; if that's unavailable, print the absolute path.

The PDF is the same report rendered for archiving — keep its data in lockstep with the chat output.
