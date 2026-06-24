# Phase 37 — AI Code Review Integration

> midnite already runs agents that write code and open PRs — but review happens elsewhere, manually. Phase 37 closes the loop: a webhook from GitHub triggers a workflow that fetches the PR diff, sends it to Claude for structured review, and posts the result back as a GitHub review comment — all without leaving midnite. The workflow engine (Phases 6, 12, 14), the AI node, the webhook trigger, and the Phase 36 template system are all in place. What's missing is the **GitHub executor layer** (fetch diff, post review) and the **surfaces** to wire it up and see results.

> **Builds on:** Phase 13 (repos as first-class entities), Phase 14 (credential vault, executor framework), Phase 22 (PR status polling + `task.prUrl`), Phase 36 (workflow template marketplace — the code review template is seeded there). Phase 37 adds no new architectural primitives — it is purely additive: new node executors, one new credential type, a template, and UI surfaces.

> **Scope guardrails (CLAUDE.md).** New executors live in `workflows/executors/` and implement the existing `NodeExecutor` interface — no changes to the engine. The `github` credential type extends `workflow-credential.ts` in `shared`. `task.aiReview` is a JSON column on the `tasks` table, written by a new `AiReviewService` in the tasks module that listens to workflow run completion events — not by the executor directly (executor ↔ tasks separation). `Repo.ownerRepo` is a nullable column addition (forward-only migration). The webhook HMAC verification reuses the existing `webhookSecretHash` pattern — no new auth infrastructure.

> Effort tags: **S** small · **M** medium · **L** large. Themes are ordered **A → B → C → D** (executors gate the template; repo wiring and review surfacing are independent once A is done). Every box starts unchecked — this is net-new work.

---

## Current baseline (what exists to build on)

- **Webhook trigger** (`trigger.webhook`) — `POST /hooks/workflows/:id/:token` receives arbitrary payloads; the body becomes `input` in the expression context. `webhookSecretHash` stores the HMAC secret (SHA-256); constant-time verification already implemented.
- **AI node** (`ai.claude`) — `provider`, `model`, `system`, `prompt`, `maxTokens` params; `prompt` and `system` are expressionable (`{{ $trigger.pull_request.title }}`); returns `{ text, model }`.
- **`logic.if` node** — branch on an expression; already used to filter webhook events by action type.
- **Executor framework** — `NodeExecutor` interface in [`workflows/executors/`](../packages/gateway/src/workflows/executors/); new executors implement `execute(node, context): Promise<Record<string, unknown>>` and are registered via the `NODE_EXECUTORS` multi-provider token in [`workflows.module.ts`](../packages/gateway/src/workflows/workflows.module.ts).
- **Phase 22 PR status** — `task.pr` (`prUrl`, `state`, `checks`, `reviewDecision`) is already on the task read shape; `pr_status` table + `PrStatusService` poll open PRs. `task.prUrl` is the linkage key for Theme D.
- **Phase 36 template store** — `workflow_templates` table seeded on `onModuleInit`; system templates have `author_id = null`. Phase 37 adds one more built-in template to the seed set.
- **`http-bearer` credential type** — usable as a GitHub token today; Phase 37 adds a dedicated `github` type for cleaner UI labelling and enterprise URL support.

---

## Theme A — GitHub executor nodes + credential type — **M**

The building blocks. Everything in themes B–D depends on these executors existing.

### A1. `github` credential type — **S**
- [x] Add `github` to the credential types in [`packages/shared/src/workflow-credential.ts`](../packages/shared/src/workflow-credential.ts): fields `token` (Personal Access Token or fine-grained token) and optional `enterpriseUrl` (for GitHub Enterprise Server, e.g. `https://github.example.com`). The API base URL resolves to `https://api.github.com` by default or `<enterpriseUrl>/api/v3` when set.
- [x] Update the credential type picker in the web credentials UI to show `github` alongside `slack`, `smtp`, etc.

