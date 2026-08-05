---
name: exec-issue
description: Triage the public bilo-io/midnite-app issue board, recommend the highest-impact issue (plus 3 alternatives), agree a fix plan interactively, then build it in a worktree and open a linked PR. Stops at the PR — never merges.
argument-hint: "[optional: issue number, label, or keyword]"
allowed-tools: Bash, Read, Edit, Write, Glob, Grep, AskUserQuestion, TodoWrite, Agent, ToolSearch
---

End-to-end "fix a reported issue" for **midnite**, driven by the **public** issue board.

**Conversation style — enforced.** Be terse to save time and tokens. No preamble, no recap of these instructions, no narrating what you're *about* to do. Report results, not intentions; bullets over prose. Stay silent on no-op stages. Spend tokens on the root cause, the diff, and the decisions — not commentary.

## The two-repo split — read this first
- **Issues live in `bilo-io/midnite-app`** (PUBLIC — desktop downloads + issue tracker only, no source). Reports arrive from the in-app reporter (see [`docs/REPORT_ISSUE.md`](../../../docs/REPORT_ISSUE.md)) carrying an **Environment** table: Page (route), Version, Environment (web/desktop), Browser/OS, Viewport, Theme, Connection. That table is your reproduction recipe.
- **Code lives in `bilo-io/midnite`** (PRIVATE — this checkout). Every fix, PR, and test lands here.
- **Consequences you must not forget:**
  - Closing keywords (`Fixes #N`) are **same-repo only** — a PR here can never auto-close a `midnite-app` issue.
  - A cross-visibility reference from a private repo does **not** show up on the public issue. GitHub hides it. **The only thing the reporter ever sees is a comment you write by hand.**
  - So: comment the claim on the issue (Stage 4) and comment + close it after merge (Stage 12) — manually, always.
- Every `gh` call against the tracker needs `--repo bilo-io/midnite-app`; bare `gh` in this checkout hits the private repo.
- If `gh` says *"Could not resolve repository"*, the active account flipped: `gh auth switch --user bilo-io`.

## Respect
- `CLAUDE.md` = conventions (package boundaries, gateway layering, commit style, pre-push gate). Re-read the relevant bits before coding.
- Parallel work → git worktrees in the repo-root **`.worktrees/<branch>/`** dir (git-ignored; **never** under `.git/` — that path gets pruned by parallel `git worktree` runs and Vite denies `.git/**`). Keep the primary checkout (`/Users/bilolwabona/Dev/midnite`) as home base; it can silently revert uncommitted edits, so all multi-file work happens in the worktree.
- **`.worktrees/` is outside `.git/`, so `moon run web:test` (and the full `moon run :test`) run fine inside the worktree.**
- `todo/` is the *roadmap* tracker and is **not** the driver here — the issue board is. Only touch `todo/` if the fix happens to close out an existing phase item, and say so if it does.

## 1 · Scan the board
```bash
gh issue list --repo bilo-io/midnite-app --state open --limit 50 \
  --json number,title,labels,createdAt,updatedAt,comments,author,url
```
Then read the **body** of every plausible candidate (`gh issue view <n> --repo bilo-io/midnite-app --comments`) — the Environment table and the reporter's words are the whole signal.

Filter out, silently:
- `wontfix` · `duplicate` · `invalid` · `question` with no defect behind it.
- **Already claimed / in flight.** Check both sides: a claim comment on the issue, *and* an open PR here that names it — `gh pr list --state open --search "midnite-app#<n>"` plus a plain `gh pr list --state open` skim. A claim comment is **not a lock**: re-check recently merged PRs (`gh pr list --state merged --limit 15`) before starting, since a parallel session may have already shipped it.
- Anything already fixed on `main` but not yet released — verify against the code before believing a stale report. Say so and move on if that's the case.

Emit a tight digest: one line per surviving candidate (`#N · title · labels · age · reporter signal`).

## 2 · Score for impact
Rank candidates on, in order of weight:
1. **Correctness/trust** — does it show users *wrong data* or lose their work? (A widget reporting false numbers is worse than one that looks off.)
2. **Blast radius** — how many users / how central is the surface? A crash or an always-visible surface beats a corner case behind a flag.
3. **Frequency** — every session vs. rarely.
4. **Fix confidence × cost** — a well-understood one-file fix with a clear test beats a speculative refactor of equal notional value. Prefer landing real value today.
5. **Reporter cost** — a public report left silent for weeks is a trust cost of its own.

Deprioritise: cosmetic-only nits, anything needing a product decision you can't make, anything whose root cause you can't locate in this pass.

Assign each a t-shirt size:

| Size | Time |
|------|------|
| `[XS]` | < 30 min |
| `[S]` | 30 min – 2 h |
| `[M]` | 2 – 4 h |
| `[L]` | 4 – 8 h |
| `[XL]` | 1 – 2 d |

