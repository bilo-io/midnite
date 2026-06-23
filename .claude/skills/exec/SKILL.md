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
- `todo/` = tracker: `phase-N-*.md` (open checklist), `done.md` (append-only, newest first), `open-decisions.md`, `outstanding.md`; rules in `todo/README.md`. Markers: `- [ ]` open · `- [x]`/`✅` done · `◐ PARTIAL` · `⏳ deferred` · `❌ OUT OF SCOPE`. Never pick `deferred`/`OUT OF SCOPE` unless told.
- Parallel work → git worktrees under `.git/worktrees/<branch>/`; keep the primary checkout (`/Users/nova/Dev/midnite`) as home base.
- **Web tests can't run inside a `.git/worktrees` worktree** (vite denies `.git/**`) — run `moon run web:test` from the primary checkout.

## 1 · Scan
Read every `todo/phase-*.md` (skim `open-decisions.md`/`outstanding.md`). `gh pr list --state open` — anything in flight isn't a fresh candidate. Emit a tight per-phase digest: `#` H1, `##` per phase + status + the real open items.

## 2 · Choose — STOP for the human
Pick the 3–4 strongest **unblocked** candidates (favor: doc-flagged "next" slices; small/self-contained/high-value; unblockers). For **each candidate** assign a t-shirt size estimate and show it in brackets after the label:

| Size | Time |
|------|------|
| `[XS]` | < 30 min |
| `[S]` | 30 min – 2 h |
| `[M]` | 2 – 4 h |
| `[L]` | 4 – 8 h |
| `[XL]` | 1 – 2 d |
| `[XXL]` | 2 – 5 d |
| `[XXXL]` | 5 + d |

Present via **AskUserQuestion**, recommended first. Bias toward `$ARGUMENTS` if given. **Do not implement until they pick.**

## 3 · Worktree
```bash
git fetch origin
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
- If the branch is behind `main`, rebase it first: `git rebase origin/main` in the worktree, then force-push (`git push --force-with-lease`).
- `gh pr ready <n>` → `gh pr merge <n> --squash --delete-branch`. **Always squash. Only use a merge commit if squash is genuinely impossible (e.g. protected-branch rules outside our control).**
- **Move** the done item(s) from the phase file into `done.md` (today's date, per `todo/README.md`) — don't just tick in place. Commit on `main`.
- Teardown: `git worktree remove .git/worktrees/<slice>` + `git branch -d feature/<slice>` (`-D` if a squash leaves it "unmerged"); confirm with `git worktree list`.
- Wrap-up (terse markdown): `# 🎉 Merged: <title>` (linked) · `## 📊 Phase status` (every phase: ✅/🔄/⬜ + outstanding count) · `## ✨ This PR` (what landed + link) · `## ⏭️ Next up`.

## 11 · Loop hygiene (only when run on `/loop`)
After wrap-up, check context usage. **≥60% → `/clear`, then re-invoke exactly as launched** (`/loop /exec` or `/exec`, preserving `$ARGUMENTS`). **<60% → continue in-session** from Stage 1 on the next unblocked task.

---
Autonomous through Stages 3–11 once the user has chosen in Stage 2. Stop only for a real decision: an unresolved design question, a destructive/irreversible step, a plan-level issue from Stage 8, or CI you can't fix.