### A2. `github.get-pr` executor — **S**
- [x] New executor [`workflows/executors/github-get-pr.executor.ts`](../packages/gateway/src/workflows/executors/github-get-pr.executor.ts): param `prUrl: string` (expressionable). Parses `owner`, `repo`, `pull_number` from the URL. Calls `GET /repos/{owner}/{repo}/pulls/{pull_number}` with the `github` credential token as `Authorization: Bearer`. Returns `{ title, body, author, state, labels, headSha, baseBranch, headBranch, additions, deletions, changedFiles }`. On failure: throws with the HTTP status + GitHub error message.
- [x] Register as node type `github.get-pr` in [`packages/shared/src/node-types.ts`](../packages/shared/src/node-types.ts) with param definitions (expressionable `prUrl`, required `credentialId`).

### A3. `github.get-diff` executor — **M**
- [x] New executor [`workflows/executors/github-get-diff.executor.ts`](../packages/gateway/src/workflows/executors/github-get-diff.executor.ts): params `prUrl: string` (expressionable), `maxTokens: number` (default 8000, configurable per node). Calls `GET /repos/{owner}/{repo}/pulls/{pull_number}` with `Accept: application/vnd.github.v3.diff` to retrieve the raw unified diff.
- [x] **Truncation:** estimate token count as `ceil(charCount / 4)`. If the diff exceeds `maxTokens × 4` characters, truncate at that boundary and append `\n\n[diff truncated — showing first ~{maxTokens} tokens of {totalTokens} estimated]`. Truncation is logged at `warn` level with the PR URL and character counts.
- [x] Returns `{ diff, truncated: boolean, estimatedTokens: number, prUrl }`.
- [x] Register as `github.get-diff` in `node-types.ts`.

### A4. `github.post-review` executor — **M**
- [x] New executor [`workflows/executors/github-post-review.executor.ts`](../packages/gateway/src/workflows/executors/github-post-review.executor.ts): params `prUrl: string` (expressionable), `body: string` (expressionable — the review comment text), `event: 'COMMENT' | 'APPROVE' | 'REQUEST_CHANGES'` (expressionable, default `'COMMENT'`), `credentialId: string`.
- [x] Calls `POST /repos/{owner}/{repo}/pulls/{pull_number}/reviews` with `{ body, event }`. Returns `{ reviewId, htmlUrl, state }`.
- [x] **HMAC verification** for incoming webhook payloads is already handled by the trigger layer (existing `webhookSecretHash`) — this executor does not re-verify; it only posts outbound reviews.
- [x] Register as `github.post-review` in `node-types.ts`.
- [x] **Shared types:** extend `NodeType` union in `node-types.ts` with `'github.get-pr' | 'github.get-diff' | 'github.post-review'`; add param schemas (zod) for each.

---

## Theme B — Built-in "AI Code Review" workflow template — **S–M**

A ready-to-install template that wires A's executors into a complete review flow. Seeds into the Phase 36 template store.

### B1. Template definition — **S**
- [ ] New seed file [`workflow-templates/seeds/ai-code-review.seed.ts`](../packages/gateway/src/workflow-templates/seeds/ai-code-review.seed.ts). Template slug: `ai-code-review`. Category: `github`. Tags: `["code-review", "github", "ai"]`.
- [ ] **Node graph:**
  1. `trigger.webhook` — receives `push`/`pull_request` events from GitHub.
  2. `logic.if` — condition `{{ $trigger.action === 'opened' || $trigger.action === 'synchronize' }}` — exits the `false` branch silently (no review on unrelated events).
  3. `github.get-pr` — `prUrl: "{{ $trigger.pull_request.html_url }}"`, `credentialId: "slot:github-token"`.
  4. `github.get-diff` — `prUrl: "{{ $trigger.pull_request.html_url }}"`, `maxTokens: 8000`, `credentialId: "slot:github-token"`.
  5. `ai.claude` — `model: "claude-sonnet-4-6"`, `system: "You are a senior software engineer performing a code review. Be concise, specific, and constructive."`, `prompt: "PR: {{ $3.title }}\nAuthor: {{ $3.author }}\nDescription:\n{{ $3.body }}\n\nDiff:\n{{ $4.diff }}\n\nReview this PR. Start with a one-sentence verdict (LGTM / minor issues / needs changes). Then list specific findings with file references if applicable. End with an overall recommendation."`.
  6. `github.post-review` — `prUrl: "{{ $trigger.pull_request.html_url }}"`, `body: "{{ $5.text }}"`, `event: "COMMENT"`, `credentialId: "slot:github-token"`.
