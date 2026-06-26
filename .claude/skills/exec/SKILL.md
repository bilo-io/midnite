---
name: exec
description: Pick an unblocked todo/ task, build it in a worktree, screenshot visual changes with Playwright, open a PR, drive CI green, merge.
argument-hint: "[optional: phase number or task hint]"
allowed-tools: Bash, Read, Edit, Write, Glob, Grep, AskUserQuestion, TodoWrite, Agent, ToolSearch
---

End-to-end "execute a phase slice" for **midnite**.

**Conversation style — enforced.** Be terse to save time and tokens. No preamble, no recap of these instructions, no narrating what you're *about* to do. Report results, not intentions; bullets over prose. Stay silent on no-op stages. Spend tokens on code, diffs, and decisions — not commentary.

## Respect
- `CLAUDE.md` = conventions (package boundaries, gateway layering, commit style, pre-push gate). Re-read the relevant bits before coding.
- `todo/` = tracker: **`_INDEX.md` (the roll-up you scan first — phase status, progress, `🔄 WIP`/`◻ TODO` themes)**, `phase-N-*.md` (open checklist per phase), `done.md` (append-only, newest first), `open-decisions.md`, `outstanding.md`; rules in `todo/README.md`. Markers: `- [ ]` open · `- [x]`/`✅` done · `◐ PARTIAL` · `⏳ deferred` · `❌ OUT OF SCOPE`. Never pick `deferred`/`OUT OF SCOPE` unless told. `_INDEX.md` is the source of truth for what's claimed/in-flight — keep it current (Stages 2.7 + 10).
- Parallel work → git worktrees under `.git/worktrees/<branch>/`; keep the primary checkout (`/Users/nova/Dev/midnite`) as home base.
- **Web tests can't run inside a `.git/worktrees` worktree** (vite denies `.git/**`) — run `moon run web:test` from the primary checkout.

## 1 · Scan
Read **[`todo/_INDEX.md`](../../../todo/_INDEX.md)** — the roll-up of every phase's status, progress, and which themes are `🔄 WIP` / `◻ TODO`. **Do not** read every `phase-*.md`; that's what the index replaces (saves context). Only open the individual `phase-N-*.md` for the **candidate phases** you're about to propose, to read the open theme detail. Skim `open-decisions.md`/`outstanding.md` if relevant. `gh pr list --state open` + the index's `🔄 WIP` column — anything in flight or already claimed isn't a fresh candidate. Emit a tight digest of the few candidate phases + their real open themes.

## 2 · Choose — STOP for the human
Pick the 3–4 strongest **unblocked** candidates (favor: doc-flagged "next" slices; small/self-contained/high-value; unblockers). Assign each a t-shirt size and **include it directly in the option label**: `<Task name> [<size> · <time>]`.

| Size | Time |
|------|------|
| `[XS]` | < 30 min |
| `[S]` | 30 min – 2 h |
| `[M]` | 2 – 4 h |
| `[L]` | 4 – 8 h |
| `[XL]` | 1 – 2 d |
| `[XXL]` | 2 – 5 d |
| `[XXXL]` | 5 + d |

Example label: `Phase 9 E4: Retro games modal [M · 2-4h]`

Present via **AskUserQuestion**, recommended first. Bias toward `$ARGUMENTS` if given. **Do not implement until they pick.**

## 2.5 · Upfront decisions — STOP for the human
Before touching code, identify the **3 most consequential design decisions** for the chosen task (data flow, persistence strategy, component shape, API contract, etc.). Present each as a separate **AskUserQuestion**. For every option include:
- A **dominant-nature tag** in brackets: `[planned]` (matches the phase doc) · `[recommended]` (fits existing patterns) · `[performance]` · `[simplicity]` · `[DX]` · `[future-proof]` · `[minimal]` · `[scope+]` (expands scope) — pick whichever single tag best characterises the option.
- The **effort size** for that option.

