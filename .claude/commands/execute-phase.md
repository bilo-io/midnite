---
description: Scan todo/ phases, pick an unblocked task, implement it in a worktree, open a PR, drive CI green, and merge.
argument-hint: "[optional: phase number or task hint to pre-select]"
allowed-tools: Bash, Read, Edit, Write, Glob, Grep, AskUserQuestion, TodoWrite, Agent, ToolSearch
---

You are driving the end-to-end "execute a phase" workflow for the **midnite** repo. Follow these stages in order. Do not skip the human decision point in Stage 2.

## Context you must respect

- Conventions live in `CLAUDE.md` (package boundaries, gateway layering, commit style, pre-push checks). Re-read the relevant bits before writing code.
- The `todo/` folder is the progress tracker. Layout: `done.md` (append-only log, most-recent first), `phase-N-*.md` (one per phase — outstanding checklist), `open-decisions.md`, `outstanding.md`. Conventions in `todo/README.md`.
- Status markers used in phase files: `- [ ]` outstanding, `- [x]` done, plus inline `✅ DONE`, `◐ PARTIAL`, `⏳ deferred`, `❌ OUT OF SCOPE`. Treat `OUT OF SCOPE` / `deferred` items as **not** candidates unless the user explicitly asks.
- Parallel work uses **git worktrees** nested under `.git/worktrees/<branch>/` (see CLAUDE.md "Worktrees"). Keep the primary checkout on its current branch as home base.
- **Web-test gotcha:** vitest/vite denies `.git/**`, so `web:test` cannot collect inside a `.git/worktrees/...` worktree. Run web tests (`moon run web:test`) from the **primary checkout** at `/Users/nova/Dev/midnite`, not from inside the worktree.

---

## 🔍 Stage 1 — Scan & summarize

1. Read every `todo/phase-*.md` file (and skim `open-decisions.md` + `outstanding.md` for blockers/dependencies). Read the files, don't guess from filenames.
2. **Check for open PRs** before recommending anything: `gh pr list --state open`. For each, note its branch, title, and which phase/item it covers. This avoids recommending work that's already in flight, and surfaces PRs that may need finishing/merging instead of starting something new. Call out any open PR in the digest.
3. For each phase produce a compact summary:
   - **Phase title + overall status** (e.g. "essentially complete", "in progress", "not started").
   - **Outstanding items** — the `- [ ]` boxes and `◐ PARTIAL` follow-ups that are still real work. Exclude anything marked `OUT OF SCOPE` or `deferred`.
   - **Blocked vs unblocked** — note any item whose dependency (called out in the doc, e.g. "blocked on A2", "free once B1 lands") is not yet satisfied. An item is **unblocked** when its prerequisites are already `✅ DONE`/merged. Also treat an item as **in flight** (not a fresh candidate) if an open PR from step 2 already covers it.
4. Present this as a tight per-phase digest. Give the whole digest a `#` H1 (e.g. `# 🔍 Phase scan`) and each phase its own `##` H2 with an emoji + succinct phase name. Keep it skimmable — bullets, not prose walls.

## 🗳️ Stage 2 — Recommend & let the user choose

1. From the unblocked outstanding items, pick the **3–4 strongest candidates** to act on next. Favor: items the phase doc itself flags as "recommended slice" / next-up; small, self-contained, high-value work; things that unblock other items.
2. Use the **AskUserQuestion** tool to present them as options (one question, the candidate tasks as options, recommended one first labeled "(Recommended)"). Each option label = the task; description = why it's a good next move + rough size (S/M/L from the doc) + which phase it's in.
3. If `$ARGUMENTS` named a specific phase or task, bias the recommendation toward it but still confirm the exact slice via the question.
4. **Do not start implementing until the user picks.** Wait for the answer.

## 🌳 Stage 3 — Set up the worktree

1. Derive a short kebab-case branch name from the chosen task, e.g. `feature/<slice-name>`.
2. From the primary checkout:
   ```bash
   git fetch origin
   git worktree add .git/worktrees/<branch-name> -b feature/<branch-name> origin/main
   cd .git/worktrees/<branch-name>
   pnpm install
   ```
   Branch from latest `origin/main` unless the user says otherwise.
3. Use a TodoWrite list to track the implementation sub-tasks for the chosen slice.

## 🛠️ Stage 4 — Implement

1. Implement strictly **according to the phase definition** for the chosen item — honor the decisions already recorded in the phase doc and `open-decisions.md`. If the doc rejected an approach (e.g. "no puppeteer"), don't reintroduce it.
2. Follow `CLAUDE.md`: package boundaries (`shared` is the contract), gateway layering (controller→service→repository), zod schemas in `shared` for anything over the wire, Drizzle for DB + forward-only migration, tests at each layer.
3. Write tests alongside the code (Vitest; React Testing Library for web).
4. Commit in small, conventional commits (`feat(...)`, `fix(...)`, etc.), scoped by package where useful. End each commit message with the required `Co-Authored-By` trailer.

## ✅ Stage 5 — Pre-push checks (green locally before the PR)

Run the pre-push gate. **Web tests must run from the primary checkout** (the `.git/worktrees` vite restriction):

```bash
moon run :typecheck
moon run :lint
moon run :test     # if this is blocked for web inside the worktree, run web:test from /Users/nova/Dev/midnite
```

Fix anything red before opening the PR. Don't push known-failing code.

