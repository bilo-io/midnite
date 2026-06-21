---
name: brainstorm
description: Interactively brainstorm a brand-new todo/ phase — scan existing phases, show a status overview, riff on proposals together, then write the phase doc.
argument-hint: "[optional: a topic/theme to seed the new phase, e.g. 'mobile app' or 'observability']"
allowed-tools: Bash, Read, Write, Edit, Glob, Grep, AskUserQuestion, TodoWrite
---

You are running the **brainstorm** workflow for the **midnite** repo: an interactive, human-in-the-loop session that lands a **new `todo/phase-N-*.md`** plan. It's a back-and-forth — propose, let the user steer, refine over a few rounds, then write the doc. **Do not write the phase file until the user has converged on a direction** (Stage 5).

## Context you must respect

- Phase plans live in **`todo/`** (note: *not* `docs/todo/`), one file per phase: `phase-N-<slug>.md`. `docs/INITIAL_PLAN.md` is the design source of truth; `todo/README.md` has the conventions; `done.md` is the append-only completed log.
- Match the **house style** of the existing phase docs (read a couple first — e.g. [`todo/phase-9-office-visual-overhaul.md`](../../../todo/phase-9-office-visual-overhaul.md), [`todo/phase-11-public-site-rewrite.md`](../../../todo/phase-11-public-site-rewrite.md)): a `# Phase N — Title` heading; framing **blockquotes** up top (what this builds on + scope guardrails); **`S`/`M`/`L`** effort tags; work grouped into **Themes** with checkbox items; a **Files this phase touches** map; a **Verification** checklist; a **Decisions / open questions** section with recommendations.
- Respect `CLAUDE.md` (package boundaries, gateway layering, the "shared is the contract" rule) — proposals must fit the architecture, not fight it.
- **Checkboxes** start unchecked (`- [ ]`) in a fresh plan — this is net-new work, nothing is done yet.

---

## 🔭 Stage 1 — Scan & show the overview (do this BEFORE prompting for anything)

