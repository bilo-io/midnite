# Phase 52 — In-App Diff & PR Review (close the review loop)

> midnite's agents produce branches and PRs, and the board shows a **PR status chip** + the
> Phase 37 **AI-review verdict** — but to actually *read the diff*, comment, and merge, you leave
> midnite for GitHub. Phase 52 closes that loop: a **diff & review surface inside the app** — a
> syntax-highlighted diff with a file tree and split/unified toggle, AI-review findings anchored
> inline, and **full write-back** (inline comments, approve/request-changes, merge). Review
> becomes one click from the task the agent worked, without a context switch. The grounding shows
> this is **mostly wiring existing plumbing to the web**: diff-fetching and review-posting already
> exist (workflow-scoped); the genuinely new work is the **diff viewer**, **inline comments**, and
> **in-app merge**.

> **Scope guardrails (CLAUDE.md).** No new domain — this extends the **tasks** feature. Diff +
> review are fetched/posted through the **existing GitHub plumbing**: promote the workflow-scoped
> [`github-get-diff.executor.ts`](../packages/gateway/src/workflows/engine/executors/github-get-diff.executor.ts)
> and [`github-post-review.executor.ts`](../packages/gateway/src/workflows/engine/executors/) into
> a reusable **service** the tasks controller calls (thin controller, logic in the service). Diff
> fetch mirrors [`pr-status.service.ts`](../packages/gateway/src/tasks/pr-status.service.ts)'s
> **REST + `gh`/anonymous fallback**; write-back auths with the **team-scoped workflow
> credentials** Phase 37 already uses (per-user OAuth deferred — Decision §2). Every wire shape
> (diff response, comment, review submission) is a **zod schema in
> [`shared`](../packages/shared/src/)**. Task↔PR resolution reuses `parseGithubPr(task.prUrl)` +
> the Phase 13 **repo registry** (`repo.ownerRepo`). The web stays **static export** (a
> `/tasks/view?id=…&tab=review` route, no `[id]` segment) and the diff viewer is **client-only**.
> Fail-open like the PR poller (a fetch/auth failure degrades gracefully, never breaks the task).

> Effort tags: **S** small · **M** medium · **L** large. **A** (diff API) unblocks everything;
> **B** (diff viewer) is the centerpiece; **C** (write-back) closes the loop; **D** (comments +
> AI inline) enriches; **E** (embed + route) makes it reachable. A→B→C is the critical path; D/E
> build on B.

---

## Current state (what exists to build on)

- **Diff fetch — exists, workflow-scoped** — [`github-get-diff.executor.ts`](../packages/gateway/src/workflows/engine/executors/github-get-diff.executor.ts)
  fetches the **unified diff** via GitHub REST (`Accept: application/vnd.github.v3.diff`, Bearer from
  workflow credentials), truncating to `maxTokens × 4`. **Net-new: expose it to the web** (currently
  only callable from a workflow node).
- **Review post — exists** — [`github-post-review.executor.ts`](../packages/gateway/src/workflows/engine/executors/)
  posts a PR review (approve / request-changes / comment). Phase 37's
  [`ai-review.service.ts`](../packages/gateway/src/tasks/ai-review.service.ts) drives it and writes
  `ai_review` (`{ verdict, summary, runId, reviewedAt }`) onto the task. **Reuse it** (extended to carry
  inline comments).
- **PR status + fetch strategy** — [`pr-status.service.ts`](../packages/gateway/src/tasks/pr-status.service.ts):
  `pr_status` (`taskId` PK, `url`, `number`, `state`, `checks`, `reviewDecision`, `fetchedAt`), a poller
  + `POST /tasks/:id/pr/refresh`, **`gh pr view` primary + anonymous REST fallback**, **fail-open**. Mirror
  this fetch strategy for the diff.
- **Task ↔ PR ↔ repo** — `task.prUrl` + `task.repo` + `task.prStatus`
  ([`shared/src/task.ts`](../packages/shared/src/task.ts)); `prUrl` set by the Stop hook via
  [`extract-pr-url.ts`](../packages/gateway/src/terminal/lib/extract-pr-url.ts) → `markDone`. Resolve with
  `parseGithubPr(prUrl)` → `{ repo, prNumber }`; `task.repo` → the Phase 13 registry
  ([`repos.service.ts`](../packages/gateway/src/repos/repos.service.ts)) → `ownerRepo` (API) + `path` (local git).