## 3 · Choose — STOP for the human
Present via **AskUserQuestion**: **exactly 4 options** — your highest-impact recommendation **first**, then 3 genuine alternatives (vary the shape: a quick win, a different surface, a bigger swing — not three near-clones of the top pick).

- **Label:** `#<N> <short title> [<size> · <time>]` — e.g. `#3 RAM widget reports wrong numbers [S · 30m-2h]`
- **Description:** the impact case in one line + why this size (`wrong data on the dashboard, every session · one hook + a unit test`).

Mark the recommendation `(Recommended)` and say in one line *why it beats the others*. Bias toward `$ARGUMENTS` if given (an issue number there means: still show the sheet, but that issue is the recommendation unless it's genuinely unfixable — say so if it is). **Do not touch code until they pick.**

## 4 · Claim it — before the worktree
1. Rename the session so it's visible in Claude Desktop:
   ```bash
   printf '\033]0;Loop: exec-issue #%s - %s\007' "<N>" "<short-slug>"
   ```
2. Claim on the **public** issue (this is also the reporter's first sign of life — write it for them, not for us):
   ```bash
   gh issue comment <N> --repo bilo-io/midnite-app \
     --body "Picking this up now — will report back with the fix. Thanks for the detailed report."
   gh issue edit <N> --repo bilo-io/midnite-app --add-label "size/<S>"   # create the label first if absent
   ```
   Add the label only if it exists or you create it (`gh label create size/M --repo bilo-io/midnite-app --color 5D9801`); never let a missing label abort the run.
3. Don't self-assign unless the user asks — the board is public and assignment reads as a commitment.

## 5 · Reproduce & find the root cause — before any plan
This is the stage that makes or breaks the fix. **Do not plan a fix you can't explain.**
- Replay the Environment table: the `Page` value is the route, so start at that page's component tree. `Environment: desktop` vs `web` decides whether the bug can even live in `packages/desktop`.
- Locate the real code (Grep/Glob, or delegate a search to an `Explore` agent when the surface is unclear — but you own the conclusion).
- For a wrong-data bug, find where the number is *produced*, not where it's rendered. Check the source: OS/API semantics (e.g. macOS "free" vs "available" memory), unit conversions, cached values, mocked fallbacks left in from development.
- **Report the root cause in this thread in 2–4 bullets, with `file:line` refs, before Stage 6.** If you genuinely can't find it, stop and say so, with what you ruled out — a wrong fix on a public issue is worse than an honest "needs more digging".

## 6 · Plan — STOP for the human
Present the consequential choices as separate **AskUserQuestion** calls. **Minimum 3; use 5+ for anything `[M]` or larger, or when the fix touches a contract in `shared`.** Always include:
- **Fix approach** — the competing ways to correct the root cause (the cheap patch vs. the correct-at-the-source fix). Never hide the honest tradeoff.
- **Scope boundary** — fix only the reported symptom, or the whole class of it (sibling widgets/routes with the same bug)? Say which siblings you found.
- **Test proof** — what test pins it, at which layer.

Then, as the task warrants: data source / permission + failure UX (e.g. a denied geolocation prompt), fallback behaviour, contract change in `shared`, migration need, config surface in `midnite.json`, i18n of any new copy.

Tag every option with a **dominant nature** and its size:
- `[recommended]` (fits existing patterns) · `[correctness]` · `[simplicity]` · `[minimal]` · `[performance]` · `[DX]` · `[future-proof]` · `[scope+]`

Example labels: `Read available memory from vm_stat [correctness · S]` · `Scale the existing value by a constant [minimal · XS]`

Track the agreed plan with TodoWrite. **Do not implement until every question is answered.**

## 7 · Worktree
```bash
git fetch origin
git worktree add .worktrees/issue-<N>-<slug> -b fix/issue-<N>-<slug> origin/main
cd .worktrees/issue-<N>-<slug> && pnpm install
```
Branch prefix: `fix/` for a bug, `feature/` for an enhancement. **Every writing tool call must be rooted at the worktree path** — absolute paths rooted at the primary checkout silently edit the wrong tree, and the local gate then passes on stale code.

## 8 · Build — the failing test comes first
- **Write the regression test before the fix and watch it fail.** That failure is the proof you found the real cause; a test written after a fix proves nothing. Report both states (red → green) in the thread.
- Layer it right: pure logic → Vitest beside the module · web component → RTL · visual/flow change → extend the Playwright suite under `packages/web/e2e/`.
- Fix at the source per the agreed plan. Follow `CLAUDE.md` (shared = contract; controller→service→repository; zod over the wire; Drizzle forward-only; explicit `@Inject` on gateway constructor params).
- New `.tsx` files are **born i18n-enforced** — use `useTranslations` from the first line, no hardcoded JSX copy.
- Small conventional commits, each ending with the required `Co-Authored-By` trailer. Reference the issue in the body as `bilo-io/midnite-app#<N>` (a bare `#<N>` here points at the wrong repo's numbering).

## 9 · Verify
- **Visual change → before/after Playwright screenshots** against the running app (`moon run web:dev`; `pnpm exec playwright install chromium` if the browser is missing). Read the PNGs so they render inline in this thread; the same shots go in the PR body.
- **Desktop-only bug → verify in a packaged/desktop context**, not just the web dev server, or say plainly that you couldn't and what remains unverified.
- Don't smoke-test on the default ports (gateway `7777` / web `3000`) without checking they're free — a parallel session's live instance lives there.
- Pre-push gate, in the worktree, all green — never push red:
  ```bash
  moon run :typecheck && moon run :lint && moon run :test
  ```
  Redirect output to a file and check moon's own exit code; piping to `tail` masks failures. Known-flaky-under-full-suite files (story a11y timing, 5s-timeout specs) — re-run the file alone before believing a regression, and confirm against `main` before calling anything your fault.

## 10 · Open the PR + link it back
- Push, then `gh pr create --draft --base main` (private repo, so no `--repo` flag needed).
- **Title:** `fix(<pkg>): <what> [<size> · <time>]`
- **Body:**
  - **Issue:** `Fixes bilo-io/midnite-app#<N>` on its own line, plus the full URL. (It renders as a reference; it will **not** auto-close — Stage 12 does that by hand.)
  - **Root cause** in 1–3 bullets with `file:line` refs — the *why*, not a list of touched files.
  - **The proof:** the regression test and what it asserts.
  - Embedded before/after screenshots for a visual change. Commit the PNGs on the branch under `docs/screenshots/issue-<N>/` and reference them with **commit-pinned** raw URLs (`https://github.com/bilo-io/midnite/raw/<sha>/docs/screenshots/...`) so they survive a squash-merge + branch delete.
  - The `🤖 Generated with [Claude Code]` trailer.
- **Self-review your own diff** before marking it ready: fidelity to the agreed plan → `CLAUDE.md` conventions → correctness & coverage → anything the fix could regress elsewhere. Fix what's material, re-run Stage 9, push.
- **Drive CI green:** `gh pr checks <n> --watch`. On failure `gh run view <id> --log-failed` → fix in the worktree → re-run the local gate → push. The required check is **`ci-gate`**; skipped-but-green jobs on untouched packages are expected. The `e2e` job is red on every branch including `main` — diff your failure set against `main` before treating it as yours. If genuinely stuck (flaky infra, outage, product call), stop and say exactly what's wrong.
- `gh pr ready <n>` once green.

## 11 · Report — then STOP
Post, terse:
- **PR link** (title + URL) and the **issue link**.
- 3–5 bullets: root cause → fix → test.
- The diff in a ` ```diff ` fenced block (`gh pr diff <n> --patch`, trimmed to the meaningful hunks).
- Screenshots again if visual; anything left unverified, stated plainly.
- One line: what's still open on the issue (e.g. "ships to users in the next desktop release").

**This skill does not merge.** Stop here and let the human review. Do not run `gh pr merge`, and do not tear down the worktree — the branch is still live.

## 12 · Only if the user says merge
- `gh pr merge <n> --squash --delete-branch` (always squash).
- **Close the loop on the public issue by hand** — nothing else will:
  ```bash
  gh issue comment <N> --repo bilo-io/midnite-app --body "Fixed in <PR title> — merged to \`main\`. <one line on what changed for the user.> This ships in the next desktop release; the web app picks it up on the next deploy."
  gh issue close <N> --repo bilo-io/midnite-app
  ```
  Keep that comment written for the reporter: what was wrong, what they'll see now, when. No internal jargon, no private file paths, no PR link they can't open.
- Consider a `CHANGELOG.md` entry under the unreleased section if the fix is user-facing.
- Teardown, and report the reclaimed space:
  ```bash
  freed=$(du -sk .worktrees/issue-<N>-<slug> 2>/dev/null | cut -f1)
  git worktree remove .worktrees/issue-<N>-<slug>     # --force if it balks over untracked noise
  git branch -D fix/issue-<N>-<slug>                  # -D: a squash leaves it "unmerged"
  git worktree prune && git worktree list
  echo "freed ~$(( freed / 1024 )) MB"
  ```
- Wrap-up: `# 🎉 Fixed: <issue title>` (both links) · what landed · `🧹 Reclaimed ~<N> MB` · `## ⏭️ Next up` (the runner-up from Stage 3).

---
Autonomous through Stages 7–11 once the human has chosen (Stage 3) and answered the plan questions (Stage 6). Stop for: an unlocatable root cause (Stage 5), an unresolved design question, a destructive/irreversible step, CI you can't fix — and always at Stage 11.