- [ ] **Credential slots:** `[{ key: "github-token", type: "github", description: "GitHub Personal Access Token with `pull_requests: write` scope" }]`.
- [ ] **Thumbnail:** category icon (`github` badge placeholder — no image generation in Phase 37).
- [ ] Pick up by `WorkflowTemplatesService.onModuleInit()` alongside the Phase 36 built-ins.

### B2. System prompt refinement — **S**
- [ ] The default system prompt (above) is the baseline. Expose `system` and `prompt` as editable in the workflow editor after installation so teams can adapt the review style (strict / lenient, language-specific conventions, security focus). No special handling needed — the `ai.claude` node already makes these fields editable.

---

## Theme C — Repo ↔ GitHub webhook wiring — **S–M**

Guide the user from "I have a repo" to "GitHub is sending webhooks to my review workflow."

### C1. `Repo.ownerRepo` field — **S**
- [ ] Add `owner_repo TEXT` (nullable) to the `repos` table in [`db/schema.ts`](../packages/gateway/src/db/schema.ts) — forward-only migration. Format: `"owner/repo"` (e.g. `"bilo-io/midnite"`). Unique index. Extend the shared `Repo` type in [`packages/shared/src/repo.ts`](../packages/shared/src/repo.ts) with `ownerRepo?: string`; add to `CreateRepoRequest` + `UpdateRepoRequest`.
- [ ] `ReposController.update()` accepts `ownerRepo`; `ReposRepository.update()` persists it.

### C2. "Connect GitHub webhook" UI — **S–M**
- [ ] On the repo detail/settings page (web), add a **"GitHub webhook"** section: shows `ownerRepo` input (if not set, prompt to enter it); once set, shows a **webhook URL** picker — a dropdown of the user's installed code-review workflows (filtered by `installedFromTemplateId = ai-code-review` or template slug) with their webhook URLs.
- [ ] Below the picker: a **step-by-step instructions panel** — "Go to GitHub → your-repo → Settings → Webhooks → Add webhook. Paste this URL: `<url>`. Set Content type to `application/json`. Paste this secret: `<secret>`. Select: Pull request events only."
- [ ] A **"Test connection"** button: sends a synthetic `ping` event to the workflow webhook URL and shows success/failure. (The webhook trigger already handles the GitHub `ping` action gracefully — no-op on `ping`.)

### C3. Payload filtering by `ownerRepo` — **S**
- [ ] In the code review template (B1) and as a general pattern: add a second `logic.if` node immediately after the trigger that checks `{{ $trigger.repository.full_name === 'owner/repo' }}` — the `ownerRepo` value is passed as a node param (`repoFilter: string`, expressionable) so one workflow instance can serve one repo. Document this pattern in the template description.
- [ ] Alternatively: the "Connect webhook" UI auto-sets this filter param when it generates the webhook URL for a specific repo — the selected `ownerRepo` is injected as the `repoFilter` param on the filter node. Both the manual and guided paths are supported.

---

## Theme D — Task PR review surfacing — **M**

Close the loop: when a code review workflow run completes, the result appears on the task that owns the PR.

### D1. `task.aiReview` column — **S**
- [ ] Add `ai_review TEXT` (nullable JSON) to the `tasks` table — forward-only migration. Shape: `{ verdict: 'approved' | 'commented' | 'changes-requested', summary: string, runId: string, reviewedAt: string }`. `verdict` maps from the `github.post-review` `event` param: `APPROVE → approved`, `COMMENT → commented`, `REQUEST_CHANGES → changes-requested`.
- [ ] Extend shared `Task` type with `aiReview?: { verdict: string; summary: string; runId: string; reviewedAt: string }`. `TasksRepository` includes it in the hydrated task.