1. Read **every** `todo/phase-*.md` (read them, don't guess from filenames) and skim `open-decisions.md` / `outstanding.md`. Note each phase's title, theme spread, and how much is done vs outstanding.
2. **Check the git state** — it's part of the status picture (a phase may be further along than its checkboxes show if work is committed-but-unmerged or sitting in a PR). Run:
   - `git status --short` + `git branch --show-current` — current branch and any uncommitted/untracked work.
   - `git log --oneline -15` — recent merges, to corroborate what's actually landed.
   - `gh pr list --state open` (and `git worktree list`) — **open PRs / active worktrees**. For each open PR, note its title, branch, and which phase/theme it advances.
   - If `gh` isn't available/authed, say so and fall back to branch + log only — don't fail the command.
3. **Compute completion** per phase: count the checklist items — `- [x]` (done) and `- [ ]` (outstanding). `completion% = round(100 × done / (done + outstanding))`. Exclude items explicitly marked `OUT OF SCOPE` or `deferred`/`⏳` from the denominator (they're not in-scope work). A phase whose items are all `✅ DONE` is 100%. Where an open PR or unmerged branch clearly advances a phase, reflect it (e.g. an `🔄` icon + a "PR #N pending" note) even if the boxes aren't ticked yet.
4. **Print an overview table first thing** — before any question — covering all phases:

   | Phase | Status | Summary | Done | In flight |
   |-------|--------|---------|------|-----------|
   | 0 · Scaffold | ✅ | Monorepo, moon/proto, package skeletons | 100% | — |
   | 8 · Office fidelity | 🔄 | Sprites + movement in; assets/Tiled pending | 60% | PR #21 |
   | 11 · Public site rewrite | ⬜ | Not started — plan only | 0% | — |

   - **Status icon:** `✅` complete (100%) · `🔄` in progress · `🟡` early/partial · `⬜` not started (0%).
   - **Summary:** one terse clause — what it is + where it stands.
   - **Done:** the computed completion %.
   - **In flight:** any open PR / unmerged branch / worktree touching that phase (from step 2), else `—`.
   - Order by phase number. Keep it skimmable. Below the table, add a one-line **git note** (current branch + any uncommitted work + open-PR count) so the overall state is clear at a glance.
5. State the **next phase number** (max existing + 1) — that's the one we're about to brainstorm. If `$ARGUMENTS` named a topic, acknowledge it as the seed.

## 💡 Stage 2 — Seed 5 proposals

1. Propose **5 distinct directions** for the new phase. Each: a crisp name + a one-line pitch + rough size (S/M/L) + why it's worth doing now (what it builds on, what it unblocks). Favor things that fit the architecture and extend where the product already is — but range across different areas so the user has real choices.
2. If `$ARGUMENTS` seeded a topic, make the 5 proposals **variations/angles on that topic**; otherwise spread them across the product (gateway, web, office, CLI, infra/testing, docs, new surfaces).
3. Use **AskUserQuestion** to present the 5 as options (the recommended one first, labeled "(Recommended)"). The tool always offers an **"Other"** choice — and **explicitly invite the user to combine, extend, or replace** any proposal with their own idea. This "add something on top of / in addition to" option must always be available, every round.

## 🔁 Stage 3 — Hone in (a few back-and-forths)

1. Take the user's pick (or their custom/combined idea) and **go deeper**: sketch the themes it would contain, surface trade-offs, name the risky/unknown bits, and propose what's in vs. out of scope.
2. Keep it conversational and **iterate over a few rounds** — each round, refine the shape and re-offer choices via AskUserQuestion (e.g. "which themes are in scope?", "how far do we take X?"). **Every round, keep the "suggest your own / add to this" door open** — never force a choice from only your options.
3. Pull in concrete repo detail to keep proposals honest — grep/read the relevant files so themes reference real modules, not hand-waving. Flag anything that would violate `CLAUDE.md` boundaries and adjust.
4. Converge when the scope, themes, and the big open decisions are clear enough to write down. Don't over-iterate — a few solid rounds, then move on.

## ✍️ Stage 4 — Confirm before writing

1. Play back a tight summary: **phase title, the themes (with S/M/L), what's explicitly out of scope, and the key open decisions** (with your recommendations).
2. Confirm the **phase number + filename slug** (`phase-N-<kebab-slug>.md`).
3. Get a clear go-ahead. If the user still wants changes, loop back to Stage 3.

## 📝 Stage 5 — Write the phase doc

1. Write `todo/phase-N-<slug>.md`, matching the house style (see Stage 1 context): `# Phase N — Title`, framing blockquotes (build-on + scope guardrails + an effort-tag legend), **Themes** with `- [ ]` checklist items and S/M/L tags, a **Files this phase touches** map (link real paths with markdown links), a **Verification** checklist, and **Decisions / open questions** capturing what came up in the brainstorm (with your recommendations; mark any the user already settled as resolved).
2. Use clickable markdown links for file/section references (relative paths), per this repo's convention.
3. **Do not** mark anything done, and **do not** touch `done.md` (nothing's built yet). Don't start implementing — this command only produces the plan.

## ✅ Stage 6 — Commit to main & clean up

The new plan is a doc-only change and belongs in the **source of truth**, so commit it to `main` automatically (no PR needed — this matches how the other phase docs land; CLAUDE.md allows committing trivial doc changes straight to `main`).

1. **Land it on `main`.** Ensure you're committing against `main` (if the session is on a feature branch/worktree, switch to or target the primary checkout's `main`). Stage **only the new doc by explicit path** — `git add todo/phase-N-<slug>.md` — never `git add -A`/`.` (it can sweep unrelated or worktree-admin files). Commit with a conventional message ending in the required trailer:
   ```
   docs: add phase-N <slug> plan

   Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>
   ```
   Then `git push origin main`.
2. **Clean up before continuing.** Remove any scratch/intermediate files the brainstorm created, and confirm a clean state with `git status` — the working tree should be clean and the new doc present on `main` (and pushed). If anything unexpected is staged or dirty, stop and show the user rather than committing it.
3. Tell the user the file path + the commit/push result, give a 2–3 line recap, and suggest that `/exec` is how they'd later pick up a slice of it.

---

Be genuinely collaborative through Stages 2–4 — your job is to help the user *think*, not to railroad them to your favorite idea. Only reach Stage 5 once they've clearly converged, and only commit (Stage 6) once the doc is written.