- **Web PR UI (thin)** — [`task-detail.tsx`](../packages/web/components/task-detail.tsx) shows a
  [`pr-status-chip.tsx`](../packages/web/components/pr-status-chip.tsx) + review-decision badge + "Open PR" +
  refresh, and the AI verdict/summary. **No diff viewer, no inline comments, no syntax-highlight lib** — the
  net-new surface. Code today renders via `MarkdownPreview` (react-markdown/remark-gfm), no language highlighting.
- **Static-export routing** — the task detail already uses `/tasks/view?id=`; a review view is a tab/panel or
  `&tab=review`, client-only (no `[id]` segment).

---

## Theme A — Diff API: expose the PR diff to the web — **M** — ✅ DONE (PR #270, 2026-07-02)

Make the agent's diff fetchable by a task id.

- [x] **gateway:** a reusable diff-fetch + parse (`tasks/lib/github-diff`) shared by the executor and a
      `PrDiffService` — resolve `task.prUrl` → `parseGithubPr`, fetch the unified diff via **REST + token → `gh`
      → anonymous REST** (mirror `pr-status.service`). **Fail-open.** (Kept as a `lib` helper, not a DI service the
      executor injects, because `TasksModule` already imports `WorkflowsModule` — direct injection would cycle.)
- [x] `GET /tasks/:id/pr/diff` (thin controller) → a **structured** response, not a raw blob: parsed into
      files (path, status add/mod/del/rename, `additions`/`deletions`) + hunks; a `truncated` flag + hidden-file
      count when the diff exceeds the byte budget (**no silent truncation** — Decision §6). 404 no-PR, 503 fail-open.
- [x] **shared:** `PrDiffSchema` / `PrDiffFileSchema` / `PrDiffHunkSchema` / `PrDiffLineSchema`; typed `getPrDiff`
      client method in [`web/lib/api.ts`](../packages/web/lib/api.ts).

---

## Theme B — Diff viewer: file tree + split/unified + highlight — **L** — ✅ DONE (PR #273, 2026-07-02)

The centerpiece — a real review viewer.

