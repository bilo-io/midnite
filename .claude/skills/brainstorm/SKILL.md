---
name: brainstorm
description: Interactively brainstorm a brand-new todo/ phase — scan existing phases, show a status overview, riff on proposals together, then write the phase doc.
argument-hint: "[optional: a topic/theme to seed the new phase, e.g. 'mobile app' or 'observability']"
allowed-tools: Bash, Read, Write, Edit, Glob, Grep, AskUserQuestion, TodoWrite, Agent
---

You are running the **brainstorm** workflow for the **midnite** repo: an interactive, human-in-the-loop session that lands a **new `todo/phase-N-*.md`** plan. It's a back-and-forth — propose, let the user steer, refine over a few rounds, then write the doc. **Do not write the phase file until the user has converged on a direction** (Stage 5).

## Context you must respect

- Phase plans live in **`todo/`** (note: *not* `docs/todo/`), one file per phase: `phase-N-<slug>.md`. `docs/INITIAL_PLAN.md` is the design source of truth; `todo/README.md` has the conventions; `done.md` is the append-only completed log.
- Match the **house style** of the existing phase docs (read a couple first — e.g. [`todo/phase-9-office-visual-overhaul.md`](../../../todo/phase-9-office-visual-overhaul.md), [`todo/phase-11-public-site-rewrite.md`](../../../todo/phase-11-public-site-rewrite.md)): a `# Phase N — Title` heading; framing **blockquotes** up top (what this builds on + scope guardrails); **`S`/`M`/`L`** effort tags; work grouped into **Themes** with checkbox items; a **Files this phase touches** map; a **Verification** checklist; a **Decisions / open questions** section with recommendations.
- Respect `CLAUDE.md` (package boundaries, gateway layering, the "shared is the contract" rule) — proposals must fit the architecture, not fight it.
- **Checkboxes** start unchecked (`- [ ]`) in a fresh plan — this is net-new work, nothing is done yet.

---

## 🔭 Stage 1 — Scan & show the overview (do this BEFORE prompting for anything)

The scan is read-heavy — **every** `todo/phase-*.md` (a couple of dozen files) plus git/PR state — so **delegate it to a single read-only subagent** (e.g. the `Explore` agent) and keep the raw file dumps out of this conversation. You only need the digest it returns to render the table.