### D2. `AiReviewService` — **S–M**
- [ ] New service [`tasks/ai-review.service.ts`](../packages/gateway/src/tasks/ai-review.service.ts) — subscribes to `WorkflowRunCompletedEvent` via the existing `WorkflowEventBus`. On each completed run:
  1. Check if the run's workflow has `installedFromTemplateId` matching the code review template slug (or any template in the `github` category — configurable via a service-level check).
  2. Extract the `prUrl` from the run's trigger input (`run.input.pull_request.html_url`).
  3. Find the task whose `prUrl` matches (via `TasksRepository.findByPrUrl(prUrl)`).
  4. Extract the review `body` and `event` from the run's last `github.post-review` node output.
  5. Derive `verdict` from `event`; derive `summary` as the first 300 characters of `body`.
  6. Write `ai_review` to the task row via `TasksRepository.setAiReview(taskId, aiReview)`.
  7. Emit `task.updated` (existing event bus) so the board refreshes.
- [ ] `TasksRepository.findByPrUrl(prUrl)` — new query: `WHERE pr_url = ?` (or the existing `pr_url`/`prUrl` field — check Phase 22 schema for the exact column name).

### D3. Review surfaces — **S**
- [ ] **Task card chip:** a small `verdict` chip on the task card (board + list view) when `aiReview` is set — `✅ LGTM`, `💬 Commented`, `⚠️ Changes requested`. Styled with the existing badge component from `@midnite/ui`. Shown alongside the existing "PR: open/merged" chip.
- [ ] **Task thread section:** an "AI Review" collapsible section in the task detail panel — shows `verdict`, `reviewedAt` timestamp, and the full `summary` text. A "View on GitHub" link opens the review URL (use `runId` to look up the workflow run output and extract `htmlUrl` from the `github.post-review` node result).
- [ ] **Re-review button:** a "Re-review" icon-button in the AI Review section — fires `POST /workflow-templates/ai-code-review/trigger` (or directly triggers the linked workflow run) with the task's `prUrl` injected. Disabled when no code-review workflow is linked to the task's repo.

---

## Out of scope (named, not built here)

- **Chunk-and-merge review** — splitting large diffs by file and synthesising a combined verdict. Truncation to 8k tokens is the Phase 37 approach; chunk-and-merge is a later enhancement once the baseline is proven.
- **Blocking merge** (GitHub branch protection rules) — configuring GitHub to require the AI review before merging is outside midnite's scope; the review is advisory.
- **Review policies** — configuring thresholds (e.g. "auto-approve if AI says LGTM and no security findings") is a future autonomy concern, building on Phase 23.
- **Multi-repo fan-out** — one workflow instance per repo for now; a fan-out pattern (one workflow handling all repos via a routing table) is deferred.
- **GitHub Actions triggers** — triggering the review from GitHub Actions (vs. a webhook) is deferred.
- **Line-level review comments** — posting inline comments on specific diff lines (`POST /pulls/:id/comments`) requires knowing the position offset in the diff; Phase 37 posts top-level review comments only.

---

## Files this phase touches (map)

- **shared:** [`workflow-credential.ts`](../packages/shared/src/workflow-credential.ts) (add `github` type); [`node-types.ts`](../packages/shared/src/node-types.ts) (add `github.get-pr`, `github.get-diff`, `github.post-review` with param schemas); [`repo.ts`](../packages/shared/src/repo.ts) (`ownerRepo?`); [`task.ts`](../packages/shared/src/task.ts) (`aiReview?`); barrel + typed API client.
- **gateway — executors:** new [`workflows/executors/github-get-pr.executor.ts`](../packages/gateway/src/workflows/executors/github-get-pr.executor.ts), [`github-get-diff.executor.ts`](../packages/gateway/src/workflows/executors/github-get-diff.executor.ts), [`github-post-review.executor.ts`](../packages/gateway/src/workflows/executors/github-post-review.executor.ts); register all three in [`workflows/workflows.module.ts`](../packages/gateway/src/workflows/workflows.module.ts) via `NODE_EXECUTORS`.
- **gateway — workflow-templates:** new seed [`workflow-templates/seeds/ai-code-review.seed.ts`](../packages/gateway/src/workflow-templates/seeds/ai-code-review.seed.ts); update `onModuleInit` to pick it up.
- **gateway — repos:** [`repos/repos.repository.ts`](../packages/gateway/src/repos/repos.repository.ts) + [`repos.service.ts`](../packages/gateway/src/repos/repos.service.ts) + [`repos.controller.ts`](../packages/gateway/src/repos/repos.controller.ts) (`ownerRepo` field); forward-only migration adding `owner_repo` column.
- **gateway — tasks:** new [`tasks/ai-review.service.ts`](../packages/gateway/src/tasks/ai-review.service.ts); [`tasks/tasks.repository.ts`](../packages/gateway/src/tasks/tasks.repository.ts) (`ai_review` column, `findByPrUrl`, `setAiReview`); forward-only migration adding `ai_review` column to `tasks`.
- **web:** repo detail/settings page (Connect GitHub webhook section); task card (verdict chip); task thread ("AI Review" section, Re-review button); credentials UI (`github` type label).
- **Docs:** append to [`done.md`](done.md) as slices land; update README (AI code review section).