- [x] **web:** a client-only diff viewer (Decision §3: `react-diff-view` + refractor highlighter, added to web deps
      + `transpilePackages`) rendering the structured `PrDiff` (mapped onto react-diff-view's model — no re-parse).
      A **refractor v4 → react-diff-view@3 shim** (`.children`) bridges the tokenize API mismatch; highlighting is
      **fail-soft** (unsupported language / tokenize error → plain text).
- [x] A **file rail** toggling between a **nested directory tree** and a **flat list** (Stage-2.5 decision): per-file
      add/del counts, jump-to-file (scroll-into-view), and a "N files hidden (truncated)" affordance when capped.
- [x] A **split ⇄ unified** toggle (persisted via `useLocalStorage`, default unified) with **refractor syntax
      highlighting** per file language + an **expand-all / collapse-all** control.
- [x] **Big-diff ergonomics:** collapse-by-default with **lazy hunk mount + lazy tokenize** (nothing renders until a
      file is expanded); binary files show a placeholder. Surfaced via a **"View diff" → full-screen modal** off the
      task-detail PR section (self-fetches `getPrDiff`, **fail-open** with retry + "Open on GitHub"). *(The file rail
      is hidden on `< md` for now — the diff is prioritised on narrow screens; the responsive drawer + inline task
      embed land with Theme E.)*

---

## Theme C — Review actions: comment + approve/request-changes + merge — **L** — ✅ DONE (PR #290, 2026-07-05)

Write back to GitHub, from inside midnite.

- [x] **Inline comment composer** anchored to a diff line (path + line + side) via react-diff-view gutter-click +
      widgets; comments accumulate in the viewer and submit as **one batched review** (draft *persistence* across
      reloads is Theme D).
- [x] **Submit a review** — approve / request-changes / comment (+ body + inline `comments`) — `POST /tasks/:id/pr/review`
      → `PrReviewService` → `tasks/lib/github-review` (`gh api …/reviews` primary, workflow-credential REST token
      fallback — Stage-2.5). Refreshes `pr_status` (`reviewDecision`) after.
- [x] **Merge** — `POST /tasks/:id/pr/merge` → `gh pr merge --<method>` (squash default, method-selectable);
      respects mergeability + branch protection (a refusal surfaces as a **502** with the API message, never forced).
      Refreshes status; the board reflects the merged state.
- [x] **Auth + guardrails:** `gh`-primary (token fallback); both endpoints **RBAC-gated** (`RequiresRole('member')`)
      + **audited** (`task.pr_reviewed` / `task.pr_merged`). Web: a review action bar + inline composer on the diff
      surface (both the modal + the Theme E Review tab, via the shared `PrReviewPanel`).

---

## Theme D — Comment persistence + AI review inline — **M**

Draft locally; see the AI's take where it matters.

- [ ] **gateway:** a `pr_review_comments` table (`id`, `taskId`, `path`, `line`, `side`, `body`, `author`,
      `state` `draft`|`submitted`, `githubCommentId?`, `createdAt`) — draft comments persist before submission so a
      review-in-progress survives a reload; on submit they batch into the GitHub review and flip to `submitted`.
- [ ] **web:** the draft comments render as inline widgets on the diff (edit/delete while `draft`); a
      review-summary bar shows pending count + the submit control.
- [ ] **AI review inline:** surface Phase 37's `ai_review` on the diff — a review-level banner (verdict + summary),
      and line-anchored findings **if** the workflow emits them; otherwise the banner. Reuse `ai-review.service`
      output, no re-run.

---

## Theme E — Embed in task detail + standalone route — **M** — ✅ DONE (PR #278, 2026-07-02)

Make review one click from the task.

- [x] **web:** the full task page ([`task-detail.tsx`](../packages/web/components/task-detail.tsx), `variant='page'`)
      gains a **Details | Review** tab strip when the task has a `prUrl`; the Review tab mounts the diff viewer inline
      via a new `PrReviewPanel` (extracted from `PrDiffModal` — the board modal and the tab share it). The board's
      task modal keeps its full-screen "View diff" modal + gains a "Review page" deep-link (Stage-2.5 decision).
- [x] A **deep-linkable** `/tasks/view?id=…&tab=review` (static-export query-string) — **bidirectional**: the param
      selects the tab on load and switching tabs `router.replace`s it (bookmarkable/shareable); the page widens to
      `max-w-5xl` for the diff. Reachable from the board via the task modal's Review-page link.
- [x] Loading/empty/error states in `PrReviewPanel`: diff fetching (spinner), fetch failed (**fail-open** banner +
      retry + "Open on GitHub"). A PR-less task simply shows no Review tab (details only).

---

## Files this phase touches (map)

- **New/edit (shared):** `PrDiff` / `PrDiffFile` / `PrDiffHunk` / `PrReviewComment` / `PrReviewSubmission` /
  `PrMergeRequest` schemas in [`shared/src/`](../packages/shared/src/) (extending the task/PR contract); client
  methods in [`web/lib/api.ts`](../packages/web/lib/api.ts)
- **New (gateway):** `tasks/pr-diff.service.ts` (shared diff-fetch, lifted from the executor);
  `tasks/pr-review.service.ts` (submit review + merge, wrapping the post-review executor + the merge endpoint);
  `pr_review_comments` table in [`db/schema.ts`](../packages/gateway/src/db/schema.ts) + a forward-only
  [`drizzle/`](../packages/gateway/drizzle/) migration
- **Edit (gateway):** [`tasks.controller.ts`](../packages/gateway/src/tasks/tasks.controller.ts) — `GET /tasks/:id/pr/diff`,
  `POST /tasks/:id/pr/review`, `POST /tasks/:id/pr/merge`, draft-comment CRUD (RBAC-gated, audited);
  [`github-get-diff.executor.ts`](../packages/gateway/src/workflows/engine/executors/github-get-diff.executor.ts) +
  `github-post-review.executor.ts` refactored to share the new services (behavior-preserving for workflows)
- **New (web):** a diff-viewer component set (`components/pr-review/` — file tree, diff pane, comment widget,
  review bar) + the `react-diff-view`/highlighter dep
- **Edit (web):** [`task-detail.tsx`](../packages/web/components/task-detail.tsx) (Review panel/tab);
  [`next.config.mjs`](../packages/web/next.config.mjs) `transpilePackages` if the viewer lib needs it
- **Reuse:** `parseGithubPr`, the repo registry, `pr-status.service` (fetch strategy + status refresh),
  `ai-review.service`, workflow credentials, `AuditService`, `RequiresRole`.

---

## Verification

- [ ] Opening a task with a `prUrl` shows a **Review** surface with the diff rendered as a **file tree +
      hunks**, syntax-highlighted, with a working **split ⇄ unified** toggle; a large diff **flags hidden files**
      (never silently truncates) and files lazy-render.
- [ ] `GET /tasks/:id/pr/diff` returns a structured diff (files + add/del counts + hunks); a fetch/auth failure
      **fails open** (banner + retry + "Open on GitHub"), never breaks the task view.
- [ ] An **inline comment** can be drafted on a line, **persists across a reload** (draft state), and edits/deletes
      while draft; submitting a **review** (approve / request-changes / comment) posts to GitHub with the inline
      comments and updates `pr_status.reviewDecision`.
- [ ] **Merge** from midnite merges the PR via the API (honoring the configured method + branch protection;
      surfacing a refusal rather than forcing); the board reflects the merged state; the action is **audited**.
- [ ] The **AI review** (Phase 37) appears inline (banner + line findings when available) without re-running.
- [ ] The review is reachable at a **deep-linkable** `/tasks/view?id=…&tab=review` and embedded in the task detail;
      write actions are **RBAC-gated**.
- [ ] The workflow `github.get-diff` / `github.post-review` nodes **still behave identically** (the executors now
      delegate to the shared services — behavior-preserving).
- [ ] `moon run :typecheck` · `moon run :lint` · `moon run :test` green (shared schema units; gateway diff-service
      + review/merge + draft-comment tests incl. fail-open; web RTL/story for the diff viewer, split/unified toggle,
      and comment flow; **web tests from the primary checkout, not a `.git` worktree**).

---

## Decisions / open questions

1. **Diff via GitHub REST + `gh`/anonymous fallback** *(settled).* Reuse the `github-get-diff` executor's REST
   diff fetch, lifted into a shared service, with the same fallback `pr-status.service` uses — consistent with how
   midnite already fetches GitHub data. Local `git diff` is a possible future optimization (branch names aren't
   persisted on the task today).
2. **Write-back auth = team-scoped workflow credentials** *(recommend).* Comments/reviews/merge auth with the same
   stored GitHub PAT Phase 37 posts reviews with. **Constraint:** private-repo writes need a token with write scope;
   **per-user GitHub OAuth is deferred**. Write actions are RBAC-gated + audited.
3. **`react-diff-view` + a Prism/refractor highlighter** *(recommend).* Purpose-built for unified-diff parsing, file
   tree, split/unified, and inline-comment widgets — far less risk than a hand-rolled parser. Add to web deps
   (+ `transpilePackages` if needed). Alt considered: a custom parser (more control, more work).
4. **Merge via the GitHub API, not local git** *(recommend).* `PUT /pulls/{n}/merge` respects mergeability + branch
   protection and needs no local checkout state — consistent with API-based fetch. Merge method configurable
   (default from repo/config).
5. **Inline comments drafted locally, submitted batched** *(recommend).* A `pr_review_comments` table holds `draft`
   comments (survive reload) → submitted as one GitHub review (path/line/body + event) → flipped to `submitted`.
   Comment **threads/replies** are out of scope.
6. **No silent truncation** *(recommend).* Large diffs cap with an explicit hidden-file count + per-file lazy load;
   binary/generated files collapse by default. The API's `truncated` flag drives the UI.
7. **AI review reused, not re-run** *(recommend).* Surface the existing `ai_review` inline (banner + line findings
   when the workflow emits them). Triggering a fresh review is the existing Phase 37 workflow's job.
8. **GitHub-first** *(settled).* GitLab/Bitbucket, suggested-changes / commit-from-comment, and comment threads are
   deferred — this phase matches the GitHub-only plumbing that already exists.