Example option label: `Zustand store [recommended · S]`
Example option label: `Local component state [simplicity · XS]`
Example option label: `Server-side with SWR polling [performance · M]`

Skip any decision already unambiguously settled in the phase doc or `open-decisions.md`. **Do not implement until all three are answered.**

## 2.6 · Rename session
Once the task is chosen, immediately set the terminal/session title so Claude Desktop shows what's in flight:
1. Extract the phase number from the doc filename (`phase-<N>-*.md` → `<N>`).
2. Extract the task label (the letter or sub-item tag — e.g. `A`, `B`, `C`; fall back to a short slug if no letter exists).
3. Run: `printf '\033]0;Loop: exec Phase %s - %s\007' "<N>" "<label>"` — this updates the terminal title that Claude Desktop surfaces for the session.

## 2.7 · Claim the theme(s) on `main` — before the worktree
So parallel `/exec` loops don't grab the same slice, **claim it in the index first**:
1. In **[`todo/_INDEX.md`](../../../todo/_INDEX.md)**, move the chosen theme letter(s) for that phase from the `◻ TODO` column into the `🔄 WIP` column (flip the row's **Status** to `🔄 WIP` if it wasn't already).
2. Commit **straight to `main`** and push immediately:
   ```bash
   git add todo/_INDEX.md
   git commit -m "chore(todo): claim Phase <N> Theme <X> (WIP)"
   git push origin main
   ```
   (Small index-only touch-up → committing to `main` is sanctioned by `CLAUDE.md`. If the push races another loop: `git pull --rebase origin main` and re-push.)

The claim must land on `main` **before** Stage 3 so the worktree branches from a tip that already carries it.

## 3 · Worktree
```bash
git fetch origin                                    # picks up the WIP claim from 2.7
git worktree add .git/worktrees/<slice> -b feature/<slice> origin/main
cd .git/worktrees/<slice> && pnpm install
```
Track sub-tasks with TodoWrite.

## 4 · Build
- Implement to the **phase doc + recorded decisions** — don't drift scope or reintroduce a rejected approach.
- Follow `CLAUDE.md` (shared = contract; controller→service→repository; zod over the wire; Drizzle forward-only).
- **Tests ship with the change, not after:**
  - Logic → Vitest at the right layer (RTL for web components).
  - **Visual or flow change → add/extend the Playwright suite** (specs under `packages/web/e2e/`; scaffold a minimal `playwright.config.ts` if none exists yet) so the new/updated feature is genuinely covered.
- Small conventional commits, each ending with the required `Co-Authored-By` trailer.

## 5 · Screenshots — whenever the change is visual
Capture **before/after with Playwright** against the running app (`moon run web:dev`; `pnpm exec playwright install chromium` if the browser is missing). Save PNGs to a temp dir.
- **Always show them in this thread** when there's a visual change — read the PNGs so they render inline.
- The same shots go into the PR body (Stage 7).

## 6 · Pre-push gate
```bash
moon run :typecheck && moon run :lint && moon run :test   # web:test from the primary checkout (gotcha above)
```
All green before pushing — never push red.