---

## Verification

- [ ] Register a `github` credential with a valid PAT. `github.get-pr` node in a test workflow returns the PR title/author/body/labels for a real PR URL.
- [ ] `github.get-diff` returns the raw diff for a small PR. For a large PR (>8k token estimate), the diff is truncated with the `[diff truncated]` marker and `truncated: true` in the output.
- [ ] `github.post-review` posts a `COMMENT` review to a test repo PR — visible in GitHub's PR review tab. Posting an `APPROVE` produces an approval; `REQUEST_CHANGES` produces a changes-requested review.
- [ ] Install the "AI Code Review" template from `/workflows/templates`. The install flow prompts for the `github-token` credential slot. The created workflow is `enabled = false`; enabling it and sending a GitHub `pull_request` webhook payload (action: `opened`) triggers the full chain and posts a review comment on the PR.
- [ ] The `logic.if` filter node correctly drops `pull_request` events with action `closed`, `labeled`, etc. — no spurious review posts.
- [ ] Setting `Repo.ownerRepo = "owner/repo"` via `PATCH /repos/:id` persists correctly. The "Connect GitHub webhook" UI shows the webhook URL and secret for the linked workflow.
- [ ] After a code review workflow run completes: `task.aiReview` is set on the task whose `prUrl` matches the PR; the verdict chip appears on the task card; the "AI Review" section in the thread shows the summary.
- [ ] `moon run :typecheck` · `moon run :lint` · `moon run :test` green across the graph; `moon ci` green.

---

## Decisions / open questions

1. **Diff truncation threshold** *(settled: 8k tokens, configurable per node).* `maxTokens` defaults to 8000 on the `github.get-diff` node but is a user-editable param — teams running a more powerful model can raise it. Truncation appends a clear `[diff truncated]` marker so the AI knows context is missing.
2. **GitHub API version** *(recommend: REST v3).* The three executors use GitHub REST v3 (`api.github.com`). GraphQL v4 offers richer queries but adds complexity; REST is sufficient for Phase 37's needs.
3. **`task.aiReview` linkage** *(open).* `AiReviewService` matches on `task.prUrl`. Tasks where `prUrl` was set manually (not by an agent) may not match if the URL format differs (e.g. trailing slash, query params). Recommend: normalise both URLs (strip trailing slash, strip query) before comparing. Confirm in the D2 PR.
4. **`findByPrUrl` column name** *(open).* Phase 22 added `pr_url` to tasks — confirm the exact column name in [`db/schema.ts`](../packages/gateway/src/db/schema.ts) and the `task.prUrl` field in the shared type before writing the query.
5. **Re-review trigger mechanism** *(open).* The Re-review button needs to fire a specific workflow run. Recommend: `POST /workflows/:workflowId/run` with the PR URL as trigger input (same endpoint the webhook hits). The repo detail page needs to link `Repo.ownerRepo` → the installed code-review workflow ID. A `repo_workflow_links` table (or a simpler `Repo.codeReviewWorkflowId` column) enables this lookup. Settle in the D3 PR.
6. **Verdict extraction from run output** *(open).* `AiReviewService` needs to find the `github.post-review` node's output in the run result. Workflow runs store per-node outputs — confirm the run output shape in [`workflow-engine.service.ts`](../packages/gateway/src/workflows/engine/workflow-engine.service.ts) to ensure `{ nodeId → output }` is accessible after completion.
7. **APPROVE vs COMMENT default** *(settled: COMMENT).* The built-in template defaults to `COMMENT` — non-blocking, advisory. Users who want the AI to approve or request changes can change the `event` param in the workflow editor.