## 🚀 Stage 6 — Open the PR

1. Push the branch and open a **draft PR** with `gh` against `main`.
2. Keep the PR body **basic and succinct** — a short *why* (not a wall of what), and a **link to the relevant phase doc and section**, e.g. `todo/phase-9-office-visual-overhaul.md#theme-g--agent-pool-was-lounge--swimming-pool` (GitHub anchors are the lower-cased heading with spaces→`-` and punctuation stripped). Reference the specific phase + item id. End the body with the `🤖 Generated with [Claude Code]` line.
3. **Give the user the PR URL** explicitly.

## 🧐 Stage 7 — Review the PR

1. After opening the PR, **review your own diff** with the phase definition and plan in mind — you are checking that the change actually delivers the chosen slice as the doc specifies, not just that it compiles. Use the `gh pr diff <number>` (or the worktree diff) as the source of truth.
2. Review against, in priority order:
   - **Fidelity to the phase doc** — does it implement what the chosen item describes, honor the recorded decisions (`open-decisions.md` + the phase's Decisions section), and stay in scope? Flag anything that drifts from the plan or reintroduces a rejected approach.
   - **`CLAUDE.md` conventions** — package boundaries (`shared` is the contract), gateway layering, zod-over-the-wire, Drizzle/forward-only migrations, naming/import/error style.
   - **Correctness & tests** — obvious bugs, missing edge cases, and whether tests cover the new behaviour at the right layer.
3. You may delegate this to a subagent (e.g. the `code-review` skill or an `Agent` review) but you remain responsible for the verdict. Keep it proportional to the slice size.
4. **Act on what you find**: fix material issues in the worktree, commit, and (re-)run the Stage 5 gate before pushing. If you find a real plan-level question you can't resolve, stop and ask the user. If the review is clean, say so and continue.

## 🟢 Stage 8 — Drive CI green

1. Poll the PR checks: `gh pr checks <number> --watch` (or repeated `gh pr checks`).
2. If all checks pass → go to Stage 9.
3. If any check **fails**: read the failing logs (`gh run view <run-id> --log-failed`), diagnose, fix in the worktree, commit, push, and re-poll. **Repeat until green.** Re-run the local pre-push gate before each push so you're not iterating through CI.
4. If a check is genuinely stuck/unfixable (flaky infra, external outage, or a failure that needs a product decision), stop and tell the user what's wrong rather than looping forever.

## 🎉 Stage 9 — Merge & wrap up

1. Once all checks are green, mark the PR ready and merge it (respect the repo's merge style; squash unless told otherwise): `gh pr ready <number>` then `gh pr merge <number> --squash --delete-branch`.
2. Update `todo/`: **move** the completed item(s) out of the phase file into `done.md` with today's date (per `todo/README.md` conventions) — don't just tick the box in place. Commit this on `main` (or as a tiny follow-up) if appropriate.
3. Once the PR has landed in `main`, tear down **both** the worktree and the branch from the primary checkout. `gh pr merge --delete-branch` removes the remote branch; you must also remove the worktree and the local branch:
   ```bash
   git worktree remove .git/worktrees/<branch-name>
   git branch -d feature/<branch-name>   # use -D if git refuses (e.g. squash-merge leaves it "unmerged")
   ```
   Confirm with `git worktree list` and `git branch` that neither remains.
4. **Print the wrap-up report** as structured markdown with headings + emoji:
   - A `#` H1 such as `# 🎉 Merged: <PR title>` linking the merged PR.
   - A `## 📊 Phase status — all phases` H2: after re-reading the updated `todo/` (the item you just moved is now in `done.md`), print **the total state of every phase** — one line per phase with an emoji status marker (✅ complete · 🔄 in progress · ⬜ not started) and a short count/summary of outstanding items. This is the whole-project snapshot, not just the phase you touched.
   - A `## ✨ Completed in this PR` H2: succinctly state what this last PR delivered — the todo item(s) that moved to `done.md`, the merged PR link, and the key changes.
   - A `## ⏭️ Next up` H2: the next logical unblocked task.

## ♻️ Stage 10 — Context hygiene & loop continuation

This stage matters most when this command is being run on a loop (e.g. `/loop /execute-phase`) so it keeps picking up the next task without a human re-triggering it each time.

1. After the Stage 9 wrap-up, **check how full the context window is** (use the context/token usage the harness surfaces — the auto-compact warning, the percentage in the status line, or your own estimate of how large the conversation has grown).
2. **If context usage is at or above 60%**, the next iteration must start from a clean slate:
   - Run `/clear` to reset the conversation context.
   - Then re-trigger this workflow exactly the way it was originally invoked — if it was started with `/loop /execute-phase`, restart that (`/loop /execute-phase`); if it was a bare `/execute-phase`, run `/execute-phase` again. Preserve any `$ARGUMENTS` that were passed in.
3. **If context usage is below 60%**, do **not** clear — just continue to the next iteration in the same session (pick the next unblocked task starting again from Stage 1).
4. The point is to avoid degrading on a bloated context across many phases: clear early enough that the fresh session has room to do real work, but don't clear needlessly when there's still plenty of headroom.

---

Be autonomous through Stages 3–10 once the user has chosen in Stage 2 — only stop to ask if you hit a real decision the user must make (an unresolved design question, a destructive/irreversible step, a plan-level issue surfaced in the Stage 7 review, or a CI failure you can't resolve).