## 7 · Open the PR (draft) + report it
- Push branch; `gh pr create --draft --base main`.
- **PR title:** `<conventional-commit-title> [<size> · <time>]` — append the size and time estimate from Stage 2, e.g. `feat(web): add retro games modal [M · 2-4h]`.
- **PR body:** succinct *why* (not a wall of what) · a **link to the phase doc + section** (anchor = lower-cased heading, spaces→`-`, punctuation stripped) and the phase/item id · **embedded screenshots** for any visual change · the `🤖 Generated with [Claude Code]` trailer. To embed shots: commit the PNGs on the branch under `docs/screenshots/<slice>/` and reference them with **commit-pinned** raw URLs (`https://github.com/<owner>/<repo>/raw/<sha>/docs/screenshots/...`) so they survive a squash-merge + branch delete.
- **Report in this thread when posted:** the PR URL · a 3–5 **bullet** summary of what was done · the line diff in a ` ```diff ` fenced block (`gh pr diff <n> --patch`, trimmed to the meaningful hunks) · the screenshots again if the change was visual.

## 8 · Review your own diff
Against, in order: fidelity to the phase doc/decisions → `CLAUDE.md` conventions → correctness & test coverage. May delegate to `code-review`/an Agent; you own the verdict. Fix material issues, re-run Stage 6, push. Stop and ask only on a real plan-level question.

## 9 · CI green
`gh pr checks <n> --watch`. On failure: `gh run view <id> --log-failed` → fix in the worktree → re-run the local gate → push → repeat until green. If genuinely stuck (flaky infra, outage, product call), stop and say what's wrong.

## 10 · Merge & wrap
- **Update the trackers in the branch first, so the merge auto-publishes them** (don't wait to do this on `main` afterward):
  - **Phase doc** (`phase-<N>-*.md`): mark the theme/items done (`✅ DONE (PR #<n>, <date>)`) and **move** the completed `- [ ]` items into `done.md` (today's date, per `todo/README.md`) — don't just tick in place.
  - **[`todo/_INDEX.md`](../../../todo/_INDEX.md)**: remove the theme letter(s) from the `🔄 WIP` column (the claim from 2.7), bump the row's `Done`/`Progress`/`%` cells, and flip **Status** to `✅ COMPLETE` once every theme of the phase is done. Update the `## Theme key` entry (`◻`→`✅`) too.
  - Commit these on the branch (`docs(todo): ...`) so the squash-merge lands docs + index + code together.
- If the branch is behind `main`, rebase it first: `git rebase origin/main` in the worktree, then force-push (`git push --force-with-lease`). If the tracker files conflict with another loop's merge, take both sides (keep every `done.md` entry; reconcile the `_INDEX.md` cells) — see the parallel-agent conflict gotchas in memory.
- `gh pr ready <n>` → `gh pr merge <n> --squash --delete-branch`. **Always squash. Only use a merge commit if squash is genuinely impossible (e.g. protected-branch rules outside our control).** The merge now carries the doc + index updates — no separate `main` commit needed for trackers.
- Teardown: `git worktree remove .git/worktrees/<slice>` + `git branch -d feature/<slice>` (`-D` if a squash leaves it "unmerged"); confirm with `git worktree list`.
- Wrap-up (terse markdown): `# 🎉 Merged: <title>` (linked) · `## 📊 Phase status` (every phase: ✅/🔄/⬜ + outstanding count) · `## ✨ This PR` (what landed + link) · `## ⏭️ Next up`.

## 11 · Compact & loop hygiene
**Always `/compact` once the wrap-up is posted** — every run, loop or not. Pass instructions so it keeps **only** the durable ledger and drops the rest:

```
/compact Keep ONLY: for each task tackled this session, its phase/theme id + one-line title and the merged PR link (and its CI/merge status). Drop everything else — file contents, diffs, screenshots, tool output, command logs, intermediate reasoning, scan digests. The retained summary is just a list of "Phase <N> Theme <X>: <title> — <PR url>" lines.
```

Then:
- **On `/loop`** → re-invoke exactly as launched (`/loop /exec` or `/exec`, preserving `$ARGUMENTS`) and start again from Stage 1 on the next unblocked task. Re-run Stage 2.6 as soon as the next task is chosen so the session title stays current.
- **One-shot** → stop after the compaction; the compacted ledger is the final state.

The compacted carry-over is the running record of what this session shipped — task ids + PR links, nothing heavier.

---
Autonomous through Stages 3–11 once the user has chosen in Stage 2. Stop only for a real decision: an unresolved design question, a destructive/irreversible step, a plan-level issue from Stage 8, or CI you can't fix.
