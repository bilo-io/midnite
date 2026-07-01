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

## Theme A — Diff API: expose the PR diff to the web — **M**

Make the agent's diff fetchable by a task id.

- [ ] **gateway:** a reusable `PrDiffService` wrapping the diff-fetch logic (lift it out of
      `github-get-diff.executor.ts` so the executor and the service share one implementation) — resolve
      `task.prUrl` → `parseGithubPr` → `repo.ownerRepo`, fetch the unified diff via **REST + `gh`/anonymous
      fallback** (mirror `pr-status.service`). **Fail-open.**
- [ ] `GET /tasks/:id/pr/diff` (thin controller) → a **structured** response, not a raw blob: parsed into
      files (path, status add/mod/del/rename, `additions`/`deletions`) + hunks; a `truncated` flag + hidden-file
      count when the diff exceeds the cap (**no silent truncation** — Decision §6).
- [ ] **shared:** `PrDiffSchema` / `PrDiffFileSchema` / `PrDiffHunkSchema`; typed client method in
      [`web/lib/api.ts`](../packages/web/lib/api.ts). Reuse `pr_status` for the metadata (state/checks/mergeable).

---

## Theme B — Diff viewer: file tree + split/unified + highlight — **L**

The centerpiece — a real review viewer.

- [ ] **web:** a client-only diff viewer (Decision §3: `react-diff-view` + a Prism/refractor highlighter, added to
      web deps + `transpilePackages` if needed) rendering the parsed unified diff.
- [ ] A **file-tree sidebar**: per-file add/del counts, viewed/collapsed state, jump-to-file, a "N files hidden
      (truncated)" affordance when the diff is capped.
- [ ] A **split ⇄ unified** toggle (persisted via `useLocalStorage`) with **syntax highlighting** per file language.
- [ ] **Big-diff ergonomics:** lazy-render per file (don't mount every hunk at once); large/binary/generated files
      collapse by default. Responsive — the file tree becomes a drawer on mobile (`useIsMobile`).

---

## Theme C — Review actions: comment + approve/request-changes + merge — **L**

Write back to GitHub, from inside midnite.

- [ ] **Inline comment composer** anchored to a diff line (path + line + side); comments start as **drafts**
      (Theme D) and are submitted as one batched review.
- [ ] **Submit a review** — approve / request-changes / comment (+ a body) — via the existing
      `github-post-review` executor, **extended to carry inline comments** (`comments: [{ path, line, body }]`)
      and the review event. Refresh `pr_status` (`reviewDecision`) after.
- [ ] **Merge** — a new `POST /tasks/:id/pr/merge` → GitHub REST `PUT /pulls/{n}/merge` (method
      merge/squash/rebase, default from repo/config); respects mergeability + branch protection (surface the
      server's refusal, don't force). Refresh status after; reflect the merged state on the board.
- [ ] **Auth + guardrails:** write actions use the team-scoped workflow credentials (Decision §2), are
      **RBAC-gated** (`RequiresRole('member')`+), and **audited** ([`AuditService`](../packages/gateway/src/audit/audit.service.ts)) —
      a merge is a consequential autonomous-adjacent action.

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

## Theme E — Embed in task detail + standalone route — **M**

Make review one click from the task.

- [ ] **web:** expand the existing "GitHub PR" section in [`task-detail.tsx`](../packages/web/components/task-detail.tsx)
      into a **Review** panel/tab that mounts the diff viewer + actions when the task has a `prUrl`.
- [ ] A **deep-linkable** route — `/tasks/view?id=…&tab=review` (static-export query-string, no `[id]` segment) —
      so a review is bookmarkable and linkable from the board, the session detail (Phase 51), and notifications.
- [ ] Loading/empty/error states: no PR yet, diff still fetching, fetch failed (fail-open banner with a retry +
      an "Open on GitHub" escape hatch).

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