1. **Dispatch one scan subagent** with these instructions; have it return a structured per-phase digest:
   - Read **every** `todo/phase-*.md` (actually read them, don't guess from filenames) and skim `open-decisions.md` / `outstanding.md`. For each phase capture: number, title, a one-clause summary, theme spread, and the done-vs-outstanding split.
   - **Compute completion per phase:** count `- [x]`/`✅` (done) vs `- [ ]` (outstanding); `completion% = round(100 × done / (done + outstanding))`. **Exclude** items marked `OUT OF SCOPE` or `deferred`/`⏳` from the denominator (not in-scope work). A phase whose items are all `✅ DONE` is 100%.
   - **Gather git state** (part of the status picture — a phase may be further along than its checkboxes if work is committed-but-unmerged or in a PR): `git status --short`, `git branch --show-current`, `git log --oneline -15`, `gh pr list --state open`, `git worktree list`. If `gh` isn't available/authed, note it and fall back to branch + log only — don't fail. **Map each open PR / unmerged branch / worktree to the phase/theme it advances.**
   - **Return** structured text (not raw file contents): one row per phase — `{ number, title, summary, done%, doneCount, outstandingCount, inFlight: "PR #N" | branch | "—" }` — plus a git-state line (current branch, uncommitted-work flag, open-PR count) and the highest phase number seen.
2. **Print an overview table first thing** — before any question — from the digest, covering all phases:

   | Phase | Status | Summary | Done | In flight |
   |-------|--------|---------|------|-----------|
   | 0 · Scaffold | ✅ | Monorepo, moon/proto, package skeletons | 100% | — |
   | 8 · Office fidelity | 🔄 | Sprites + movement in; assets/Tiled pending | 60% | PR #21 |
   | 11 · Public site rewrite | ⬜ | Not started — plan only | 0% | — |

   - **Status icon:** `✅` complete (100%) · `🔄` in progress · `🟡` early/partial · `⬜` not started (0%). Where an open PR/branch advances a phase, prefer `🔄` + a "PR #N pending" note even if boxes aren't ticked yet.
   - **Summary:** one terse clause — what it is + where it stands.
   - **Done:** the computed completion %.
   - **In flight:** the PR/branch/worktree from the digest, else `—`.
   - Order by phase number. Keep it skimmable. Below the table, add the one-line **git note** (current branch + any uncommitted work + open-PR count) from the digest.
3. State the **next phase number** (max existing + 1) — that's the one we're about to brainstorm. If `$ARGUMENTS` named a topic, acknowledge it as the seed.

## 💡 Stage 2 — Seed 5 proposals

1. Propose **5 distinct directions** for the new phase. Each: a crisp name + a one-line pitch + rough size (S/M/L) + why it's worth doing now (what it builds on, what it unblocks). Favor things that fit the architecture and extend where the product already is — but range across different areas so the user has real choices.
2. If `$ARGUMENTS` seeded a topic, make the 5 proposals **variations/angles on that topic**; otherwise spread them across the product (gateway, web, office, CLI, infra/testing, docs, new surfaces).
3. Use **AskUserQuestion** to present the 5 as options (the recommended one first, labeled "(Recommended)"). The tool always offers an **"Other"** choice — and **explicitly invite the user to combine, extend, or replace** any proposal with their own idea. This "add something on top of / in addition to" option must always be available, every round.

## 🔁 Stage 3 — Hone in (a few back-and-forths)

1. Take the user's pick (or their custom/combined idea) and **go deeper**: sketch the themes it would contain, surface trade-offs, name the risky/unknown bits, and propose what's in vs. out of scope.
2. Keep it conversational and **iterate over a few rounds**, asking **5–7 follow-up questions** in total to pin down the shape — scale toward 5 for a small/simple phase and toward 7 for a complex one or a meaty multi-theme brainstorm. Each round, refine the shape and re-offer choices via AskUserQuestion (e.g. "which themes are in scope?", "how far do we take X?"). **Every round, keep the "suggest your own / add to this" door open** — never force a choice from only your options.
3. Pull in concrete repo detail to keep proposals honest — themes must reference real modules, not hand-waving. For a quick check, grep/read inline; when grounding a direction needs more than a glance, **dispatch a focused read-only subagent** (e.g. `Explore`) to research that area and return just the honest detail (real module names, boundaries, existing patterns) rather than reading swathes of code in this thread. Flag anything that would violate `CLAUDE.md` boundaries and adjust.
4. Converge when the scope, themes, and the big open decisions are clear enough to write down. Don't over-iterate — a few solid rounds, then move on.

## ✍️ Stage 4 — Confirm before writing

1. Play back a tight summary: **phase title, the themes (with S/M/L), what's explicitly out of scope, and the key open decisions** (with your recommendations).
2. Confirm the **phase number + filename slug** (`phase-N-<kebab-slug>.md`).
3. Get a clear go-ahead. If the user still wants changes, loop back to Stage 3.

## 📝 Stage 5 — Write the phase doc

1. Write `todo/phase-N-<slug>.md`, matching the house style (see Stage 1 context): `# Phase N — Title`, framing blockquotes (build-on + scope guardrails + an effort-tag legend), **Themes** with `- [ ]` checklist items and S/M/L tags, a **Files this phase touches** map (link real paths with markdown links), a **Verification** checklist, and **Decisions / open questions** capturing what came up in the brainstorm (with your recommendations; mark any the user already settled as resolved).
2. Use clickable markdown links for file/section references (relative paths), per this repo's convention.
3. **Do not** mark anything done, and **do not** touch `done.md` (nothing's built yet). Don't start implementing — this command only produces the plan.
4. **Register the phase in [`todo/_INDEX.md`](../../../todo/_INDEX.md) — required.** The index is the roll-up `/exec` scans to pick work; a phase that isn't in it is invisible (and `/exec` has no row to bump when a theme later lands). Add both:
   - A **new row at the TOP of the `## Phases` table** (the table is newest-first — highest phase number first): `| [N · Title](phase-N-<slug>.md) | ◻ TODO | 0/<total> | \`░░░░░░░░░░\` | 0% | — | <all theme letters> |`, where `<total>` is the count of `- [ ]` items you just wrote and **every** theme letter goes in the `◻ TODO` column (nothing WIP or done yet).
   - A **new section at the TOP of the `## Theme key`** list: `### [Phase N — Title](phase-N-<slug>.md)`, an optional one-line italic framing, then one `- ◻ **X** — <one-liner>` per theme (mirroring the checklist).
   - If the new phase changes the "live frontier" summary, update the **Headline** paragraph too.

## ✅ Stage 6 — Commit to main & clean up

The new plan is a doc-only change and belongs in the **source of truth**, so commit it to `main` automatically (no PR needed — this matches how the other phase docs land; CLAUDE.md allows committing trivial doc changes straight to `main`).

1. **Land it on `main`.** Ensure you're committing against `main` (if the session is on a feature branch/worktree, switch to or target the primary checkout's `main`). Stage **both tracker files by explicit path** — `git add todo/phase-N-<slug>.md todo/_INDEX.md` (the new doc **and** its index row/theme-key entry from Stage 5.4) — never `git add -A`/`.` (it can sweep unrelated or worktree-admin files). Commit with a conventional message ending in the required trailer:
   ```
   docs: add phase-N <slug> plan (+ index row)

   Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>
   ```
   Then `git push origin main`. (If the push races another loop's `_INDEX.md` edit: `git pull --rebase origin main`, reconcile the table, re-push.)
2. **Clean up before continuing.** Remove any scratch/intermediate files the brainstorm created, and confirm a clean state with `git status` — the working tree should be clean, and both the new doc **and** its `_INDEX.md` row present on `main` (and pushed). If anything unexpected is staged or dirty, stop and show the user rather than committing it.
3. Tell the user the file path + the commit/push result, give a 2–3 line recap, and suggest that `/exec` is how they'd later pick up a slice of it.

---

Be genuinely collaborative through Stages 2–4 — your job is to help the user *think*, not to railroad them to your favorite idea. Only reach Stage 5 once they've clearly converged, and only commit (Stage 6) once the doc is written.
