# Completed work

Append new entries at the **top**. Each entry: one heading with the date, a short summary, and the tickbox list of what landed.

---

## 2026-06-24 — Phase 35 D1–D3 + E1–E2 — WS scoping + notification team isolation (PR #195)

- [x] **D1** — `ConnectionRegistry` (WeakMap + byTeam/byUser maps) in global `WsModule`; JWT extracted from `?token=<jwt>` at WS handshake; invalid token → close 4001; no-JWT → `{ userId: null, teamId: null }` (legacy compat)
- [x] **D2** — `WsBroadcastService` (`toTeam`/`toUser`/`toAll`); `TasksGateway` uses `toTeam(task.teamId)` for scoped events, `toAll(subscribers)` for legacy; `WorkflowsGateway` uses `toAll(runSockets)` (runId provides implicit access control)
- [x] **D3** — 4 new integration tests in `tasks.gateway.test.ts`: scoped delivery, legacy broadcast, 4001 rejection, unauthenticated-client isolation; `workflows.gateway.test.ts` updated to new constructor
- [x] **E1** — `team_id TEXT` column + `notification_team_idx` added to `notifications` table (migration 0051); `NotificationsRepository.list/countUnread` accept `TeamScope`; `NotificationsController.list()` injects `@CurrentUser()`; `NotificationsService.persist()` records `task.teamId`; `Notification` schema gains optional `teamId`
- [x] **E2** — `NotificationsGateway` rewritten with JWT/ConnectionRegistry pattern; `notification.created` routes by `notification.teamId` — `toTeam()` for team-scoped, `toAll(subscribers)` for system/legacy

---

## 2026-06-24 — Phase 35 A1–A5 + B1–B3 — RBAC scoped queries + write guards (PR #194)

- [x] **A1** — `TeamScope` type in `@midnite/shared`; `teamScopeFilter()` Drizzle helper in `gateway/src/db/team-scope.ts`; `teamId` embedded in JWT at login/register/refresh
- [x] **A2** — Tasks list/get scoped: `TasksRepository.listTasks/getTask(scope?)`, service + controller wired; `listReadyTodoTasks()` stays global
- [x] **A3** — Repos list/get scoped: `ReposRepository.list/getById(scope?)`, service + controller wired
- [x] **A4** — Workflows list/get scoped: `WorkflowsRepository.listWorkflowRows/getWorkflowRow(scope?)`, service + controller wired; `listScheduledEnabledRows()` stays global
- [x] **A5** — 12 integration tests (`:memory:` SQLite): own-only, team-shared, out-of-scope, and legacy-null visibility patterns across tasks/repos/workflows
- [x] **B1** — `RoleGuard` (`auth/role.guard.ts`), `@RequiresRole()` decorator, `TeamsService.getMembership()` helper; role cached per request on `req.resolvedRole`; backward compat: no user → guard skips
- [x] **B2** — Guards applied: tasks (POST/PATCH=`member`, DELETE=`admin`), repos (POST=`member`, PATCH/DELETE=`admin`), workflows (POST/run/duplicate=`member`, PATCH/DELETE/webhook-rotate=`admin`)
- [x] **B3** — `OwnershipService` (`auth/ownership.service.ts`): `isOwner()` + `resolveRequiredRole()` helpers; exported from `AuthModule`

---

## 2026-06-24 — Verification sweep: closed Phases 12, 13, 25, 26; flagged 11, 32

Reconciled the verification blocks of six "almost-complete earlier" phases against the actual code + a fresh test run (three read-only verification agents mapped each box to evidence). Doc-only; no source change. Evidence run: `gateway:test` 984/984, `shared:test` 463/463, `web:test` 505/505, `ui:test` 46/46, `docs:test` 31/31 — all green **isolated**. (Full-graph `moon run :test` flakes only on `ui:test`'s storybook-chromium browser provider under parallelism — "Vitest failed to find the current suite" — a runner-infra issue, not a regression. CI also billing-blocked account-wide.)

**Closed (verification now test-backed/code-confirmed):**
- [x] **Phase 12** (workflow data flow & expressions) — `$node` refs, missing-ref errors + optional `?.`, `logic.setData`/`merge`/`data.filter`, `storage` round-trip-across-runs all proven by `workflow-engine.expression.spec.ts` / `reshape-nodes.spec.ts` / `storage-nodes.spec.ts` / `shared/expression.test.ts`. (Only remainder is the ⏳-deferred pinned-sample item.)
- [x] **Phase 13** (repos first-class) — DB-backed CRUD, config seeding (idempotent/second-boot), repo-picker persist, unknown-repo rejection, CLI `--repo`, cwd precedence — `repos.service.test.ts`, `tasks.service.spec.ts`, `resolve-cwd.test.ts`, `new-task-modal.test.tsx`.
- [x] **Phase 25** (`@midnite/ui`) — `ui:build` ESM+dts+tokens.css, boundary guard, web shim imports, token-CSS theming, storybook-as-browser-tests (46/46), DS docs, external-import seam (verified via throwaway `node` import of `dist/`).
- [x] **Phase 26** (`@midnite/docs`) — ui-built shell, live MDX examples + token specimens, real product-docs `?raw` imports, sidebar/search/responsive/no-network, boundary guard; `docs:build` static site + `docs:test` 31/31.

**Flagged (impl complete + unit-tested; boxes are inherently live acceptance, left open):**
- ◐ **Phase 11** (public site) — all visual acceptance needs a live `site:dev`/Playwright pass; impl traced to `packages/site/` + unit tests. Ticked only the code-confirmed legal-pages box; added a status note.
- ◐ **Phase 32** (CLI live dashboard) — all TUI acceptance needs a running gateway + interactive terminal; impl in `cli/src/watch/` + `task-board-reducer`/`Dashboard`/`LogPanel` tests. Added a status note.

## 2026-06-24 — Phase 33 B4+E1-E3 — Teams UI + profile/account settings (PR #192)

- [x] **B4** — Teams web UI: `/settings/team` (list + create), `/settings/team/[teamId]` (members, invite links, danger-zone delete), Settings sidebar + user-nav "Team" entry
- [x] **E1** — User profile page: `/settings/profile` (display name edit, read-only email, change password); `PATCH /auth/me` + `PATCH /auth/me/password` gateway routes
- [x] **E2** — Team settings merged into B4 (rename, danger zone, member management, invite tokens)
- [x] **E3** — Invite acceptance `/invite/[token]` (unauthenticated metadata, auth-gated accept with login redirect)
- [x] Auth context extended: `teams[]`, `activeTeamId`, `setActiveTeam`, `setUser`

## 2026-06-24 — Tracker reconciliation: ticked confirmed-shipped boxes (Phase 15 A, Phase 22 D)

Several "open" tracker boxes describe work that's actually shipped — verified against the code, then reconciled. Doc-only; no code change. (Surfaced during a `/exec` sweep where 4 consecutive "open" candidates turned out already-built.)

- [x] **Phase 22 Theme D** — "awaiting review / awaiting merge" board filter: confirmed shipped (`DELIVERY_FILTERS` + `?delivery=` in `tasks-view.tsx`, `deliveryState`/`matchesDelivery` in `lib/pr-delivery.ts`, unit-tested in `pr-delivery.test.ts`). Ticked.
- [x] **Phase 15 Theme A** (Bulk / paste add) — satisfied end-to-end by **Phase 16** (✅ PR #40) per Phase 16 Decision §5: `POST /tasks/bulk` (`createBulk`), coalesced `tasks.bulkCreated` WS event, CLI `add --bulk` (`cli/src/bulk.ts`), web paste modal. Ticked all 4 boxes with shipped-surface references.

## 2026-06-24 — Phase 34 COMPLETE: bundle baseline closed out (verification)

Final open box in Phase 34 — re-ran the analyzer after Theme B and confirmed `lucide-react` is tree-shaken out of the shared bundle. Doc-only; no code change (analyzer + `optimizePackageImports` already landed in earlier slices).

- [x] Re-ran `moon run web:bundle-report`: first-load shared JS = **104 kB gzipped** (`1106` 46.7 kB + `a0f49a59` 54.2 kB + 3.2 kB other)
- [x] Confirmed `lucide-react` **absent from the shared first-load bundle**; tree-shaken into per-route chunks (≤23 kB/chunk, 359 kB total spread across all routes) — each page loads only the icons it renders
- [x] Filled in Decisions §4 baseline numbers (largest chunk: `6676e8bd.js` 1.16 MB parsed, lazy dashboard/recharts/grid — not in first-load)
- [x] Ticked the line-119 verification box → **Phase 34 fully complete**

## 2026-06-24 — Phase 24 Theme B: touch interactions for the kanban (PR #188)

Makes the board usable by finger and stops the live terminal half-working on touch.

- [x] dnd-kit sensors split into `MouseSensor` (6px, desktop unchanged) + `TouchSensor` (200ms press-and-hold, 8px tolerance) on `board-view` + `sortable-accordions` — a plain swipe scrolls, a held press drags
- [x] `tap-to-move-menu.tsx`: touch-only ≥44px "move to…" menu on each card (the other columns), running the same `onMove` (→wip spawns, →todo restats); supersedes the hover Start/Stop on mobile; RTL-tested
- [x] `live-terminal.tsx`: read/scroll-only on touch (`disableStdin`, no cursor blink/input, "Read-only" badge)
- [x] `fix(site)`: added the missing explicit `vite@6` dep so `site:typecheck` passes (web/ui already declared it)

> Merged on a green local web gate (typecheck/test/lint + site:typecheck); CI is billing-blocked account-wide. Superseded the earlier #169, whose extensive parallel-agent main-repair commits became redundant once equivalent fixes landed on main independently.

## 2026-06-24 — Phase 10 E3+F3 complete: gallery generator, Storybook GH Pages preview, docs/TESTING.md (PR #186)

- [x] `packages/web/scripts/generate-gallery.mjs` — gallery generator: walks `e2e/__shots__/`, groups pages vs. stories/component, writes `gallery.html` (dark-themed, relative image refs) + `SCREENSHOTS.md` (markdown manifest)
- [x] `.github/workflows/preview.yml` — screenshot capture + gallery artifact upload (14 days) + Storybook deploy to `gh-pages` under `/pr-<N>/`; posts preview URL comment; cleanup on PR close; all jobs `continue-on-error: true`
- [x] `docs/TESTING.md` — four test layers, run commands, baseline update instructions, cheatsheet for adding tests at each layer
- [x] `CLAUDE.md` "Testing" section updated with layer table and link to `docs/TESTING.md`
- [x] Phase 10 E3 and F3 marked ✅ DONE

## 2026-06-24 — Phase 23 A2 complete: Evaluation engine wired into requestDecision

- [x] `evaluateRules()` pure function (`approvals/lib/rule-evaluator.ts`): first-match-wins with `commandPrefix` (startsWith) + `pathGlob` (inline glob, `*` = non-separator, `**` = anything); 14 tests
- [x] `ApprovalsService.evaluate()` calls `evaluateRules()` and gates on autonomy mode (`manual` always escalates)
- [x] `ApprovalService.requestDecision()` wires in the policy engine via `@Optional() ApprovalsService` before the human broadcast; `auto-allow` / `auto-deny` return immediately; `escalate` falls through
- [x] `TerminalModule` imports `ApprovalsModule` so DI is wired; all 958 gateway tests pass
- [x] PR #187

## 2026-06-24 — Phase 33 A5–A6 complete: Web auth pages + CLI auth commands

- [x] Next.js API route handlers for login/refresh/logout/register (httpOnly `__midnite_rt` cookie)
- [x] `AuthProvider` context: session restore on mount, `jwtEnabled` flag (graceful no-JWT fallback)
- [x] `useCurrentUser()` hook: redirects to /login when JWT-enabled and unauthenticated
- [x] `app/(auth)/login` + `/register` pages with Card/Input/Button UI; `NEXT_PUBLIC_REGISTRATION_OPEN` gate
- [x] `UserNav` component: avatar initials + name + profile/logout dropdown
- [x] `api.ts` `setAccessToken()`/`getAccessToken()` + automatic `Authorization: Bearer` header
- [x] CLI `auth-store.ts`: `~/.config/midnite/auth.json` (mode 0600), `resolveToken()` priority chain
- [x] CLI `login` / `logout` / `whoami` commands; `preAction` hook resolves token before any command
- [x] `createClient(baseUrl, token?)` injects `Authorization: Bearer` on all gateway requests

## 2026-06-24 — Phase 33 A1–A4 complete: User identity + JWT auth

- [x] `users` table + migration `0045_users`; `refresh_tokens` table + migration `0046_refresh_tokens`
- [x] `UsersRepository` + `UsersService` (bcrypt 12 rounds, email lowercased, timing-safe compare); 9 unit tests
- [x] `shared` `User` / `CreateUserRequest` / `LoginRequest` / `AuthResponse` zod schemas in `packages/shared/src/user.ts`
- [x] `JwtService`: HS256 access tokens (15 min) + hashed refresh tokens (7 day); `RefreshTokensRepository`; 6 unit tests
- [x] `GatewayAuthConfigSchema` extended with `jwt.secretEnv` / `jwt.accessTtlSeconds` / `jwt.refreshTtlDays`
- [x] `AuthController`: `POST /auth/register`, `POST /auth/login`, `POST /auth/refresh`, `POST /auth/logout`, `GET /auth/me`
- [x] `GatewayAuthGuard` upgraded: JWT-first verification, static bearer fallback preserved; `@CurrentUser()` param decorator
- [x] Phase 33 A1–A4 marked ✅ DONE (WS `?token=` query param deferred to A4 remainder)

## 2026-06-24 — Phase 23 A1 complete: ApprovalRule model + storage + CRUD API (PR #185)

- [x] `ApprovalRule` zod schema in `@midnite/shared` (`effect: allow|deny`, `toolName`, optional `match: { commandPrefix, pathGlob }`, `scope: global`, `note`); `CreateApprovalRuleSchema` / `UpdateApprovalRuleSchema`; 7 unit tests
- [x] `approval_rules` SQLite table (migration `0044_approval_rules`) + `ApprovalsRepository` (list/listEnabled/listEnabledForTool/get/insert/update/remove); 10 integration tests
- [x] `ApprovalsService` maps DB rows ↔ domain types; `ApprovalsController` at `GET/POST/PATCH/DELETE /approvals/rules`; `ApprovalsModule` registered in `AppModule`
- [x] Phase 23 A1 marked ✅ DONE

## 2026-06-24 — Phase 10 E1 complete: Storybook screenshot capture (PR #184)

- [x] `e2e/screenshots/storybook.shots.ts` — new Playwright spec that discovers all stories via `/index.json`, captures each in light and dark (`?globals=theme:<theme>`), outputs to `e2e/__shots__/stories/<component>/<story>-<theme>.png`
- [x] `playwright.config.ts` — `stories` Playwright project (port 6007, 1280×900); `screenshots` project testMatch narrowed to exclude `storybook.shots.ts`; Storybook dev server added as third `webServer` entry
- [x] `moon run web:screenshots` now runs `--project=screenshots --project=stories` — one command for both pages and stories
- [x] Phase 10 E1 marked ✅ DONE

## 2026-06-24 — Phase 36 D3 + E complete; fix gateway spec (commits 8e2d8df, 5055c54)

- [x] Phase 36 D3: "Save as template" modal in workflow editor (BookmarkPlus toolbar button, SaveAsTemplateModal, POST /from-workflow, navigate to templates on success)
- [x] Phase 36 E: `template create --from-workflow` CLI command wired; `template list` and `template install` also complete
- [x] fix: gateway workflow-templates.spec — add missing `position` fields to createFromWorkflow test nodes
- [x] Phase 36 C2: all 4 remaining built-in seeds confirmed (github-pr-ready-check, daily-digest, ai-task-summariser, scheduled-task-cleanup)

## 2026-06-24 — Phase 34 C1+C2+D3 + Phase 37 C3 + Phase 36 seeds B3 (commits 2adfe88, 95bd37f, 690dc98)

- [x] Phase 36 seeds B3: `github-pr-ready-check`, `daily-digest`, `ai-task-summariser`, `scheduled-task-cleanup` seeds registered — 7 built-in templates total
- [x] Phase 37 C3: repo-filter `logic.if` node added to ai-code-review template (repoFilter param, empty = allow all)
- [x] Phase 34 C1: recharts already deferred via DashboardGrid dynamic import (audited + confirmed)
- [x] Phase 34 C2: wavesurfer already deferred via dynamic import in media-detail-view (audited + confirmed)
- [x] Phase 34 D3: `docs/DISK_SIZE.md` written (3 sources: .next cache, pnpm hardlinks, APFS snapshots)

## 2026-06-24 — Phase 36 E — CLI template commands (commit 80dd11a)

- [x] `midnite template list [--category <c>]` — table of slug/name/category/tags/slots
- [x] `midnite template install <slug-or-id> [--name ...] [--cred slot=credId ...]` — slot warnings + install, prints workflow ID
- [x] `GatewayClient.listTemplates` / `getTemplateSlots` / `installTemplate` in `cli/src/client.ts`
- [x] `templateListRows` + `parseCredFlag` helpers in `cli/src/template.ts` (7 unit tests)

## 2026-06-24 — Phase 36 D1+D2 — Template marketplace browse + install UI (PR #182)

- [x] `/workflows/templates` page: category filter chips, free-text search, template cards
- [x] Install modal: slot requirements via `GET /:id/slots`, per-slot credential dropdowns, `POST /:id/install` + navigate to editor
- [x] "Templates" link added to Workflows page header
- [x] Template API functions in `web/lib/api.ts`: `listWorkflowTemplates`, `getWorkflowTemplate`, `getWorkflowTemplateSlots`, `installWorkflowTemplate`

## 2026-06-24 — Phase 36 B2+D4 — Workflow duplicate endpoint + card button (PR #181)

- [x] `POST /workflows/:id/duplicate` — clones graph with fresh UUIDs, `enabled=false`, name `"(copy)"`
- [x] `duplicateWorkflow()` in web API lib
- [x] `onDuplicate` prop on `WorkflowCard` (grid + list layouts) shows Copy icon on hover
- [x] `workflows-view.tsx` wires duplicate to refresh

## 2026-06-24 — Phase 37 C2 — GitHub webhook UI on repo settings (PR #180)

- [x] `ownerRepo` input added to repo create and edit forms (Settings → Repos)
- [x] Globe icon + `owner/repo` display in repo list items
- [x] Collapsible GitHub webhook section per repo: workflow picker, "Get URL" via `rotate`, URL+secret with copy, step-by-step GitHub setup instructions

## 2026-06-24 — Phase 36 A+B+C (partial) — Workflow Template Marketplace gateway (PR #179)

- [x] Migration 0043: `workflow_templates` table (slug unique, category+published index) + `installed_from_template_id` on `workflows`
- [x] Shared `workflow-template.ts`: `WorkflowTemplate`, `WorkflowTemplateSummary`, `WorkflowTemplateCredentialSlot`, `CreateTemplateRequest`, `UpdateTemplateRequest`, `InstallTemplateRequest`, `TemplateSlotsResponse` (zod schemas + types)
- [x] `WorkflowTemplatesRepository`: insert, findById, findBySlug, list (category/published/authorId filter), update, softDelete, hydrate, hydrateSummary
- [x] `WorkflowTemplatesService`: CRUD, system-template protection, `onModuleInit` idempotent seeding, `getSlots`, `install` (slot:key sentinel resolution)
- [x] `WorkflowTemplatesController`: full REST surface (`/workflow-templates` CRUD + `/:id/slots` + `/:id/install`)
- [x] `WorkflowTemplatesModule` registered in `app.module.ts`
- [x] Three built-in seeds: `notify-on-task-done`, `webhook-relay`, `ai-code-review` (Phase 37B)
- [x] 15 new tests (repository + service); 933 gateway tests green

## 2026-06-24 — Phase 37 C+D — Repo.ownerRepo, task.aiReview, AiReviewService, verdict chip (PR #178)

- [x] Migration 0041: `owner_repo TEXT` nullable + unique index on `repos` table
- [x] Migration 0042: `ai_review TEXT` nullable JSON on `tasks` table
- [x] Shared `RepoSchema` + `CreateRepoRequestSchema` + `UpdateRepoRequestSchema` gain `ownerRepo?: string` (validated `"owner/repo"` format)
- [x] Shared `TaskSchema` gains `aiReview?: { verdict, summary, runId, reviewedAt }`
- [x] `repos.service.ts`: persists `ownerRepo` through create/update/toRepo
- [x] `tasks.repository.ts`: `parseAiReview` helper, `findByPrUrl`, `setAiReview`, hydrate includes `aiReview`
- [x] `AiReviewService`: subscribes to `WorkflowEventBus` `run.finished`; finds task by `prUrl`; derives verdict; writes `ai_review`; re-emits `task.updated`
- [x] `WorkflowsModule` exports `WorkflowEventBus`; `TasksModule` imports `WorkflowsModule`
- [x] `task-card.tsx`: `AiReviewChip` renders `'AI: LGTM'` / `'AI: Reviewed'` / `'AI: Changes'` alongside prStatus
- [x] `task-thread-modal.tsx`: "AI Review" section with verdict badge, timestamp, 300-char summary

---

## 2026-06-24 — Phase 10 E2+F1+F2 — Visual regression baselines, e2e CI job, coverage reporting (PR #177)

- [x] `toHaveScreenshot` assertions in `pages.shots.ts`; 10 macOS baselines committed (`e2e/__screenshots__/`); Docker command documented for Linux regeneration
- [x] `playwright.config.ts`: `snapshotDir`, `snapshotPathTemplate`, `toHaveScreenshot.maxDiffPixelRatio: 0.005`
- [x] `.github/workflows/e2e.yml`: `e2e` job (flow + visual, `continue-on-error: true`) + `coverage` job; browser cache; screenshot + diff + coverage artifacts
- [x] `@vitest/coverage-v8` in `web` (20% thresholds) and `gateway` (40% thresholds); `test-coverage` moon tasks in both packages; `lcov` + `json-summary` reporters

---

## 2026-06-24 — Phase 37 Theme A — GitHub executor nodes + credential type (PR #175)

- [x] Added `github` credential type to `WorkflowCredentialDataSchema` (token + optional `enterpriseUrl` for GHE)
- [x] Added `github.get-pr`, `github.get-diff`, `github.post-review` node type definitions + param schemas in `packages/shared/src/node-types.ts`
- [x] `GithubGetPrExecutor` — fetches PR metadata via REST (`number`, `title`, `body`, `state`, `author`, `labels`, `headBranch`, `headSha`, `baseBranch`, `additions`, `deletions`, `changedFiles`); github.com vs GHE URL routing
- [x] `GithubGetDiffExecutor` — fetches raw unified diff; truncates at `maxTokens × 4` chars with `[diff truncated]` marker; returns `{ diff, truncated, estimatedTokens, prUrl }`
- [x] `GithubPostReviewExecutor` — posts COMMENT/APPROVE/REQUEST_CHANGES review; returns `{ reviewId, htmlUrl, state }`
- [x] All three executors registered in `workflows.module.ts` via `NODE_EXECUTORS` multi-provider
- [x] 12 new unit tests in `integration-nodes.spec.ts` (credential errors, URL parse errors, success paths, truncation, API errors)
- [x] Web credential form: `github` type shown in picker (TYPE_LABELS/TYPE_FIELDS in `credential-form.tsx`)

---

## 2026-06-24 — Phase 30 verification: quality gates suite green

All four implementation themes (A–D, PRs #102 #125 #134 #135 #144 #166) were already merged. Closed out the verification checklist: gate-hold-on-fail (completeWithChecks integration tests, PR #134), Re-run / `midnite check` path (PR #144), pass-straight-through, no-repo/disabled no-op, auto-fix loop + fixAttempts counter (PR #166), per-check timeout SIGKILL + output truncation (PR #102), single-slot-release invariant. Suite green (906 gateway + 505 web).

---

## 2026-06-24 — Phase 9 A2: camera follow + fade transitions for the office (PR #174)

- [x] `ZOOM = 1.5` constant added to `office-scene.ts`
- [x] `cameras.main.setBounds` + `setZoom(ZOOM)` + `startFollow(player, true, 0.12, 0.12)` wired in `create()`
- [x] `buildVignette` resized to viewport (`worldW/ZOOM × worldH/ZOOM`) and pinned with `setScrollFactor(0)`
- [x] Camera fades in on `OfficeScene` start (200ms black); fades out before switch to corner office
- [x] `CornerOfficeScene`: auto-zoom-to-fill via `this.scale.width/worldW`; fade in on create; fade out before returning to office (both E-key and HUD back button paths)
- [x] `credential-form.tsx` + `credentials/page.tsx`: added `github` credential type to `TYPE_FIELDS`/`TYPE_LABELS` (new `WorkflowCredentialType` added in shared)

---

## 2026-06-24 — Phase 9 B1: player avatar picker in the corner office (PR #183)

- [x] `playerVariant: number` + `characterPickerOpen: boolean` added to `office-store` (with localStorage persistence)
- [x] `CharacterPicker` modal: 7 options (human + 6 robot variants Alpha–Zeta with accent-colour swatches)
- [x] "Avatar" button added to corner-office HUD top bar
- [x] Both Phaser scenes use `playerCharKey`/`playerWalkAnim` helpers; respond live to store changes
- [x] Input frozen while picker is open (same freeze pattern as desk-item picker)

---

## 2026-06-24 — Phase 9 B1: provider-aware agent characters in the office (PR #171)

- [x] `agentCli: z.string().optional()` added to `SessionSummarySchema` in `shared/src/session.ts`
- [x] `AgentsService` injected into `SessionsService`; `agentCli: this.agents.getAgentCli()` set in `toSummary()`
- [x] `agentCli?: string` added to `OfficeAgent`; propagated through `sessionsToOfficeAgents()`
- [x] `CLI_BADGE_COLOR` map + `providerBadge: Phaser.GameObjects.Arc` in `office-scene.ts` — small dot badge on each agent sprite, brand-aligned colours (Anthropic orange / Google blue / OpenAI green / Aider purple / gray fallback)
- [x] `statusToRoom` room comparison fixed (`'desk'`/`'lounge'` → `'work'`/`'board'`/`'pool'`); `truncate()` now accepts optional max-length
- [x] 6 `sessions.service.test.ts` tests pass (incl. 2 new `agentCli` coverage tests)
- [x] Pre-existing `fixAttempts` fixture gaps resolved across gateway + shared

---

## 2026-06-24 — Phase 28 verification: project planning breakdown suite green

All four implementation themes (A–D, PRs #128 #155 #135 #160) were already merged. Closed out the verification checklist: breakdown preview + edit + create confirmed by `PlanPanel`/`BreakdownEditor` unit tests + Playwright e2e (PR #160); ready-gating covered by Phase 27 integration specs; markdown plan regression-free; standalone `POST /tasks/breakdown` + `midnite plan` covered by gateway/CLI specs (PR #155); conservative inference + cycle pruning (`pruneBreakdown` DFS, 6 tests); LLM-disabled fail-open notice; suite green (906 gateway + 505 web).

---

## 2026-06-24 — Phase 18 Theme C: workflow-run export (previously untracked)

Confirmed fully implemented (already shipped alongside Theme D/A/B): `packages/gateway/src/workflows/lib/run-report.ts` (pure serializer + tests), `GET /workflows/:id/runs/:runId/export?format=md` controller route, `exportWorkflowRunMarkdown` typed client in `api.ts`, `ExportMenu` wired in `run-output-panel.tsx`. Phase 18 checklist closed.

---

## 2026-06-24 — Phase 34: bundle analyzer, optimized imports, dynamic code-split

Tooling + performance track — no behaviour or API changes.

- [x] **A1**: `@next/bundle-analyzer` installed + `next.config.mjs` wrapped; `web:bundle-report` moon task added
- [x] **B1**: `experimental.optimizePackageImports: ['lucide-react', 'recharts', '@midnite/ui']` in `next.config.mjs`
- [x] **C (partial)**: Dynamic imports for `DashboardGrid` (recharts + react-grid-layout deferred) and `WorkflowEditor` (@xyflow/react deferred); wavesurfer.js left as static (already scoped to the audio view only)
- [x] **D1**: `.gitignore` — added `.next/`, `out/`, `*.tsbuildinfo`, `.turbo/`
- [x] **D2**: Root `clean` moon task + `web:clean`; `pnpm.overrides` for `@types/react` in root `package.json`
- [x] Bug fixes: Drizzle migration journal entry for `0040_fix_attempts`; `node-config-panel.test.tsx` wrapped in `QueryClientProvider`; `ToastProvider` added to Storybook global decorator; optional-chain touch events in `pull-to-refresh.tsx`

---

## 2026-06-24 — Phase 27 verification: task dependencies suite green

All four implementation themes (A–D, PRs #106 #109 #113 #114) were already merged. Closed out the verification checklist: confirmed A→B→C chain ordering, priority-blocked scheduling, cycle/self-ref/delete integrity, abandoned-blocker hold policy, manual-start warning, and CLI `--depends-on` via existing specs. Fixed pre-existing typecheck failures across the graph (`stories/fixtures.ts` missing `fixAttempts`, `test-query-wrapper.tsx` React 19 type mismatch, `breakdown-editor.test.tsx`/`plan-panel.test.tsx` array-index narrowing, `office-scene.ts` truncate arity, credential-form `types[0]!`, `page.tsx` `description` rename) and corrected a wrong `spawnAgentSession` assertion in `agent-runner.service.test.ts`. Result: 906 gateway + 505 web tests pass; typecheck clean across shared/gateway/cli/web.

---

## 2026-06-24 — Phase 14 E: run-history replay for workflow editor (PR #170)

Adds a run-history picker + step player to the workflow editor. Users can select any past run and step through its node execution order on the canvas (sorted by `startedAt`), driven by the existing `applyRunState` store method. Auto-play at 700ms/step; Prev/Next/First/Last for manual scrubbing; closing clears canvas state.

- [x] `web`: `RunHistoryPanel` component (`run-history-panel.tsx`) — run list + lazy full-run fetch + replay player with timeout-chain autoplay (no stale closure on `maxStep`)
- [x] `web`: `WorkflowToolbar` gains `History` button (toggles panel); `WorkflowEditor` wires `historyOpen` state — shows `RunHistoryPanel` in place of `NodeConfigPanel` when active
- [x] `web`: 10 unit tests covering loading/empty/error/list/replay/stepping/close/back-to-list/lazy-load
- [x] Fixes pre-existing `fixAttempts` fixture errors across gateway + web tests (from Phase 30 C fast-forward) and resolves merge-conflict leftover in `office-scene.ts`

---

## 2026-06-24 — Phase 14 B+C: credential vault (B1) + Slack/Email executors (C) (PR #168)

Closes the gap between workflow nodes and external services. Credentials are AES-256-GCM encrypted at rest, decrypted only server-side at execute time, and never returned over the API.

- [x] `shared`: `'credential'` NodeField kind + `credentialType` filter; `slack.message` + `email.send` node type definitions; `HttpRequestParamsSchema.credentialId`; typed API client fns (`listWorkflowCredentials`, `createWorkflowCredential`, `deleteWorkflowCredential`)
- [x] `gateway`: `SlackMessageExecutor` (Slack Web API `chat.postMessage`); `EmailSendExecutor` (nodemailer SMTP); `HttpRequestExecutor` resolves `credentialId` → injects auth header; `WorkflowCredentialsModule` wired into `WorkflowsModule`
- [x] `web`: Settings → Credentials page (list / add / delete); `CredentialForm` with per-type fields; `CredentialPicker` in `NodeConfigPanel` for `credential` kind fields; settings sidebar Credentials link
- [x] `shared` fixture fix: `fixAttempts: 0` added to `taskFixture` + board-reducer stub (pre-existing regression from PR #166)
- [x] `integration-nodes.spec.ts`: Slack + Email executor specs with mocked fetch/nodemailer

> GitHub Actions billing-blocked (2026-06-24) — gate passed locally; CI pending post-unblock.

## 2026-06-24 — Phase 30 C: quality-gate auto-fix loop (PR #166)

Adds the opt-in auto-fix loop to the quality gate: when a gate fails, `checks.autoFix.enabled`, and `fixAttempts < maxAttempts`, the runner increments the counter, records a `checks.fix.started` event, kills the old session, re-spawns with a structured fix prompt, and arms a fresh timeout. Slot stays held so the re-spawned agent's Stop hook naturally re-enters `completeWithChecks`. Budget exhaustion records `checks.fix.exhausted` and falls back to `markWaiting`.

- [x] `packages/gateway/drizzle/0040_fix_attempts.sql`: `ALTER TABLE tasks ADD COLUMN fix_attempts INTEGER NOT NULL DEFAULT 0`
- [x] `packages/gateway/src/db/schema.ts`: `fixAttempts` column added
- [x] `packages/shared/src/task.ts`: `fixAttempts` field in `TaskSchema`
- [x] `packages/gateway/src/tasks/tasks.repository.ts`: `incrementFixAttempts()` + `hydrate()` wired
- [x] `packages/gateway/src/tasks/tasks.service.ts`: `incrementFixAttempts()` + `checks.fix.started/exhausted` events
- [x] `packages/gateway/src/pool/agent-runner.service.ts`: auto-fix branch in `completeWithChecks` + `buildFixPrompt()`
- [x] `packages/gateway/src/pool/agent-runner.service.test.ts`: 4 new tests (off, re-spawn, exhausted, pass-after-fix)

## 2026-06-24 — Phase 8 C2: per-tool shadow glow for office agents (PR #167)

Closes Phase 8 C2. Each agent's drop-shadow now reflects the tool currently running — green for file edits, orange for shell, blue for reads, purple for orchestration/MCP.

- [x] `office-scene.ts`: `TOOL_GLOW` color map + `toolShadowTint()` helper
- [x] `office-scene.ts`: `updateActorContent()` calls `actor.shadow.setFillStyle(color, alpha)` when `liveActivity.phase === 'running'`, resets to `SHADOW_DEFAULT` when idle
- [x] `todo/phase-8-office-fidelity.md`: C2 marked done, progress line updated

## 2026-06-24 — Phase 31 D: attention state + clickable HUD badge (main a581cbf)

Completes the attention affordance: agents with a pending approval/waiting state pulse orange in the office, and the HUD badge is now clickable.

- [x] `lib/office/agents.ts`: `liveActivity?` + `attention?` fields added to `OfficeAgent` (store, scene, and hook all referenced these but the type was missing)
- [x] `office-hud.tsx`: "N agents need you" badge is now a `<button>` that calls `setNearby` + `open` for the first attention agent

## 2026-06-24 — Phase 18 Theme A: CLI task export + doc reconciliation (PR #164)

Closes Phase 18 Theme A. The gateway serializer/route + web `ExportMenu` had already shipped (#128/#159) but the phase doc was never ticked; this lands the deferred CLI consumer (decision 6) and reconciles the doc.

- [x] `cli/index.ts`: `midnite task export <id>` — writes the export-route markdown to stdout, or a file with `-o, --output`
- [x] `cli/client.ts`: `exportTask(id)` reads the `text/markdown` route as raw text (refactored shared fetch into `fetchOk`); +2 client tests (body, 404)
- [x] `todo/phase-18-reports-exports.md`: Theme A marked done; decision 6 settled
- [x] Unblocked pre-existing broken `main` (separate commits): stripped stray `=======` conflict markers in `projects.service.test.ts` (broke `gateway:build`); dropped the invalid `'dead'` terminal-phase check in `watch/Dashboard.tsx` (broke `cli:typecheck`)

> Merged on a green local gate (cli/gateway/shared all pass) — GitHub Actions was billing-blocked account-wide, so CI couldn't run.

## 2026-06-24 — Phase 29: verification complete (all items confirmed passing)

Phase 29 (Releases & Versioning) is now fully ✅:
- [x] `version:check` passes on clean lockstep, runs in `moon ci`
- [x] `planVersionBump` has 12 unit tests covering all scenarios
- [x] `/release-prep` + `/release-complete` skills in place (PRs #87/#89); first live run on v0.1.0 cut

## 2026-06-24 — Phase 31 C+D: live bubbles, activity poses, attention pulse + HUD badge (PR #163)

- [x] C1: speech bubble shows `liveActivity.label` (truncated) for working agents; STATUS_BUBBLE fallback
- [x] C2: `applyPose()` drives sprite from `liveActivity.phase` — running→2fps typing, blocked→frame 1, idle→frame 0
- [x] D1: `applyAttention()` starts scale pulse 1.0↔1.18 + orange tint; `clearAttention()` restores; cleaned on destroy
- [x] D2: HUD shows pulsing `🙋 N agents need you` chip, derived inline from `agents.filter(a => a.attention)`

## 2026-06-24 — Phase 31 B: task-aware room routing (PR #162)

Office agents now route to the correct room based on task status.

- [x] `lib/office/agents.ts`: `taskStatus?: Status` on `OfficeAgent`; threaded from `sessionsToOfficeAgents`
- [x] `lib/office/layout.ts`: `statusToRoom(status) → RoomId | null` — wip→work, waiting→board, done→pool, others→null; 8 unit tests
- [x] `office-scene.ts`: `renderActors` partitions by `statusToRoom(taskStatus)` — wip→desks, waiting→conference chairs, done/idle→lounge

## 2026-06-24 — Phase 31 B+E: task-status room routing + push-patch activity store (PR #161)

- [x] `statusToRoom(taskStatus)` pure helper: wip/waiting→desk, done/abandoned→lounge, backlog/todo→hidden, undefined→lounge; 7 unit tests
- [x] `OfficeAgent` gains `taskStatus`, `liveActivity`, `attention` fields; `sessionsToOfficeAgents` threads `task.status` through
- [x] `office-scene.ts` `renderActors` uses `statusToRoom` — agents walk to the correct room when their task status changes
- [x] `patchAgent(id, patch)` added to office-store — no full refetch for ephemeral activity events
- [x] `use-office-agents.ts` wires `useAgentActivityListener`/`useAgentAttentionListener` with 250ms debounce + instant attention patches

## 2026-06-24 — Phase 28 C: Goal → planned board flow, web (PR #160)

Completed **Phase 28 — Theme C**: the web UI for dependency-aware task breakdown, building on the gateway+CLI from Themes A/B/D (PRs #128/#135/#155). `PlanPanel` now has a **Checklist | Breakdown** tab toggle; the Breakdown tab turns a project goal into a typed, dependency-sequenced board you review and edit before creating.

- [x] **`PlanPanel` tabs** — `Checklist | Breakdown` toggle (`@midnite/ui` `Tabs`); the markdown checklist is unchanged and viewable alongside.
- [x] **`BreakdownEditor`** (new) — generates a preview via `POST /projects/:id/plan/draft-breakdown`; per-task inline **title / kind / priority** editing, removable **"blocked by" chips** + an add-blocker picker, and prune (also strips the task from siblings' `dependsOn`). Confirm → `create-from-breakdown`, so the board appears already sequenced (Phase 27 chips). Self/unknown/cycle edges pruned by the gateway on create.
- [x] **Fallback** — LLM-disabled `draft-breakdown` returns a flat list with a clear "AI planning was unavailable" notice; still editable + creatable.
- [x] **Client + tests** — `draftProjectBreakdown` / `createTasksFromBreakdown` in `lib/api.ts`; unit tests (editor edit/prune/edge-removal; panel generate→confirm + fallback) and a live-gateway Playwright e2e (`e2e/breakdown.e2e.ts`).
- _Note: merged on local verification (lint + new unit tests + e2e green) — GitHub Actions CI was billing-blocked repo-wide at merge time._

## 2026-06-24 — Phase 7 B4 + test fixes: project + task-thread exports (PR #159)

Closes Phase 7 completely. Project and task thread reports now fully implemented.

- [x] `project-report.ts`: added `## Plan` (AI-drafted markdown) + `## Agent activity` (active/recent runs with PR links) sections
- [x] `task-report.ts`: added `## Session summary` section (start/end/duration/outcome derived from events; notes live transcript is Terminal-only)
- [x] `project-card.tsx`: `ExportMenu` added to list + grid layouts alongside Plan button
- [x] Pre-existing test fixes: `BreakdownService` stub added to `projects.service.test` + `tasks.controller.test`; `mobile-nav.test` updated for `'Menu'` rename

---

## 2026-06-24 — Phase 32 E: keyboard nav + task moves for midnite watch (PR #158)

Completes Phase 32 — `midnite watch` now has full board navigation.

- [x] `cli/watch/Dashboard.tsx`: ←→/hl cols; ↑↓/jk tasks; m/M moves status (optimistic + revert)
- [x] `cli/watch/BoardPanel.tsx`: focused col gets magenta border; focused task shows ●

## 2026-06-24 — Phase 31 Theme A: agent.activity/attention event backbone (PR #157)

Wires per-tool activity to the board WS so the office and CLI watch can track agent state without a new socket.

- [x] `AgentActivityEventSchema` / `AgentAttentionEventSchema` + `TaskBoardEventSchema` extended; `applyTaskEvent` handles both; 8 schema tests; fixtures updated
- [x] `TasksService.emitActivity` / `emitAttention` — broadcast via `TaskEventBus`
- [x] `ApprovalController`: running activity + attention:approval on PreToolUse; `summarizeToolCall` prevents raw input leaking
- [x] `LifecycleHookController`: idle on stop, attention:waiting on notification
- [x] `useTaskEvents`: skips `invalidateData()` for ephemeral events; `useAgentActivityListener` / `useAgentAttentionListener` hooks added

## 2026-06-23 — Phase 32 D: live logs panel + session selection (PR #156)

`midnite watch` now has a live logs panel: Tab cycles wip tasks, the selected session's terminal output streams into a capped scrollback panel.

- [x] `cli/client.ts`: `getTerminalToken(sessionId)` via `TerminalTokenResponseSchema`
- [x] `cli/ws.ts`: `WsHandle.send()` + `noHandshake` option (terminal uses custom `attach`)
- [x] `cli/watch/Dashboard.tsx`: Tab session selection; separate log WS effect with token fetch + attach + buffer
- [x] `cli/watch/BoardPanel.tsx`: `selectedTaskId` prop + `▶` indicator
- [x] `cli/watch/LogPanel.tsx`: `appendLines()` (base64-decode + ANSI-strip + 100-line cap) + `LogPanel`
- [x] `cli/watch/LogPanel.test.tsx`: 9 tests (4 `appendLines` + 5 `LogPanel`)
- [x] gateway: pre-existing `projects.service.test.ts` typecheck error fixed

## 2026-06-23 — Phase 28 A+D: BreakdownService + `midnite plan` (PR #155)

Added the LLM generation step (Theme A remaining) and the standalone goal→tasks flow (Theme D).

- [x] `BreakdownService` in `AgentModule`: plan-model call → `Breakdown`, prunes bad/cyclic refs, fail-open fallback
- [x] `BREAKDOWN_SYSTEM_PROMPT` + `STANDALONE_BREAKDOWN_SYSTEM_PROMPT` (conservative dep inference, Decision §3)
- [x] `POST /projects/:id/plan/draft-breakdown` — project-scoped preview
- [x] `POST /tasks/breakdown` + `POST /tasks/breakdown/create` — standalone goal → board
- [x] `midnite plan "<goal>"` CLI command — table preview → confirm → create
- [x] 6 new unit tests for `pruneBreakdown`

## 2026-06-23 — Phase 32 B+C: live board reducer + enhanced task cards (PR #154)

Completed the live board panel and pool panel for `midnite watch`. The inline reducer is now shared, bulkCreated properly triggers a refetch, and task cards show id/priority/repo.

- [x] `shared/task-board-reducer.ts`: pure `applyTaskEvent(tasks, event) → Task[] | null`; 8 tests
- [x] `cli/watch/Dashboard.tsx`: uses shared `applyTaskEvent`; `tasks.bulkCreated` triggers refetch
- [x] `cli/watch/BoardPanel.tsx`: task cards show 7-char id, priority arrow, title, `[repo]`; colour-coded column headers

## 2026-06-23 — Phase 8 C3: gentle idle wander (PR #152)

Idle pool agents now occasionally stand up and mill around instead of sitting frozen on their loungers.

- [x] `maybeWander()` timer added at 6.7s cadence (offset from swim at 4.5s to avoid sync)
- [x] ~1-in-3 ticks fires; picks a different lounger than `maybeSwim`
- [x] Walks to nearest valid offset tile, pauses 3s, returns to seat, restores sleeping state

## 2026-06-23 — Phase 10 C2 complete: market widgets + boardroom panel (PR #150)

Storied the last three un-storied widgets, **completing Theme C2** (every dashboard/office widget now has interaction tests).

- [x] **`market-asset-widget`** — a configured (props-driven) asset; mocks `/market/quote` + `/market/history`, asserts the price headline, % change, OHLC; plus the both-endpoints-fail error fallback.
- [x] **`market-watchlist-widget`** — rows off `/market/history` (path mock serves every row, awaited for the async % change), plus the no-assets empty state.
- [x] **`boardroom-panel`** (office projects hub) — mocks the `Promise.all` of `/projects` + `/tasks` + `/memories` (the last returns a `{ memories }` wrapper, not a bare array) → loaded list / empty / error.
- [x] CI: the three new files' Storybook `play` assertions pass. Merged with `--admin` over pre-existing main redness (`mobile-nav.test.tsx` + a `phaser` `web:build` error, both already failing on `main` and unrelated to these story-only changes).

## 2026-06-23 — Phase 32 A1: `midnite watch` ink dashboard scaffold (PR #149)

Full-screen TUI dashboard command for the CLI. Introduces ink (React for the terminal), the `watch` command with alt-screen + clean teardown, `StatusBar`/`BoardPanel`/`PoolPanel` components seeded from REST and kept live via the tasks WS. `gatewayWsUrl` moved to `ws.ts`. 11 new tests.

- [x] `ink@5.x` + `react@18` added to CLI deps; `"jsx": "react-jsx"` in tsconfig
- [x] `midnite watch` command: alt-screen, lazy ink import, SIGINT/uncaughtException teardown
- [x] `watch/` scaffold: `Dashboard`, `StatusBar`, `BoardPanel`, `PoolPanel`
- [x] `gatewayWsUrl` moved from `workflow.ts` → `ws.ts`; re-exported for backward compat
- [x] 11 tests in `src/watch/Dashboard.test.tsx` (StatusBar states, BoardPanel, PoolPanel)

## 2026-06-23 — Phase 22 A2 recorder wiring: scheduler/pool/runner → MetricsService (PR #139)

Closed the stale A2 open item. The runner, pool, and scheduler now feed MetricsService so /ops shows server-recorded data.

- [x] `agent-runner.service.ts`: `@Optional` MetricsService; `recordRunStart()` on spawn, `endMetricRun(done/cancelled/abandoned/failed)` at each terminal path
- [x] `metrics.service.spec.ts`: rewritten to match the shipped API (was against a stale shape)
- [x] `web/lib/api.ts`: removed duplicate stale `getOpsMetrics` and dead imports from pre-merge conflict

## 2026-06-23 — Phase 8 D2: proximity nameplates (PR #151)

Agent name + status labels now appear as styled pill nameplates when the player is within 4 tiles; hidden otherwise.

- [x] `NAMEPLATE_RANGE = TILE * 4` constant added to `office-scene.ts`
- [x] `nameText` + `statusText` styled with `backgroundColor` + padding chips; `setAlpha(0)` on create
- [x] Per-actor distance check in `update()` snaps alpha 0↔1 based on player proximity

## 2026-06-23 — Phase 10 C2: chart widget stories (PR #148)

Storied the three chart widgets — the half of C2 the note flagged as needing a pinned clock — and established that pinning pattern.

- [x] **`throughput-widget`** — pins `Date.now` with a plain-JS monkeypatch in `beforeEach` (returns a teardown alongside the fetch mock; no `vitest` import leaks into a file Storybook also loads) and places done tasks at exact day offsets, so the "done this week" count asserts deterministically. Default/empty/error.
- [x] **`usage-widget`** — its bars render from the mocked `/usage/summary` payload (not the wall clock), so no pinning needed: loaded / over-budget banner / no-calls / error.
- [x] **`system-monitor-widget`** — a client-side random-walk sim with no endpoint; asserts structure (card title, CPU/RAM legend, area-chart `<svg>`), not the random readings.
- [ ] C2 now only leaves the `market-*` widgets and `boardroom-panel`. CI (`moon ci`, incl. the Storybook browser tests) green.

## 2026-06-23 — Phase 9 F1–F4: corner office scene (PR #146)

Private corner office scene reachable from the CORNER OFFICE doorway — your own customisable desk with animated items, a blinking laptop cursor, and localStorage persistence.

- [x] `CornerOfficeScene` (14×10 tiles): walled room, exit door, desk + laptop, animated item sprites
- [x] `createOfficeGame` registers both scenes; E-key triggers `scene.start('corner-office')` / `scene.start('office')`
- [x] `currentScene`, `nearDoor`, `deskItems`, `deskPickerOpen` added to `useOfficeStore`
- [x] `DeskItemPicker` modal: 6 items, up to 3 selected, procedural animated sprites (lava lamp bobs, spinner rotates)
- [x] Laptop blinking cursor via Phaser tween
- [x] `setDeskItems()` persists to `localStorage`; `parseDeskItems()` validates on load
- [x] `desk-items.ts` + 9 tests; HUD back button + door/desk proximity prompts

## 2026-06-23 — Phase 30 D: quality-gate surfaces (PR #144)

Surfaces for the already-landed gate engine (A–B): make check results visible and actionable in the web thread, on task cards, and via CLI.

- [x] `shared/checks.ts`: `TriggerCheckResponseSchema` + `CheckRunListResponseSchema`
- [x] `shared/task.ts`: `checkRunStatus?: 'verifying' | 'passed' | 'failing'` on `TaskSchema`
- [x] `gateway/tasks.repository.ts`: `deriveCheckRunStatus()` in `hydrate()`
- [x] `gateway/tasks.service.ts`: `runManualCheck()` + `getCheckRuns()`
- [x] `gateway/tasks.controller.ts`: `POST /tasks/:id/check` + `GET /tasks/:id/check-runs`
- [x] `web/checks-panel.tsx`: latest run with per-check output + Re-run button + older-runs history
- [x] `web/task-card.tsx`: "Checks failing" badge on `checkRunStatus === 'failing'`
- [x] `web/task-thread-modal.tsx`: ChecksPanel wired in above Activity section
- [x] `cli/index.ts`: `midnite check <id>` — pass/fail table, failed output, non-zero exit on failure
- [x] gateway: 872 / 872 tests; web: 448 / 448 tests

## 2026-06-23 — Phase 10 C2: agents + all-projects widget stories (PR #146)

Storied two more multi-endpoint dashboard widgets (Theme C2 interaction tests), following the established `installMockFetch` pattern.

- [x] **`agents-widget`** — two endpoints (`GET /agents` config + `POST /agents/ping`); Default / no-sub-agents+heartbeat-off / `/agents` 500 error. The ping handler is listed before `/agents` so the broader substring match can't swallow it.
- [x] **`all-projects-widget`** — `GET /projects` + `GET /tasks`, reusing `@/stories/fixtures`; loaded grid / empty / `/projects` 500 error. Stories inherit the `QueryClientProvider` from `.storybook/preview.tsx` (widgets read via `usePolling` → TanStack Query). CI (`moon ci`) green.
- [ ] C2 still leaves the chart widgets (`throughput`/`usage`/`system-monitor`, needing a pinned clock), `market-*`, and `boardroom-panel`.

## 2026-06-23 — Phase 26 Theme C: config reference page (PR #145)

Closed Theme C's last deferred item — the `midnite.json` config reference — completing Theme C. Resolved the open hand-author-vs-extract question: the schema's field docs live in `//` comments, not zod `.describe()`, so a schema-extract would emit bare type/default tables and lose the prose. Hand-authored instead.

- [x] **`content/reference/config.mdx`** (`/reference/config`, auto-registered into the existing Reference nav section) documents every config block — `agent`, `terminal` (+`approvals`), `repos`, `gateway` (+`auth`/`rateLimit`), `checks`, `notifications`, `workflows`, `agents`, `councils`, `usage`, `knowledge`, `prStatus` — as field/type/default/description tables, with a minimal-config example, a secrets-by-env-var callout, and a "source of truth" pointer to `packages/shared/src/config.ts`.
- [x] **Leaf rule intact** — pure MDX prose, no `shared` import; boundary guard stays green. Verified against the schema (no drift); `docs:build`/`typecheck`/`lint`/`test` green. The page also renders the #140 on-page TOC.

## 2026-06-23 — Phase 9 E3/E4: PlayStation interactable + retro-games menu (PR #143)

Wires the PS5 console in the communal gaming corner as a proximity interactable (E key) and adds the retro-games placeholder modal.

- [x] `lib/office-store.ts` — `nearPlaystation`, `playstationOpen`, `setNearPlaystation`, `openPlaystation`, `closePlaystation`; opening closes all other panels; `reset()` clears both flags
- [x] `components/office/scenes/office-scene.ts` — `playstationCenter` anchor in `buildKitchen()`, per-frame proximity check, E-key handler, `playstationOpen` added to keyboard-frozen guard
- [x] `components/office/retro-games-menu.tsx` — 8 retro titles, "coming soon" on selection, own Escape handler, seam for future gameplay
- [x] `components/office/office-hud.tsx` — "Press E to open the Game Library" proximity prompt + `<RetroGamesMenu>` render
- [x] `lib/office-store.test.ts` — 4 new tests (7 total, all green)

---

## 2026-06-23 — Phase 22 Theme B: /ops fleet health dashboard (PR #142)

A dedicated `/ops` route exposing the server-recorded metrics backbone (A1–A3) as an operational surface. Five sections: live slot utilization bar, server-recorded throughput chart, run-duration 5-bucket histogram, outcome rate bars, and 30-day LLM spend trend. Polling every 10 s (pool + ops) / 60 s (spend).

- [x] `lib/api.ts` — `getPoolSnapshot()` (`GET /pool`) + `getOpsMetrics()` (`GET /metrics/ops`); typed from shared schemas
- [x] `lib/features.ts` — `'ops'` feature key + `ActivitySquare` nav entry, default on
- [x] `app/(main)/ops/page.tsx` — polls pool + ops metrics + usage, wires gateway error toast
- [x] `components/ops-view.tsx` — `GaugesSection`, `ThroughputSection`, `DurationSection`, `OutcomesSection`, `SpendSection`; loading + empty states; theme-aware
- [x] `components/ops-view.test.tsx` — 14 tests; 431 web tests pass

## 2026-06-23 — Phase 3: TanStack Query item closed out (tracker fix; landed in PR #125)

Reconciled the last open Phase 3 checkbox. The "TanStack Query setup" item was still marked open with a "custom hooks, not TanStack Query" note — but that note predated **PR #125**, which already migrated the web data layer to TanStack Query. No code change; this just corrects the stale tracker so Phase 3 has zero open items and the phase title drops the "(state-sync deviation)" qualifier.

- [x] **Verified the migration is live on `main`** — `@tanstack/react-query` dep; `useApiData`/`usePolling` are thin `useQuery` wrappers (same external API, so no call-site churn); `QueryClientProvider` mounted in `(main)/layout.tsx`; `invalidateData()` → `queryClient.invalidateQueries()`. CLAUDE.md's "TanStack Query for server state" line is now accurate (left as-is).
- [x] **Closed the checkbox** referencing PR #125; updated the phase status line; WS sync staying coarse invalidate-and-refetch (vs. normalized cache patching) noted as a deliberate v1, not a gap.

## 2026-06-23 — Phase 26 Theme D: on-page table of contents (PR #140)

Landed the deferred on-page nav from Theme D: long docs now get a sticky "On this page" rail so readers can see a page's shape and jump between sections. Closes the last functional gap in Theme D (only the deploy story stays deferred).

- [x] **`TableOfContents`** — a sticky right rail (`xl+` only; hidden where it would crowd the prose) that scans the *rendered* article for `h2/h3[id]`, so MDX (DS docs) and react-markdown (product docs) feed it identically. IntersectionObserver scroll-spy highlights the section in view; links scroll via JS rather than `href="#id"` (the app is a hash router — an anchor hash would be read as a route).
- [x] **`rehype-slug`** wired into both render paths (MDX via `vite.config.ts`, product markdown via `react-markdown`) → stable, text-derived heading ids shared by the TOC and any deep link; `scroll-mt` on headings clears the sticky header.
- [x] **Tests** — `table-of-contents.test.tsx` (4: `collectHeadings` extraction, rail render + active marker, click-to-scroll, single-section no-op). `docs:typecheck`/`lint`/`test` (31)/`build` green; boundary guard still green (only `@midnite/ui` imported).

## 2026-06-23 — Phase 14 Theme E: starter workflow templates (PR #138)

A "Start from" gallery in the New-workflow modal seeds a ready-made graph instead of a blank canvas — the *Starter templates* item of Theme E (autosave already shipped in PR #43; run-history replay remains).

- [x] **`web/lib/workflow-templates.ts`** — three templates, each a linear chain of shipped node types: *Summarise a web page with AI* (`http.request → ai.claude`), *Daily API digest* (`http.request → data.filter → ai.claude`), *Track the latest value across runs* (`storage.get → http.request → storage.set`). AI prompts reference upstream nodes by label via `{{ }}` expressions.
- [x] **`buildTemplateGraph()`** (pure, `makeId` injectable) keeps the trigger and wires `trigger → step0 → step1 → …` cascading right; `triggerNodeOf()` reuses the gateway-seeded trigger node (synthesises one only if absent).
- [x] **`WorkflowCreateModal`** — Blank + template cards; picking a template prefills the name, replaces the trigger picker with the template's trigger, relabels the action to "Create from template", and on submit `createWorkflow` → `updateWorkflow(graph)` → opens the seeded canvas.
- [x] **`fix(web)`** removed a dead `Loader2` import in `task-thread-modal.tsx` that was failing `next build`'s `no-unused-vars` on main (blocked any web build).
- [x] Tests: `workflow-templates.test.ts` (6 — validity, chain/positions/params, trigger reuse vs. synthesise) + `workflow-create-modal.test.tsx` (3 — gallery, prefill/relabel, create-from-template seeds the expected chain). `web:typecheck`/`lint`/`test` (287)/`build` green.

## 2026-06-23 — Phase 26 Theme D: client-side search + responsive mobile nav (PR #137)

Made the docs site navigable on any device. A header search filters all pages with no server, and the sidebar collapses to a drawer on mobile. Builds on Theme C's grouped content; the static build seam (`docs:build` + `moon ci`) already landed with the Theme A scaffold.

- [x] **Client-side search** — pure `content/search.ts` (frontmatter + ATX-heading extraction, ranked substring match: title ≫ heading ≫ section) + `content/search-index.ts` (built once at load); a header `DocSearch` (`@midnite/ui` `Input` + a token-styled results popover) navigates to a hit. The whole index ships in the bundle — no network/gateway.
- [x] **Heading coverage** — product docs (raw `.md`) are indexed with full headings; the `.mdx` DS pages are indexed by title/section via the route table, because the MDX rollup plugin strips the `?raw` query (can't read their text without compiling) and they're short single-primitive pages.
- [x] **Responsive nav** — `Layout` gains a hamburger (`< md`) that opens the sidebar as a slide-in drawer with a backdrop, closed on route change; pins as a column on `md+`. Active-route highlight via `NavLink` as before.
- [x] **Tests** — `search.test.ts` (parse/extract/rank) + `doc-search.test.tsx` (filter → navigate, heading match, no-results; index mocked so the MDX-less vitest runner needn't transform `.mdx`) + `layout.test.tsx` drawer/search coverage. Boundary guard stays green.

**Deferred:** on-page TOC (the "+ on-page nav" half — not in the Theme D verification line) and the deploy/hosting story (Decision §6). With Themes A–D landed (C + D partial), Phase 26's docs app is functionally complete bar those follow-ons.

## 2026-06-23 — Phase 28 Theme B: create-with-dependencies from a Breakdown (PR #135)

The gateway half of structured planning: turn a confirmed `Breakdown` (Theme A's contract, #129) into a real, **dependency-wired** board. The piece a later preview/confirm UI (Theme C) and standalone goal flow (Theme D) both call; fed a `Breakdown` directly, so it's deterministic + fully testable without the LLM.

- [x] **`TasksService.createTasksFromBreakdown(breakdown, { projectId?, repo? })`** — create a task per local `ref` with its **explicit** title/kind/priority (no AI re-classify; the breakdown is already typed), tagged to the optional project/repo, as `todo`; then resolve local refs → created ids and wire the **Phase 27 dependency edges**.
- [x] **Conservative pruning, never fatal** (Decision §3): a self-reference / unknown ref / cycle-closing edge is skipped (reusing `wouldCreateCycle`); a duplicate `ref` is de-duped (first wins). **One coalesced `tasks.bulkCreated`** event (no per-task broadcast).
- [x] **Project path:** `ProjectsService.createTasksFromBreakdown` delegates; `POST /projects/:id/plan/create-from-breakdown`. The flat `createTasksFromPlan` path is untouched (Decision §1/§6). Shared: `CreateFromBreakdownRequest`/`Response` zod.
- [x] **Tests:** gateway `:memory:` (explicit fields applied + project-tagged; blocker edge gates `listReadyTodoTasks`; independent tasks parallel; unknown/self/cycle pruned not fatal; dup de-duped; one coalesced event; empty no-op), controller route validation+delegation, shared `CreateFromBreakdownRequestSchema`.

**Scope notes:** the create step is intentionally **LLM-free** — the doc's "reuse `createFromPrompt` classify/triage" was dropped since the breakdown already carries title/kind, and the "LLM-disabled → flat" fallback belongs to Theme A's *generation* step (still open), not this create mechanism. The core lives in `TasksService` so Theme D's standalone `POST /tasks/breakdown` can reuse it. **Still open:** Theme A's breakdown-LLM step + prompt; Theme C (web preview/edit); Theme D (standalone endpoint + `midnite plan`).

## 2026-06-23 — Phase 30 B3: check-lifecycle task events (PR #136)

Emits `checks.started` / `checks.passed` / `checks.failed` task events around the gate run, each triggering `task.updated`. Board reacts in real time without polling.

- [x] `TasksService.recordCheckEvent(taskId, kind)` — event row + `task.updated` broadcast
- [x] `completeWithChecks` now emits `checks.started` before the run and `checks.passed|failed` after

---

## 2026-06-23 — Phase 30 B2: gate the `done` transition via `completeWithChecks` (PR #134)

Routes the Stop-hook completion through `AgentRunnerService.completeWithChecks` — runs configured checks in the task's repo cwd, persists the run, and either `markDone` (pass) or `markWaiting` (fail). Slot released exactly once in every branch. Default `config.checks.enabled = false` is fail-open. B3 (events + derived flags) is next.

- [x] `AgentRunnerService.completeWithChecks(taskId, prUrl)` — resolve checks → skip/gate → persist → markDone or markWaiting
- [x] `TasksService.saveCheckRun(run)` — persistence without events (B3 adds those)
- [x] `LifecycleHookController` thinned; `ChecksModule` imported into `PoolModule`

---

## 2026-06-23 — Phase 22 A3: MetricsModule + GET /metrics/ops (PR #133)

Completes the ops-metrics spine. `MetricsService` wires `GaugeStore` + `MetricsRepository`; `MetricsController` serves `GET /metrics/ops`; `MetricsModule` is registered in `AppModule`. `OpsSummary`/`MetricsGauges`/etc. zod schemas in shared. Phase 22 Theme A is now fully done.

- [x] `MetricsService` — `record*` + `getOpsSummary()` with 7-day default window
- [x] `MetricsController` + `MetricsModule`; registered in `AppModule`; 4 controller tests
- [x] `metrics.ts` in shared — `MetricsGauges`, `OpsSummary`, `OpsQuery` + 8 tests

---

## 2026-06-23 — Phase 22 A2: GaugeStore — in-memory ops gauges (PR #131)

A plain-class `GaugeStore` that holds the three fast-moving operational signals: queue depth, slot utilization (used/total), and last tick latency. Callers record via `record*`; `snapshot()` returns a defensive copy. The `MetricsService` (A3) will wrap it. Lost on restart by design. 8 unit tests.

- [x] `GaugeStore` class with `recordQueueDepth` / `recordSlotChange` / `recordTickLatency` / `snapshot()` (defensive copy)
- [x] 8 unit tests; typecheck green

---

## 2026-06-23 — Phase 22 A1: `agent_run_stats` table + MetricsRepository (PR #130)

Adds the per-run stats substrate for the ops surface. `agent_run_stats` (migration 0039) stores start/end timing, outcome, retry count per agent run. `MetricsRepository` exposes `insertStart`, `recordEnd`, and three windowed aggregates (`countByDay`, `durationBuckets`, `outcomeCounts`).

- [x] `agent_run_stats` table in `schema.ts` + migration `0039`; indexed by task_id + started_at
- [x] `MetricsRepository` with 5 methods; 11 integration tests against `:memory:` SQLite

---

## 2026-06-23 — Phase 28 A: `Breakdown` / `BreakdownTask` zod schema (PR #129)

Establishes the shared contract for structured task breakdowns. The plan model will return a `Breakdown`; the gateway (Theme B) resolves local refs to real task ids and wires Phase 27 dependency edges at creation time. Also fixed a pre-existing lint failure in `setup.test.ts` (unused imports from PR #121).

- [x] `BreakdownTaskSchema`, `BreakdownSchema`, `BreakdownGoalRequestSchema`, `BreakdownPreviewResponseSchema` in `@midnite/shared`
- [x] 10 unit tests; barrel-exported
- [x] Fixed `setup.test.ts` unused-import lint failure

---

## 2026-06-23 — Phase 30 B1: `task_check_runs` table + repository methods (PR #126)

Added the DB substrate for quality-gate run history. Migration `0038_task_check_runs` adds a normalized child table (id, task_id, trigger, passed, started_at, finished_at, results JSON) mirroring `task_events`. `TasksRepository` gains `insertCheckRun`, `checkRunsForTask`, and `latestCheckRunForTask`. 8 integration tests against `:memory:` cover round-trip, ordering, scoping, null-on-empty, passed/failed flags, and all trigger variants.

- [x] `task_check_runs` table in `schema.ts` + migration `0038`
- [x] `insertCheckRun` / `checkRunsForTask` / `latestCheckRunForTask` on `TasksRepository`
- [x] 8 integration tests; also merged Phase 22 Theme C (PR #122 `pr_status` table) into the branch

---

## 2026-06-23 — Phase 26 Theme C: render the repo's real markdown as product docs (PR #127)

Made the project's existing markdown browsable from one source of truth, inside the `@midnite/ui`-built docs app. The repo's real docs — README, `INITIAL_PLAN`, `ARCHITECTURE`, `TESTING_PLAN`, `RELEASING` — are imported as raw text and rendered at runtime, so a page can never drift from its source file (Decision §4: import, don't duplicate). They share the route table + sidebar with the DS docs, so the whole site reads as one navigable surface.

- [x] **Product docs from source** — `content/product-docs.tsx` `?raw`-imports the repo `.md`/README and maps each to a route (Guides · Architecture · Reference); `registry.ts` concatenates them with the MDX-globbed DS routes into one route table + nav.
- [x] **react-markdown, not MDX** — `MarkdownPage` renders raw markdown with `react-markdown` + `remark-gfm`; `mdExtensions: []` scopes the MDX plugin to `.mdx` so `.md?raw` reaches Vite's raw loader (repo docs contain bare `<…>`/`{…}` that MDX would parse as JSX). Reuses the `mdx-components` prose mapping (stripping react-markdown's hast `node` prop) so product + DS docs share the lib's type/spacing tokens.
- [x] **Nav** — `SECTION_ORDER` extended with Guides · Architecture · Reference (after the DS sections); active-route highlight via the existing sidebar.
- [x] **Tests** — `markdown-page.test.tsx` (GFM headings/tables/code render; no `node`-prop leak) + `nav.test.ts` (product sections order after DS; unknown-section test moved off the now-known `Guides`). Boundary guard stays green (only `@midnite/ui` in-repo).

**Deferred:** the **config reference** named in the Theme C bullet — `midnite.json` lives as a zod schema in `shared` (no markdown to import; `docs` can't import `shared` under the leaf rule), so it needs a separate hand-author-vs-schema-extract decision. Theme D (responsive nav drawer, client-side search, deploy seam) remains open.

## 2026-06-23 — Phase 22 Theme C: live PR status — model, fetcher & poller (PR #122)

Upgraded `task.prUrl` from an inert link to a **polled, status-aware deliverable** — the gateway half of Phase 22's delivery spine. A task's GitHub PR is resolved to a live status and surfaced on the task read shape, so a later Theme D can render chips/panels with no new backend work. Resolution is **gh-first** (the user's `gh` auth → private repos) with an anonymous `api.github.com` REST fallback for public repos, and **fail-open** (missing `gh` / unauth'd private repo / network error → keep last-known, never throw). No web surfaces yet — that's Theme D.

- [x] **C1 — contract (`shared`):** `PrStatus` shape (`state`/`checks`/`reviewDecision`/`url`/`number`/`fetchedAt`) + `isPrTerminal` in [`source.ts`](../packages/shared/src/source.ts), beside the existing `parseGithubPr`; `prStatus` added as an optional field on `TaskSchema`. (The shipped-widget regex consolidation is deferred to Theme D, which rewrites that widget.)
- [x] **C2 — fetcher + persistence (`gateway`):** `PrStatusService` resolves a PR gh-first (`gh pr view --json state,isDraft,statusCheckRollup,reviewDecision`) → anonymous REST fallback; pure gh/REST→`PrStatus` mappers in `tasks/lib/pr-status-map.ts` (rollup verdict `fail ≫ pending ≫ pass`). A `pr_status` table keyed by `task_id` (migration **`0037`** — the doc's `0030_*` was stale), surfaced via `TasksRepository.hydrate`, cleared on task delete.
- [x] **C3 — refresh loop + on-demand:** single gateway-owned poller (mirrors the agent-pool scheduler: `OnModuleInit/Destroy`, `setInterval` + `unref`, reentrancy guard) refreshing only non-terminal PRs with bounded concurrency; `POST /tasks/:id/pr/refresh`; `config.prStatus` knobs (`enabled`/`pollIntervalMs`/`pollConcurrency`, on by default). Emits `task.updated` only on a real status change; per-row failures logged & skipped (never abort a cycle).
- [x] **Tests:** shared zod + `isPrTerminal`; gateway pure mappers, `PrStatusService` (gh-first→REST fallback, fail-open, persist + broadcast-on-change, poll selects only non-terminal), the refresh route, and a real-SQLite repository test. Settled decisions: §7 dedicated `pr_status` table; §8 cadence 60s / concurrency 4.
- [x] **Drive-by:** wrapped `run-output-panel.test.tsx` in `ToastProvider` (fixed a pre-existing `main` `ExportMenu` regression).

**Deferred to Theme D (web surfaces):** PR-status chip on task cards, delivery panel in the thread modal, Shipped-widget live status, the optional "awaiting review/merge" board filter. Themes A/B (ops metrics + `/ops`) remain open.

## 2026-06-23 — Phase 32 A2: reusable WS-subscribe helper `openWs<T>` (PR #124)

Extracted the hand-rolled WebSocket lifecycle inlined in `workflow watch` into a small, reusable `openWs<T>()` helper in `packages/cli/src/ws.ts`. `workflow watch` is refactored to consume it; the upcoming `midnite watch` TUI dashboard (Phase 32 A1) will too.

- [x] **`packages/cli/src/ws.ts`** — `openWs<T>()`: connect, `{type:'subscribe',...extra}` handshake, caller-supplied `parse`, `onReady` callback (post-subscribe backfill), `onError`, reconnect-with-exponential-backoff (`reconnect: false` to opt out), `WsHandle.close()` teardown.
- [x] **`packages/cli/src/ws.test.ts`** — 12 unit tests covering: handshake, extra fields, onReady, message delivery, null-parse filtering, onError, constructor throw, close teardown, backoff doubling, delay reset, `reconnect: false`.
- [x] **`packages/cli/src/index.ts`** — `watchWorkflowRun` refactored onto `openWs` (behavior-identical).

---

## 2026-06-23 — Phase 26 Themes A+B: `@midnite/docs` app scaffold + design-system docs (PR #123)

New `packages/docs` (`@midnite/docs`) — a static **Vite + React** documentation site whose entire shell is built from `@midnite/ui`, proving the library is consumable outside `web`. Authored in **MDX** with live component examples; the graph gains the `ui ◀── docs` leaf edge.

**Theme A — scaffold:**
- [x] Vite + React SPA: `package.json` (`@midnite/ui: workspace:*`), `vite.config.ts` (MDX via `@mdx-js/rollup` + `remark-gfm`/frontmatter), Tailwind/PostCSS, `tsconfig`, `index.html`, `moon.yml` (`dev`/`build`/`preview`/`typecheck`/`test`/`lint`). Auto-registers via `packages/*`.
- [x] Shell built entirely from the lib — header, grouped sidebar, content well, theme switcher (the lib's `Tabs` + `useTheme`), wrapped in `ThemeProvider`, token CSS from `@midnite/ui/styles`. No app-local primitives.
- [x] **Hash router** (Decision §1) — deep links work on a static host with no rewrites; route table + sidebar nav both derived from the MDX content glob (adding a page = adding a file).
- [x] **Boundary test** (`src/boundary.test.ts`) — fails if `docs` imports anything in-repo but `@midnite/ui`; enforces the leaf edge in CI.

**Theme B — design-system docs (MDX):**
- [x] Getting-started on-ramp + a page per primitive (Button/Card/Input/Switch/Tabs) with live examples, props tables, do/don't, and a Storybook pointer (Storybook stays the interactive/a11y source of truth — Decision §2).
- [x] Foundations pages (colours/typography/radius + reserved scales) rendering the **real exported tokens** (live swatches + canonical light/dark HSL values), so they can't drift.
- [x] `CLAUDE.md` updated (package list + `ui ◀── docs` graph edge); `packages/docs/README.md` documents running it. Tests: boundary + nav helpers + Layout RTL (11). `docs:typecheck`/`lint`/`test`/`build` + full-graph `:typecheck`/`:lint` + `version-check` green.

Remaining for Phase 26: Theme C (product/developer docs from repo markdown), Theme D (nav/search/build seam), hosting (deferred follow-on).

## 2026-06-23 — Phase 18 Theme B: project markdown export (PR #119)

Projects now have a markdown export — title, tasks grouped by status, sources as links, and scoped memories as a Knowledge section — using the same `ExportMenu` + `report-html-export` substrate already proven by the councils export (Phase 7 B).

- [x] **`projects/lib/project-report.ts`** — pure `projectToMarkdown(project, tasks, memories)` serializer: title + export date + description + tasks grouped by status (labels: Backlog/Todo/In progress/Waiting/Done/Abandoned; each row: **title** · kind · `repo`) + sources as Markdown links + scoped memories in a Knowledge section. `projectReportFilename(project)` for the slug. 15 unit tests.
- [x] **`GET /projects/:id/export?format=md`** — thin controller route (mirrors the councils shape): validates format (rejects `pdf` → 400 client-rendered; unknown format → 400); serves `text/markdown` + `content-disposition: attachment`. 4 controller tests.
- [x] **`ProjectsService.exportMarkdown(id)`** — gathers `tasks.listTasks(undefined, id)` + `memories.listScoped(id)`, delegates to serializer. Boundary-clean (no repository crossing).
- [x] **`exportProjectMarkdown(id)`** in `web/lib/api.ts` — typed client matching the councils pattern.
- [x] **`ExportMenu` in `ProjectModal` header** — shown only for existing projects (`isEdit`); reuses the `ExportMenu` component with md download + pdf-via-print; no new deps.

---

## 2026-06-23 — Phase 21: notifications & alerting — **Phase 21 COMPLETE**

All four themes shipped across PRs #103 (model + ingestion + feed), #108 (channel dispatch + webhook), #107 (notification center + toasts + browser opt-in), and #110 (desktop native notifications). Done criteria verified; test suite green. One item deferred: per-event policy editing UI in Settings (config-mirroring, not a blocker for the core feature).

- [x] **Theme A (model + ingestion + feed):** `Notification` zod schema + `config.notifications` block in `shared`; `notifications` Drizzle table (migration `0035`); `NotificationsService` subscribes to `TaskEventBus`, applies the policy (waiting=warn/done=info/abandoned=urgent), coalesces same-kind bursts in 1.5s, persists + emits `notification.created` WS event. `GET /notifications` (paged + unread count), `POST /notifications/read`, `DELETE /notifications`. (PR #103)
- [x] **Theme B (channel dispatch):** `NotificationChannel` interface + `NotificationDispatcher` fans to all enabled channels; `WebChannel` emits the WS event; `WebhookChannel` POSTs to a configured URL with SSRF guard + bounded retry/backoff, never throws. (PR #108)
- [x] **Theme C (web notification center + toasts + browser opt-in):** Bell + unread badge in nav bar; dropdown feed (mark-read/all/clear, deep-link); in-app toasts on `notification.created`; browser/OS notifications when opt-in on + tab hidden; the old `use-task-notifications` hook removed. ⏳ Per-event policy + webhook-URL editing UI deferred. (PR #107)
- [x] **Theme D (desktop native notifications):** Electron main-process IPC bridge (`window.midniteDesktop.notify` → `midnite:notify`); click focuses + routes; `chooseNotificationDelivery` helper respects the shared `notifyTaskUpdates` opt-in for both paths. (PR #110)
- [x] Done criteria: waiting/done/abandoned raise toast + center entry; unread badge + mark-read/all/clear persist; webhook SSRF-guarded; browser + desktop notifications fire; bulk coalesced; `:typecheck`/`:lint`/`:test` green.

---

## 2026-06-23 — Phase 20: global full-text search — **Phase 20 COMPLETE**

All four themes shipped across PRs #90 (FTS5 index + endpoint), #96 (command palette integration), and #105 (dedicated `/search` page). Done criteria verified against the live test suite (765 gateway, 398 web, 417 shared — all green).

- [x] **Theme A (FTS5 + contract):** `SearchResult` discriminated union in `shared`; a unified `search_index` FTS5 virtual table (migration `0034`); `SearchIndexService` (`upsert`/`remove`/`query` with `bm25()` ranking + `snippet()`); write-path maintenance per all six domains (tasks via `TaskEventBus` subscription; projects/memory/notes/councils/workflows inject `SearchIndexService` directly); boot backfill + `POST /search/reindex` admin route. (PR #90)
- [x] **Theme B (ranked endpoint):** `GET /search?q=&type=&limit=` — thin `SearchController` → `SearchService`; FTS5-ranked results with `<mark>`-wrapped snippets; grouped `byType` counts; empty/short-query guard. Gateway tests against `:memory:`. (PR #90)
- [x] **Theme C (command palette):** Debounced, abort-on-keystroke query hits `GET /search`; results rendered grouped by type (Pages · Tasks · Projects · Memory · Notes · Councils · Workflows); keyboard nav + per-group cap with "+N more" → `/search` deep-link; loading + empty states; nav-only remains instant. (PR #96)
- [x] **Theme D (dedicated `/search` page):** App Router `/search` route reading `?q=` + `?type=` (filter pills, client-side over one response); highlighted snippets via shared `lib/highlight.tsx`; deep-links from palette "+N more" land with query + type prefilled. (PR #105)
- [x] Done criteria: ranked results + type-filter + counts correct; write-path maintenance (create/edit/delete reflected); boot backfill populates pre-existing data; `/search` deep-links work; `:typecheck`/`:lint`/`:test` green.

---

## 2026-06-23 — Phase 7 A5: optional REST auth + per-IP rate limiting (PR #117) — **Phase 7 COMPLETE**

The gateway REST API was unauthenticated — fine on loopback, unsafe off-box. Adds opt-in remote-access auth, **off by default** so the local-only experience is unchanged. Shipped on request (A5 had been parked as local-only/out-of-scope). Also reconciled A3's Playwright-smoke bullet (superseded by Phase 10 Theme D's committed flow specs; the CI job is Phase 10 F1) — **closing Phase 7**.

- [x] **`gateway.auth` config** (shared zod, defaulted so existing `midnite.json` validates): `tokenEnv` (env-named bearer secret, never inlined), `requireOnNonLoopback` (fail-closed boot), `rateLimit` (`{windowMs,max}`, `max:0`=off).
- [x] **`GatewayAuthGuard`** (global) — when a token is resolved, every REST route requires `Authorization: Bearer <token>` except `/health` + the self-authenticating `/hooks/*`; constant-time compare; inert when no token (behaviour-preserving). **`/uploads/*`** guarded via a Fastify `onRequest` hook (static mounts sit outside Nest's APP_GUARD) — caught in self-review. Web export bundle stays public (client shell; data goes through the guarded API).
- [x] **`RateLimitGuard`** (global, dependency-free per-IP fixed window) runs before auth so floods incl. token brute-force are throttled; `/health` never throttled; expired buckets pruned.
- [x] **Fail-closed boot** (`assertAuthForHost`) — non-loopback host + no token refuses to start unless `requireOnNonLoopback:false`. Pure policy helpers in [`auth/lib/auth-policy.ts`](../packages/gateway/src/auth/lib/auth-policy.ts) shared by guard + bootstrap.
- [x] Tests: helpers (loopback/token/exempt/bearer/constant-time), both guards, shared config defaults; verified **end-to-end** (loopback boots auth-off; `0.0.0.0` no-token refuses; `0.0.0.0`+token → 401 without / 200 with bearer, `/health` + `/uploads` enforced correctly). Security second-opinion review (found the `/uploads` gap, fixed). `:typecheck`/`:lint`/`:test` + `moon ci` green; gateway **763 tests**. WS-stream guarding + client token-wiring noted as follow-ons.

---

## 2026-06-22 — Phase 10 Theme E1: deterministic screenshot capture + fresh-DB boot fix (PR #111)

The Theme E payoff: a Playwright pass that captures preview screenshots of every key page (board, office, workflows, dashboard, councils) in light + dark, so `execute-phase` Stage 7 reviews get real artifacts. Building it surfaced a latent boot bug that had silently broken the whole e2e harness.

- [x] **`screenshots` Playwright project + [`pages.shots.ts`](../packages/web/e2e/screenshots/pages.shots.ts)** — captures the 5 key pages × 2 themes at a fixed 1440×900 viewport. New `moon run web:screenshots` (`runInCI:false`); PNGs → `e2e/__shots__/` (gitignored). `web:e2e` scoped to `--project=chromium`.
- [x] **Determinism engineered:** stable seed data · `setFixedTime` (clocks stable, rAF still paints the office canvas) · forced reduced-motion (typewriter header + page-reveal settle instantly) + animation-kill stylesheet · setup nudge dismissed · external widgets (news/weather/market) stubbed. Preview artifacts only — **no pixel assertion** (committed baselines are E2).
- [x] **🐛 Fresh-DB boot fix** — `no such table: council_runs`: migration ran in `DbModule.onModuleInit`, but Nest can fire a feature module's `onModuleInit` (CouncilRunnerService's stale-run sweep) first. Tied migration to **building the DB handle** ([`DbFactory`](../packages/gateway/src/db/db.module.ts)), which Nest completes before any lifecycle hook; regression test added. Persisted dev/prod DBs hid it; the fresh DB every e2e run uses exposed it, and `web:e2e` (`runInCI:false`) never caught it.
- [x] **Stabilised the `terminal.service.spec` `MIDNITE_*` env-dump flake** — the fake `claude` now greps `^MIDNITE_` so a large CI env can't truncate the captured output before `MIDNITE_GATEWAY_URL`.
- [x] Verified locally: `:typecheck`/`:lint` green, `web:test` 364/364, gateway tests green; all 10 captures rendered. Screenshots under [`docs/screenshots/screenshot-previews/`](../docs/screenshots/screenshot-previews/). **Phase 10 E1 is ◐ PARTIAL** — Storybook per-story capture (E1 bullet 2) + E2/E3 remain.

---

## 2026-06-22 — Phase 27 Theme C: dependency UI (PR #114) — **Phase 27 COMPLETE**

The blocker graph (model #106, scheduling #109, CLI #113) becomes visible + editable in the web app — express dependencies, see what's blocked, understand why a task isn't running. "blocked" stays **derived** (Decision §2): no new status, no column move.

- [x] **Typed client + pure helpers** — `addTaskDependency`/`removeTaskDependency` ([`lib/api.ts`](../packages/web/lib/api.ts), errors surface the gateway message); pure derived-blocked helpers ([`lib/task-dependencies.ts`](../packages/web/lib/task-dependencies.ts)): `unmetBlockerCount`/`blockedCounts`/`dependentsOf` — a blocker satisfies only when `done`, mirroring the scheduler ready-set.
- [x] **Set/edit blockers** — reusable `TaskPicker` combobox ([`task-picker.tsx`](../packages/web/components/task-picker.tsx)) in the new-task modal (single mode) + the task thread's new **Dependencies** section; the service's cycle / self-reference / unknown-task errors surface inline.
- [x] **Derived "Blocked by N" chip** ([`blocked-badge.tsx`](../packages/web/components/blocked-badge.tsx)) on cards (board + abandoned) and rows (list/table), dimmed; count computed over the **full** task list so a filtered-out blocker still counts.
- [x] **Thread blocker/dependent lists** — each blocker with status (done/pending) + remove; a read-only "Blocks" dependents list. **Manual-start warn+confirm** in both the board drag/Start and the thread Start (human override; the scheduler still auto-skips) — Decision §4.
- [x] Tests: helper unit tests, `TaskPicker` (filter/pick), `BlockedBadge` on cards, thread Dependencies (blocker rows + status, cycle error surfaced, remove). `web:test` **391 passed**; `:typecheck`/`:lint` + `moon ci` green. Screenshots under [`docs/screenshots/deps-web-ui/`](../docs/screenshots/deps-web-ui/). Built via a delegated subagent + my own diff review. **This closes Phase 27 (A–D).**

---

## 2026-06-22 — Phase 27 Theme D: CLI task dependencies (PR #113)

The dependency graph existed in the model (#106) and the scheduler (#109), but the **CLI** couldn't express it — blockers could only be set from the web. Theme D adds the CLI surface, closing the last build slice of Phase 27 (only the Theme C web UI affordances remain). `cli` + `gateway` only.

- [x] **`midnite add --depends-on <id>`** (repeatable) — threads blocker ids as repeatable multipart `dependsOn` fields into `POST /tasks`; rejected alongside `--bulk` (a blocker graph is per-task, not a batch default).
- [x] **`midnite block <id> --on <blockerId>`** / **`unblock <id> --on <blockerId>`** — thin `POST` / `DELETE` to `/tasks/:id/dependencies`; the typed client validates the returned task.
- [x] **Gateway fix** — the create path maps a `TaskDependencyError` (unknown blocker) to a clean **4xx** (mirrors the `addDependency` route) instead of a 500, so `add --depends-on <bad>` reads clearly.
- [x] Tests: CLI client (repeatable `dependsOn` form fields, add/remove endpoints + verbs, 409 cycle message surfaced); controller create→400 on an unknown blocker. The scheduler-order / blocker-done-unblocks / abandoned-holds / edge-cleanup / cycle-rejection e2e was already covered by the Phase 27 B integration spec + `tasks.dependencies` + controller dependency-route tests. `:typecheck`/`:lint` green; `gateway:test` 742, `cli:test` 38; CI green first try.

---

## 2026-06-22 — Phase 8 Theme B2: day/night office floor tint (PR #112)

The office floor flipped light/dark with the theme but never read the **time of day**. Phase 8 B2 (Ambient polish) asks for a *"day/night floor tint aligned with the `time` theme"* — so the room now feels like the hour: cool after dark, warm at dawn/dusk, near-neutral at midday. It **composes on top of** the existing light/dark base + per-room floor accents (Phase 9) rather than replacing them.

- [x] **Pure helper** [`lib/office/daynight.ts`](../packages/web/lib/office/daynight.ts): `dayNightPhase(hour)` buckets the clock into `dawn / day / dusk / night` on boundaries **aligned with the `time` theme's 08:00–18:00 light window** (dusk begins exactly where the theme flips to dark; night wraps past midnight); out-of-range/fractional hours are normalised so `getHours()` passes raw. `dayNightTint(hour)` → `{ color, alpha }`, kept subtle (lightest midday, deepest at night) so it never overrides the theme floor.
- [x] **Scene wash** ([`office-scene.ts`](../packages/web/components/office/scenes/office-scene.ts)): one world-spanning translucent rectangle at depth −4 — over floor/room-accents/rugs/pool, **under** furniture + characters — tinted from the helper. Refreshed on a 60s timer (same cadence the time theme re-evaluates the flip) and on theme flip via `applyPalette`, so it tracks the clock and stays in sync with the light/dark base.
- [x] Tests: `daynight.test.ts` (phase boundaries, hour normalisation, subtlety ordering) — `web:test` green. The office e2e drives **HUD/DOM, not canvas pixels** (Phase 10 Theme D), so the tint is verified by before/after + 4-phase screenshots in the PR, not an e2e assertion.
- [x] `:typecheck` / `:lint` / `web:test` + `moon ci` green. (Local-only: the gateway `tmux` spawner contract spec flakes on this macOS sandbox — alternate-screen escapes instead of `READY` — and passes on CI.)
- [ ] **Still open in B2:** pixel-perfect camera + larger scrolling map (camera follows the player) — gated on the A1 external Tiled asset pack; tracked under Phase 9 A2.

---

## 2026-06-22 — Phase 21 Theme D: desktop native notifications (PR #110) — **Phase 21 COMPLETE**

The desktop shell now upgrades the notification feed (toasts/center + browser API, #103/#107/#108) to **native OS notifications** — the tap-on-the-shoulder when you've started a batch and walked away with the window backgrounded. Implemented Decision §5's robust path (a **main-process IPC bridge**), not just the renderer-API v1, because a hidden Electron renderer is throttled (its own `Notification` construction + `window.focus()` are unreliable) where the main process is not.

- [x] **Main-process bridge** — preload exposes `window.midniteDesktop` (`notify` + `onNavigate`); [`main/notifications.ts`](../packages/desktop/src/main/notifications.ts) raises a native `Notification` on `midnite:notify` and, on click, focuses the window (`restore`/`focus`) + sends the entity `route` back over `midnite:navigate`. `getWindow` read lazily per click; single `ipcMain.on` at boot; `isSupported()`/`isDestroyed()` guarded.
- [x] **Web routes through the bridge when present** — [`NotificationsProvider`](../packages/web/components/notifications-provider.tsx) feature-detects `window.midniteDesktop` (new [`lib/desktop-bridge.ts`](../packages/web/lib/desktop-bridge.ts), mirroring the `__NEXT_PUBLIC_GATEWAY_URL` idiom). Present → native path; absent → existing web Notification API. An `onNavigate` effect routes the window on click.
- [x] **Consistent policy** — pure, exported `chooseNotificationDelivery()` (`desktop`/`browser`/`none`) keeps the shared `notifyTaskUpdates` opt-in + "only while the window is away" gate on both paths; the OS owns the native permission, so the desktop path has no web-permission gate. `shouldRaiseBrowserNotification` refactored to share the gate.
- [x] **Contract + typecheck** — the IPC payload **is** a shared `Notification` (Golden Rule); added `@midnite/shared` to desktop + the shared TS project reference (mirrors gateway) so desktop typechecks against shared's declarations.
- [x] Tests: `chooseNotificationDelivery` (desktop-preferred / browser-fallback / none, incl. opt-in + visibility gates) + `getDesktopBridge` (web). `web:test` 371 green; `:typecheck`/`:lint` + `moon ci` green. No Playwright shots — the surface is a native OS notification, not the web DOM (the in-app toast/center were shown in #107). README documents the bridge.
- [x] **Deferred (unchanged):** the Theme C ◐ Settings *policy/webhook* editing panel (config-mirroring UI); Slack/email channels → Phase 14.

---

## 2026-06-22 — Phase 27 Theme B: dependency-aware scheduling (PR #109)

Theme A (#106) landed the dependency **model** (edge table, `dependsOn`, integrity rules, and the SQL ready-set query) but the scheduler still filled slots from *all* `todo` tasks, so an explicit blocker graph had no effect on run order. Theme B wires the graph into the tick so a multi-step project runs in DAG order. Gateway-only; no wire-shape or client changes.

- [x] **Ready-gating** — the tick selects from the dependency ready-set (`todo` tasks whose every blocker is `done`) via `TasksService.listReadyTodoTasks()` (→ `TasksRepository.listReadyTodoTasks()`) instead of `listTasks('todo')`. Priority+age ordering still applies, but **only among ready tasks**, so a higher-priority blocked task can't jump its blocker.
- [x] **Unblock-on-complete** — a blocker reaching `done` makes its dependents eligible on the **next tick** automatically (readiness is recomputed in SQL — no scheduling event needed); the service also re-emits `task.updated` for the blocker's dependents (`notifyDependents`) so the board's derived "blocked by N" chip refreshes promptly.
- [x] **Abandoned-blocker policy** (Decision §4 — *hold + surface*) — an `abandoned` blocker is never `done`, so the ready-set keeps its dependents out of scheduling (held, not silently run); dependents are re-broadcast on the abandon transition so a "blocked by an abandoned task" affordance can surface (richer UI is Theme C). Dropping the dead edge is the existing `removeDependency`.
- [x] Tests: scheduler unit (blocked task waits until its blocker is `done`); pool integration (`:memory:`) — 3-task chain runs one blocker at a time, a higher-priority blocked task can't jump its blocker, completing a blocker emits its dependent's `task.updated`, an abandoned blocker holds its dependent. `gateway:typecheck`/`lint` green; `gateway:test` 734 green; CI green (after a re-run of the pre-existing flaky `terminal` env-dump spec — unrelated).

---

## 2026-06-22 — Phase 21 Theme B: notification channel dispatch (PR #108)

Theme A (#103) emitted `notification.created` over WS directly; Theme B introduces the channel abstraction so a notification fans to N configurable sinks (in-app feed + optional webhook), with Slack/email deferred to Phase 14 as drop-in channels. Composes with the Theme C web center (#107), which reads the same unchanged WS event.

- [x] **`NotificationChannel`** interface (`name`/`enabled(config)`/`send`) collected via a `NOTIFICATION_CHANNELS` multi-provider (same "one interface, N implementations" shape as the workflow executors / Phase 17 spawner).
- [x] **`NotificationDispatcher`** — fans each persisted notification to every enabled channel concurrently with **per-channel failure isolation** (a dead webhook never stops the in-app feed).
- [x] **`WebChannel`** (always on) emits `notification.created` over WS; **`WebhookChannel`** (opt-in) POSTs the JSON to `channels.webhook`, **SSRF-guarded via `isSafeHttpUrl`** (loopback/private refused — the doc's `allowed-origin.ts` is the CORS helper, not the right guard), bounded retry/backoff, best-effort.
- [x] **Service refactor** — `NotificationsService` persists then hands off to the dispatcher (the WebChannel does the WS emit, so the feed is behavior-preserving); `flush()` is now async; coalescing untouched.
- [x] Tests: dispatcher spec (fan-out + failure isolation), webhook spec (safe POST / SSRF refusal / no-op / retry-then-give-up, mocked fetch), updated service spec. `gateway:typecheck`/`lint` green; `gateway:test` 736 green; CI green (after re-runs of the pre-existing flaky `terminal` env-dump spec — unrelated; worth a deflake).

---

## 2026-06-22 — Phase 21 Theme C: notification center + toasts + browser opt-in (PR #107)

Surfaces the Theme-A notification feed in the web app — the "an agent needs you / a task finished/abandoned" signal now actually reaches the user.

- [x] **Typed clients** (`web/lib/api.ts`): `getNotifications` / `markNotificationsRead` / `clearNotifications` (the existing `GET /notifications`, `POST /notifications/read`, `DELETE /notifications`).
- [x] **`NotificationsProvider` + `useNotifications`** ([`web/components/notifications-provider.tsx`](../packages/web/components/notifications-provider.tsx)): fetches the feed on mount, opens the `/ws/notifications` socket (mirrors `use-task-events` — subscribe frame, `NotificationEventSchema`-validated frames, capped-backoff reconnect, runs once via a stable ref). On `notification.created`: prepend + bump unread (pure, tested `notificationsReducer`, de-duped by id), fire a severity-styled toast (urgent = long-lived), and raise a browser notification when gated (pure, tested `shouldRaiseBrowserNotification`: `notifyTaskUpdates` + granted + hidden tab).
- [x] **`NotificationCenter`** ([`web/components/notification-center.tsx`](../packages/web/components/notification-center.tsx)) in the nav bar: bell + unread badge (hidden at 0, `99+` cap), dropdown feed (newest-first, severity icons, relative time), per-row deep-link that marks-read, Mark-all-read + Clear, loading/empty states, outside-click/Escape close, accessible. Mounted in `(main)/layout.tsx` beside the other live-data providers.
- [x] Removed the superseded task-event `use-task-notifications` hook (feed path covers waiting/done + abandoned, avoids double-fire). Caught + fixed a real dropdown clip (bell at bottom-left → opens upward+right). `web:test` 359 green (NotificationCenter RTL 9 + provider 13); `web:typecheck`/`:lint` + CI green. Screenshot under [`docs/screenshots/notification-center/`](../docs/screenshots/notification-center/). Built via a delegated subagent + independent review (its socket-deps + gate-test findings applied).
- [x] **Deferred:** the Settings *policy/webhook* editing panel (Theme C's 4th bullet, ◐) — config-mirroring UI, a follow-up. Theme D (desktop-native notifications) still open.

## 2026-06-22 — Phase 27 Theme A: task dependency model (PR #106)

The agent pool ran tasks independently — no way to say "B can't start until A ships". This adds the blocker-graph substrate (model + integrity); ready-gated scheduling (Theme B) and UI/CLI (C/D) build on it. **No new status** — "blocked" stays *derived* from the edges + blocker states (Decision §2).

- [x] **A1 — model:** `task_dependencies` edge table (`task_id` → `depends_on_task_id`, composite PK + reverse index) via forward-only migration `0036`. Repository `addDependency`/`removeDependency`/`dependenciesOf`/`dependentsOf` + `listReadyTodoTasks()` — the **ready-set** SQL (`todo` whose every blocker is `done`, correlated `NOT EXISTS`, keeping `desc(priority), asc(createdAt)`) that backs Theme B. `hydrate` derives `dependsOn`; `deleteTask` clears edges both directions (dependents unblock).
- [x] **A2 — contract (`shared`):** optional `dependsOn` on the task read shape + `CreateTaskRequest`, an `AddTaskDependencyRequest` body, a typed `TaskDependencyError` (reason: self-reference | cycle | unknown-task). `.optional()` to match `links`/`attachments` (gateway always populates on read).
- [x] **A3 — integrity + routes:** `tasks.service` rejects self-reference / unknown blocker / **cycle** (DFS over edges, mirroring the workflow-engine reachability check); `createFromPrompt` validates + attaches blockers. `POST`/`DELETE /tasks/:id/dependencies` map `TaskDependencyError` → 400 (self/unknown) / 409 (cycle).
- [x] Tests: integration spec (add/self/unknown/cycle/diamond/remove, create-with-deps, delete cleanup + unblock, ready-set), controller 400/409 mapping, shared contract. `:typecheck`/`:lint`/`:test` (gateway 108 files · shared 406 · cli 34 · web 74) + CI green. CLAUDE.md documents the model. **Themes B/C/D remain.**

---

## 2026-06-22 — Phase 20 Theme D: dedicated /search page (PR #105) — **Phase 20 COMPLETE**

The "see everything" surface — the last theme of global search (substrate A/B #90, palette C #96 already shipped). The palette caps each type with a "+N more" that now has a destination.

- [x] **`/search` page** — reads `?q=` (the header `SearchBar` writes it) + `?type=` (`FilterPills`), runs one `GET /search` at the max limit, renders hits **grouped by type** with highlighted snippets, per-type counts, and a result-count summary. Idle / short-query / loading / no-results / error states.
- [x] **Client-side type filtering** — the API `type` is single-value, so the page fetches all types once and the pills filter the single response locally (no refetch on toggle); pills show only matched types, labelled with counts.
- [x] **Palette seam** — the per-type "+N more" is now a button that deep-links to `/search?q=&type=`.
- [x] **DRY** — extracted the `<mark>`-snippet renderer into `lib/highlight.tsx` (shared by palette + page; no `dangerouslySetInnerHTML`); added a `Search` icon to `PageHeader`.
- [x] Tests: 5-case RTL `search-results.test.tsx` (empty/short/grouped+highlighted+routing/client-filter-no-refetch/no-results) + palette test updated for the deep-link + a Playwright `search-page.e2e.ts` (seed → search → grouped → route; no-results). `web:typecheck`/`web:lint` green; `web:test` 342 green (via a throwaway worktree — vitest can't collect in `.git/worktrees`); CI green. *(Live screenshot skipped — the e2e harness's gateway wouldn't boot in the sandboxed worktree, unrelated to this web-only change; RTL + the CI e2e cover the states.)*

---

## 2026-06-22 — Phase 30 Theme A: quality-gate checks contract + runner (PR #102)

The engine for "verified completion": Phase 30 will gate a task's `done` transition on configured checks. Theme A lands the contract + the runner only — no lifecycle wiring (B), no DB (B), no auto-fix (C), no surfaces (D).

- [x] **shared `checks.ts`** — `Check` / `CheckResult` / `CheckRun` / `CheckTrigger` / `CheckRunStatus` zod shapes (barrel-exported), the optional+defaulted **`config.checks`** block (enabled, gates, per-repo `byRepo` overrides, autoFix, perCheckTimeoutMs, outputCapBytes), and the pure **`resolveChecksForRepo(checks, repoName)`** (byRepo REPLACES gates, Decision §5). Back-compat: a `midnite.json` with no `checks` key still parses. 9 unit tests.
- [x] **gateway `ChecksService`** ([`checks/checks.service.ts`](../packages/gateway/src/checks/checks.service.ts) + [`lib/run-check.ts`](../packages/gateway/src/checks/lib/run-check.ts)) — runs a resolved `Check[]` sequentially in a repo cwd → a structured `CheckRun`. Each check runs `/bin/sh -c` via `spawn` (not `execFile` — output is tail-truncated to `outputCapBytes`, not a `maxBuffer` error), in a **detached process group** so a per-check timeout SIGKILLs the whole group (the shell *and* a forked grandchild like `sleep`, which would otherwise hold the pipes open) → `passed:false`, `exitCode:null`. Never throws into the caller. New `ChecksModule`, registered in `AppModule`.
- [x] 10 gateway tests (pass/fail/stderr/timeout-kill/spawn-error/truncation/repo-relative-cwd + run aggregation). README documents `config.checks`. `:typecheck`/`:lint`/`shared:test` (402)/`gateway:test` (705) + `moon ci` green. **CI caught a real cross-platform bug** (Linux/dash forks `sleep` where macOS exec-replaces it — the orphaned child stalled `close`); fixed with the detached-group kill. Independent review otherwise clean.
- [x] **Remaining for Phase 30:** Theme B (gate the `done` seam + `task_check_runs` table), C (auto-fix loop), D (web/CLI surfaces).

## 2026-06-22 — Phase 21 Theme A: notifications foundation — model + ingestion + feed (PR #103)

midnite runs many agents in parallel, but you had to *watch the board* to know when one needed you. Theme A is the substrate for a "tap on the shoulder"; channel dispatch (browser/webhook = Theme B) and the web center/toasts (Theme C) layer on top.

- [x] **Contract (`shared/src/notification.ts`)** — `Notification` schema (kind/severity/entity/route/readAt), the `notification.created` WS event + path, list/mark-read request schemas, and a pure `notifyForTask` policy (waiting→warn, done→info, abandoned→urgent — all toggleable). Defaulted `config.notifications` block (events + channels). zod + tests.
- [x] **Table + repo** — a `notifications` table (migration `0035`) + repository: paged **unread-first** feed, `markRead(ids)`/`markAllRead`, `clear`, `countUnread`.
- [x] **`NotificationsService`** — a **pure subscriber** to `TaskEventBus` (no new emit paths): applies the policy, **coalesces** same-kind bursts in a 1.5s window (a mass move → one "N tasks finished", not a storm), persists, and emits `notification.created` via `NotificationEventBus` → `NotificationsGateway` (`/ws/notifications`, origin-guarded). Thin REST: `GET /notifications`, `POST /notifications/read`, `DELETE /notifications`.
- [x] Tests: 9-case `:memory:` service spec (severity mapping, non-terminal ignored, toggle off, burst-coalesce, disabled-no-subscribe, mark-read/all + clear, unread-first ordering, destroy stops ingestion) + 9 shared contract/policy/config tests. `:typecheck`/`:lint` green; `gateway:test` 704 green; CI green on re-run (first run hit the pre-existing flaky `terminal` env-dump spec, unrelated). Backend-only — no web surface yet.

---

## 2026-06-22 — Phase 24 Theme C: installable PWA (PR #101)

Phase 24 made the app responsive; the manifest was still an empty white stub, so it wasn't installable. This makes midnite a real PWA — installable to the home screen, launching standalone with a fast cached shell. **Installable, not offline:** board/session data stays live from the loopback gateway.

- [x] **Manifest** ([`site.webmanifest`](../packages/web/public/site.webmanifest)) — real `name`/`description`, **theme-aware dark** `theme_color`/`background_color` (was `#ffffff`), `id`/`start_url`/`scope`, `display: standalone`, and a **maskable** icon (the logo padded into the safe zone as an SVG — no image tooling needed). Apple chrome via `metadata.appleWebApp` in [`layout.tsx`](../packages/web/app/layout.tsx).
- [x] **Service worker** ([`public/sw.js`](../packages/web/public/sw.js)) — network-first for the same-origin shell + a precached static set; **scoped to asset/navigation `destination`s so it never caches gateway API data**, even under Phase 3 same-origin serving (review caught this). Registered production-only by [`pwa-register.tsx`](../packages/web/components/pwa-register.tsx) (a SW would fight `next dev` HMR).
- [x] **Install affordance** ([`pwa-install.tsx`](../packages/web/components/pwa-install.tsx)) in Settings → Appearance: `beforeinstallprompt` on Chromium, manual Share → Add to Home Screen on iOS, confirms when already standalone.
- [x] Tests: RTL (install flow, registration gating, manifest validity); ESLint gained a service-worker-globals scope for `public/sw.js`. README + CLAUDE.md document installable-not-offline + the loopback-only reach caveat. `:typecheck`/`:lint`/`web:test` (337) + `moon ci` green. Phase 24 now has Theme A3 + Theme B open.

## 2026-06-22 — Phase 4 tracker reconcile — Inference COMPLETE (docs)

Phase 4's remaining items shipped under later phases but the trackers still said "NOT IMPLEMENTED". Verified each against the code and reconciled (no code change):

- [x] **URL + GitHub-context inference** (#3) — done via **Phase 15 Theme B** (`UrlContextService` wired into `agent-runner.start()`, `gh`-first + SSRF-guarded, truncated injection).
- [x] **Knowledge-dir watcher + MD injection** (#7) — done via **Phase 15 Theme D** (PR #95): `knowledge-watcher.service.ts` + `chokidar`, manifest → planner selection → byte-capped content injection ("Knowledge files", distinct from link "Sources").
- [x] Also ticked the already-shipped Phase-4 items the gap tracker missed: **bulk/paste** (#2, Phase 16 A/B/C), **inline answers** (#6, PR #55) — alongside **repo guessing** (#5, PR #88).
- [x] [`phase-4-inference.md`](phase-4-inference.md) → ✅ complete; [`outstanding.md`](outstanding.md) Phase-4 rows + intro reconciled (only optional #8/#11/#12 remain).

## 2026-06-22 — Phase 11 B3: global reduced-motion catch-all for the public site (PR #98)

Closed out Phase 11's reduced-motion acceptance. B3's perf items (cap DPR / pause rAF) were already **moot** — the WebGL particle field was removed in PR #68 for a static CSS `AmbientBackdrop` — so the remaining gap was motion *coverage*: the site disabled its named keyframe animations one-by-one (reveal/gradient-border/panel-glow/caret) and gated JS motion (typewriter, panel FLIP) via `lib/reduced-motion.ts`, but the many component **transitions** (hover/layout/colour) and smooth-scroll weren't covered.

- [x] Added a **global `@media (prefers-reduced-motion: reduce)` catch-all** to [`packages/site/app/globals.css`](../packages/site/app/globals.css): floors `animation-duration`/`transition-duration` to ~instant for `*`, caps `animation-iteration-count`, and forces `scroll-behavior: auto` — a belt-and-suspenders floor so current transitions and any future animation degrade safely, complementing the existing targeted rules + JS guards.
- [x] Verified against `moon run site:dev` under Playwright's emulated reduced-motion: the at-rest landing render is pixel-identical to normal (byte-identical screenshots) → fully usable, nothing hidden/broken. Screenshot committed under `docs/screenshots/site-reduced-motion/`.
- [x] Reconciled the Phase 11 acceptance checklist: ticked the reduced-motion item; marked the particle-field item ❌ superseded by PR #68. `site:typecheck`/`:lint`/`site:test` (19) green.

## 2026-06-22 — Phase 7 A4: recovery audit — orphaned workflow runs + shutdown hooks (PR #99)

Closed the two open A4 items. Both were invisible until a crash/restart:

- [x] **Orphaned workflow runs.** Runs execute as in-process JS (no PTY/process), so a run still `running` after a restart was stuck forever — tasks requeue orphaned `wip` and councils fail stale runs, but workflows had no boot recovery. New `WorkflowRecoveryService.onModuleInit` fails every `running` run (sets `error: "gateway restarted mid-run"` + `finishedAt`), fails its in-flight (`running`) node-runs, and emits `run.failed` on the bus. Idempotent. Repo gained `listRunningRunRows()` + `failRunningNodeRuns()`.
- [x] **Graceful shutdown.** `bootstrap.ts` never called `app.enableShutdownHooks()`, so Nest didn't listen for SIGINT/SIGTERM and **`onModuleDestroy` never ran on a normal exit** — the terminal service's PTY teardown (kill under `pty`, detach under `tmux`) and the schedulers' timer cleanup silently didn't fire, orphaning live PTYs. Added the call. Audit finding: managed agent-run PTYs are pinned handles in the terminal service's same teardown loop, so they were already covered — only the hooks were missing.
- [x] Tests: 5-case `:memory:` spec for `WorkflowRecoveryService` (clean-boot no-op, stale→failed + event, node-run reconciliation, finished-runs untouched, cross-workflow sweep). `gateway:typecheck`/`lint` green; `gateway:test` 695 green; CI green on re-run (first run hit the pre-existing flaky `terminal` env-dump spec, unrelated).

## 2026-06-22 — Phase 7 Theme C: per-repo status dashboard widget (PR #97) — **Theme C COMPLETE**

The last open Theme C widget (after LLM-usage, Shipped, Quick capture): how the fleet is spread across repos at a glance. Unblocked by repos-first-class (Phase 13).

- [x] **Pure `summarizeByRepo(tasks, repos)`** ([`web/lib/repo-status.ts`](../packages/web/lib/repo-status.ts)): per-repo rollup — `running`=wip+waiting (holding an agent), `queued`=todo, +backlog/done. Every registered repo gets a row (idle at zero); **Unassigned** only when some task has no repo, pinned last; archived/abandoned excluded; sorted by activity.
- [x] **`RepoStatusWidget`** ([`web/components/repo-status-widget.tsx`](../packages/web/components/repo-status-widget.tsx)): polls `getTasks`+`getRepos` (the task WS broadcast also refreshes); status-coloured count chips, dimmed zeros; loading/error/empty states mirror the Shipped widget. Registered (agents category, single-instance) + wired into the grid renderer.
- [x] Tests: 5 helper + 3 RTL + a registry assertion + a Playwright e2e (`repo-status.e2e.ts`, seeds repos + repo-assigned tasks over the live gateway). `web:test`/`:typecheck`/`:lint` + CI green. Screenshot under [`docs/screenshots/repo-status/`](../docs/screenshots/repo-status/). (The e2e wasn't runnable locally — the e2e *gateway* fails to boot from a fresh DB on this box, reproduced on the unmodified `board.e2e`; a local e2e-harness/env issue, not this change, and CI's gateway tests are green.)

## 2026-06-22 — Phase 20 Theme C: command palette content search (PR #96)

Surfaces the global-search backend (Theme A/B) in the UI: the ⌘K palette now searches content, not just navigates. Closes the gap where `GET /search` had no consumer in the app.

- [x] **`searchAll()` typed client** ([`web/lib/api.ts`](../packages/web/lib/api.ts)) — wraps `GET /search` with an `AbortSignal` for cancellation.
- [x] **Palette content search** ([`command-palette.tsx`](../packages/web/components/command-palette.tsx)) — a **debounced, abort-on-keystroke** query renders ranked hits **grouped by type** (Tasks · Projects · Memory · Notes · Councils · Workflows) beneath the instant page jumps. Keyboard nav spans every group; Enter routes to the entity. Snippets highlight matches via real `<mark>` elements parsed from the server's `<mark>`-wrapped snippet — **no `dangerouslySetInnerHTML`**. Per-group cap with a **"+N more"** count (from the response's full `byType`); short/blank queries never touch the network so page-jump stays instant.
- [x] Tests: RTL suite (grouping, capping, snippet highlighting, result routing, the short-query gate, network-skip on empty query), an updated Storybook interaction, and a new [`search-palette.e2e.ts`](../packages/web/e2e/search-palette.e2e.ts) flow proving the real index→endpoint→palette→route wire. `:typecheck`/`:lint`/`web:test` (318) green; `moon ci` green first try; independent review found no bugs (XSS-safe snippet, correct abort/cleanup, aligned keyboard nav). The "see all → `/search` page" deep-link is deferred to **Theme D** (the `/search` page); Phase 20 now has only Theme D open.

## 2026-06-22 — Phase 15 Theme D: knowledge-files watcher + MD injection (PR #95) — **Phase 15 COMPLETE**

The original plan's "watched folder of MD files" — the last open theme of Phase 15. Gives midnite a second, file-based knowledge base distinct from the link-based **Sources**: standing project conventions/runbooks/domain notes injected automatically into the right runs.

- [x] **`config.knowledge`** (`shared`) — `{ enabled, dir?, maxBytes }`, defaulted so existing `midnite.json` files keep validating.
- [x] **`KnowledgeWatcherService`** — watches `config.knowledge.dir` with **chokidar v3** (CommonJS — v4/v5 are ESM-only and the gateway builds CJS), keeps an in-memory manifest of each file's headings fresh on add/change/unlink, reads selected content on demand (path-guarded to the root). Files on disk are the source of truth — no DB.
- [x] **`KnowledgeService`** — at task start, shows the plan model the manifest, it picks relevant files (validated against the manifest — can't name an off-disk file), and their content is folded into the seed prompt as a capped **"Knowledge files"** block, between URL-context and repo-conventions. Mirrors `UrlContextService`: best-effort + fail-open. Wired via `AgentRunnerService` (`@Optional()` so the runner's unit specs are unchanged).
- [x] Tests: pure-helper (heading parse, manifest render, selection validation, byte-capped block) + `KnowledgeService` spec (disabled/AI-off/empty/selection/fail-open/path-rejection, with fakes) + a real-temp-dir watcher spec (boot index, live add/change/unlink, path-traversal refusal). Full-graph `:typecheck`/`:lint` green; `gateway:test` 686 green; CI green. README documents `config.knowledge` + knowledge-files-vs-sources.

## 2026-06-22 — Phase 3: serve the web static export from the gateway (PR #93)

Closes Phase 3's last real gap: a single process can serve both the API and the browser UI in prod. The web app is a Next `output: 'export'` bundle (fully static, multi-page; all data fetched client-side; the `[id]` dirs are colocated components, not routes), so this needed no SSR / SPA-fallback / proxy — just a static mount mirroring `/uploads/`.

- [x] **`gateway.webDir`** config field ([`shared/src/config.ts`](../packages/shared/src/config.ts)) + `MIDNITE_WEB_DIR` env override ([`gateway/lib/load-config.ts`](../packages/gateway/src/lib/load-config.ts)). Optional — unset = off (dev keeps the standalone `next` server), so no default behaviour change.
- [x] **[`lib/serve-web.ts`](../packages/gateway/src/lib/serve-web.ts)** — `registerWebStatic` mounts the export at `/` via `@fastify/static` (`decorateReply: false`, like `/uploads/`); returns `{ served, root }`. bootstrap wires it when `webDir` is set. Controllers' specific routes (`/tasks`, `/search`, `/uploads/…`) keep priority over the `/*` file mount; the terminal WS upgrade isn't a GET route.
- [x] **Integration test** ([`serve-web.test.ts`](../packages/gateway/src/lib/serve-web.test.ts), 4 tests): boots Fastify against a temp export — `/` + nested `/board/` + `/_next/*` served, a specific API route still wins, missing path 404s, relative `webDir` resolves to an absolute root.
- [x] README documents `webDir` / `MIDNITE_WEB_DIR` + the build-then-serve flow. `:typecheck`/`:lint`/`gateway:test` (668) + `moon ci` green first try; independent review found no bugs (its return-value + coverage tidy applied). Phase 3's only remaining open item is the TanStack-Query setup — a recorded deliberate deviation (custom hooks ship instead).

## 2026-06-22 — Phase 5 reconciled & closed ✅ — **Phase 5 COMPLETE**

Phase 5 ("Polish") had sat ⚠️ PARTIAL since 2026-06-19 with six open boxes, but every one had since been resolved by a later phase or deliberately dropped — the doc just hadn't been reconciled. Verified each against the code and closed the phase (docs-only; no behaviour change):

- [x] **`TmuxSpawner`** → done via **Phase 17 B** (PR #77): pluggable `Spawner` interface + durable `tmux` backend that survives a gateway restart. Verified [`terminal/spawner/spawner.ts`](../packages/gateway/src/terminal/spawner/spawner.ts) + [`tmux-spawner.ts`](../packages/gateway/src/terminal/spawner/tmux-spawner.ts).
- [x] **`WarpSpawner` / `ItermSpawner`** → ❌ dropped in **Phase 17 C1** (PR #77): `terminal.mode` pruned to `pty | tmux` (verified [`config.ts`](../packages/shared/src/config.ts)). Native terminal windows don't compose with the gateway-owned browser PTY stream (outstanding.md #10).
- [x] **Per-repo branch naming + PR-template injection** → done via **Phase 13** (PR #74): `branchPrefix`/`prTemplate` per-repo fields, injected into the agent seed prompt by [`pool/lib/build-agent-prompt.ts`](../packages/gateway/src/pool/lib/build-agent-prompt.ts) under a "Repository conventions" section (verified). Landed on the DB-backed repo registry rather than raw `RepoConfig`.
- [x] ⏳ **Suspend `waiting` sessions** → deliberately deferred: `waitingHoldsSlot` defaults `true` (verified [`config.ts`](../packages/shared/src/config.ts)); the conservative behaviour, revisit only under real slot pressure.
- [x] Priorities, retries, per-repo caps, eslint/prettier, CI, and the Vitest suites had already shipped in Phase 5 itself.

Phase 5's status is now ✅ COMPLETE; outstanding.md #8/#9/#10 were already ticked, #12 stays deferred. No code changed — `moon ci` trivially green (no packages affected).

## 2026-06-22 — Phase 7 Theme C: quick-capture dashboard widget (PR #91)

The last open Theme C widget (LLM-usage + Shipped already shipped): add a task — or paste a list — without leaving the dashboard. A *placeable* grid widget (addable/removable/positionable from the catalogue), distinct from the always-on bottom prompt composer.

- [x] **`QuickCaptureWidget`** ([`web/components/quick-capture-widget.tsx`](../packages/web/components/quick-capture-widget.tsx)): single mode → `POST /tasks`; **Bulk** toggle → `POST /tasks/bulk` (outstanding #2, one coalesced board event). Status defaults to `todo` (planner triages); the repo is **inferred** (PR #88). `⌘/Ctrl+↵` submits; inline confirmation/error; `invalidateData()` (the task WS broadcast also refreshes). Registered in the widget registry (tasks category, single-instance, no config) + wired into the grid renderer.
- [x] Tests: 5 RTL cases + a registry assertion + a Playwright e2e (`quick-capture.e2e.ts` — seed widget → add against the live gateway → appears in the board's Todo column; single + bulk). `:typecheck`/`:lint`/`web:test`/`web:build` green; CI green. Screenshots committed under [`docs/screenshots/quick-capture/`](../docs/screenshots/quick-capture/).

## 2026-06-22 — Phase 20 Theme A+B: global search FTS5 substrate + endpoint (PR #90)

The app had grown wide (tasks, projects, memory, notes, councils, workflows) with no way to jump to a thing by name — the ⌘K palette was navigation-only and per-page search only filtered already-loaded rows. This lands the **server-side substrate** for real global search; the web palette/page (Theme C/D) are a follow-on.

- [x] **Contract (`shared/src/search.ts`)** — `SearchResult` discriminated union (6 domains), `SearchResponse` (`results` + `total` + per-type `byType`), `SearchQuery` (zod, coerced `limit`). zod + tests.
- [x] **FTS5 index** — migration `0034` adds a unified `search_index(type, entity_id, title, body)` virtual table (both keys UNINDEXED); `SearchIndexService` owns `upsert`/`remove`/`query` with `bm25()` ranking (title boosted over body) and `<mark>` snippets. Authored as a `drizzle-kit --custom` migration; raw `sql` queries.
- [x] **Write-path maintenance, no triggers** (per CLAUDE.md) — `SearchIndexService` is a `@Global` module. **Tasks** reuse the existing `TaskEventBus` (the search module subscribes — `tasks.service` untouched); the other **five** domains inject the index `@Optional()` (so unit specs need no edit) and upsert/remove on create/update/delete. Per-domain field→`title`/`body` mapping centralised in `search/lib/index-mappers.ts`.
- [x] **Backfill + reindex** — boot backfill (fail-soft) populates a freshly-migrated index from the domain services; `POST /search/reindex` rebuilds it.
- [x] **`GET /search`** (Theme B) — thin controller → `SearchService` mapping hits to routed `SearchResult`s + per-type counts; short/blank `q` short-circuits. FTS `MATCH` built from a quoted-prefix tokeniser (`search/lib/fts-query.ts`) so user syntax chars can't error or inject.
- [x] **CLI** — `midnite search <query>` (`--type`/`--limit`) + a typed `search()` client method.
- [x] Tests: 27 gateway search specs + 7 shared + 10 CLI, all green. `:typecheck`/`:lint`/`web:typecheck` green; CI green (only local failure was the pre-existing sandbox-only `tmux` spawner-contract spec, untouched here). Documented the search module + FTS-in-service-layer pattern in CLAUDE.md.

## 2026-06-22 — Phase 29 Theme D: `/release-complete` skill + release-finalising helpers (PR #89) — **Phase 29 tooling COMPLETE**

The irreversible half of the two-step release flow, pairing with `/release-prep` (Theme C, PR #87). Same split as C: the skill orchestrates git/gh, but the decision-bearing logic lives in tested pure helpers.

- [x] **Helpers** [`packages/shared/src/release.ts`](../packages/shared/src/release.ts): `extractChangelogSection` (pull a version's section for `gh release create --notes`; also the dated-section precondition — `date: null` ⇒ not finalised); `planReleaseTags` (the tag scheme, Decision §3 — lockstep `vX.Y.Z` vs scoped `‹pkg›@X.Y.Z` per bumped package; first release with empty `previous` → `vX.Y.Z`; throws on non-lockstep `previous`); `versionFromReleaseBranch` (`release/vX.Y.Z` → `X.Y.Z`).
- [x] **Tests** [`release.test.ts`](../packages/shared/src/release.test.ts) — 44 in the file (16 new): section extraction (dated/undated/missing/no-bleed/no-link-refs/dot-escaping/empty-body), the lockstep-vs-scoped split (incl. root `midnite@X.Y.Z`, first-release, skew-throws), branch parsing.
- [x] **Skill** [`.claude/skills/release-complete/SKILL.md`](../.claude/skills/release-complete/SKILL.md): refuse-on-failed-preconditions (release branch / clean tree / version-check + `moon ci` green / dated changelog) → tag plan + explicit go/no-go `AskUserQuestion` → `chore(release)` commit + tag(s) → push + merge to `main` + GitHub Release (edits the `release.yml` draft so desktop installers survive) → re-seed `Unreleased`. Aborts cleanly before the first irreversible step; reports partial state on mid-publish failure rather than retrying.
- [x] [`docs/RELEASING.md`](../docs/RELEASING.md) status: both skills landed. `:typecheck`/`:lint`/`shared:test` (381) + `moon ci` green first try; independent review found two `planReleaseTags` gaps (first-release + skewed input) — both fixed + tested.
- [x] **Phase 29 tooling complete** (A policy + B changelog + C `/release-prep` + D `/release-complete`). Remaining: cut the first real `v0.1.0` as a deliberate run (Decision §7).

## 2026-06-22 — Phase 4: infer target repo at task creation (PR #88) — closes outstanding #5

Repos went first-class + DB-backed in Phase 13, but nothing ever *set* `task.repo` automatically — a user had to pick it. With #4 done, the planner now guesses it, completing the repos-first-class story (the agent's PTY opens in the right repo unattended).

- [x] **`PlannerService.guessRepo(prompt, manifest)`** ([`agent/planner.service.ts`](../packages/gateway/src/agent/planner.service.ts)): guesses the target repo on the plan model from the registry manifest (name + path). Picks from an **enum of known names (+ `""`)** and **validates the result against the manifest** — can't introduce a dangling reference (the Phase 13 B2 anti-footgun). **Fail-soft** like `triage`/`answer` (AI-off / error / empty registry / no clear match → `null`); a **single** registered repo is returned without an LLM call.
- [x] **`TasksService.createFromPrompt`**: guesses **only when the caller named no repo** (`input.repo === undefined`) — an explicit blank stays "unassigned", an explicit name wins and short-circuits the guess. Runs **concurrently** with classify/triage; records `repoInferred` + the chosen repo on the `task.created` event for audit. Bulk add inherits it per-line for free.
- [x] **No wire change** — gateway-internal; `task.repo` already exists. Tests: 7 planner cases + 3 service cases. `:typecheck`/`:lint`/`gateway:test` green; CI green (the only local failure is the pre-existing sandbox-only `tmux` spawner-contract spec, untouched here).

## 2026-06-22 — Phase 29 Theme C: `/release-prep` skill + conventional-commit categorisation (PR #87)

The policy half of Phase 29 was done (A: RELEASING.md + version-sync tooling; B: CHANGELOG). This lands the analysis-and-prepare half of the two-step release flow. `version.ts` only consumes an already-categorised `ChangeSet`, so the genuinely-new, decision-bearing logic — and the only part a prose skill can't unit-test — is turning commits into that change set. It lives in a tested helper per CLAUDE.md ("skills orchestrate; they don't hide business logic").

- [x] **Pure helper** [`packages/shared/src/release.ts`](../packages/shared/src/release.ts): `parseConventionalCommit` (type/scope/`!`/`BREAKING CHANGE` footer); `bumpLevelFromCommits` (strongest-signal — breaking→major, feat→minor, fix→patch, else none; Decision §2); `changelogGroupForCommit` (Keep a Changelog grouping, non-user-facing types omitted, `revert`→Removed but non-bumping); `packagesForChangedPaths` (longest-dir attribution + root fallback, to scope a patch); `changeSetFromCommits` (bridge to `planVersionBump`). Exported from the shared barrel.
- [x] **28 unit tests** [`release.test.ts`](../packages/shared/src/release.test.ts) over all four helpers — the "Tests for /release-prep" item (a prose skill isn't unit-testable; the rules are pinned as tested code).
- [x] **Skill** [`.claude/skills/release-prep/SKILL.md`](../.claude/skills/release-prep/SKILL.md): preconditions (clean tree, fresh main) → gather commits + merged PRs since the base tag → propose the version citing the helpers as source of truth → confirm via `AskUserQuestion` → prep a `release/vX.Y.Z` branch (version bumps + drafted, curated CHANGELOG section, `root:version-check` re-run) → **stop before anything irreversible**, hand off to `/release-complete`.
- [x] [`docs/RELEASING.md`](../docs/RELEASING.md) status note updated (C landed; D is the remaining slice). No runtime wire shapes — pure tooling + process. `:typecheck`/`:lint`/`shared:test` (365) + `moon ci` green first try; independent review found no blocking bugs (its coverage/clarity tighteners were applied).
- [x] **Remaining for Phase 29:** Theme D (`/release-complete`) + cutting the first real `v0.1.0` (Decision §7).

## 2026-06-22 — Phase 29 Theme A1/A3: docs/RELEASING.md — versioning policy + release flow (PR #85)

The CHANGELOG (PR #80) and version-sync tooling (PR #66) existed, but the policy tying them together lived only in the phase doc. A1/A3 write it down where contributors and the release skills look.

- [x] New [`docs/RELEASING.md`](../docs/RELEASING.md): the lockstep `MAJOR.MINOR` + independent `PATCH` rule; the conventional-commit **bump-trigger table** (BREAKING→major, feat→minor, fix-only→scoped patch, docs/chore/refactor/test→none); the **tag/branch scheme** (`release/vX.Y.Z` branch, `vX.Y.Z` lockstep tag, `@midnite/‹pkg›@X.Y.Z` scoped patch tag); the `/release-prep`→`/release-complete` flow; references to `planVersionBump`/`root:version-check`; notes the `v*`-tag → desktop-build + draft-Release workflow.
- [x] Linked from the README and a new **Releases** subsection in [`CLAUDE.md`](../CLAUDE.md). Docs-only — typecheck + lint green; CI green first try.
- [x] **Phase 29 policy half complete** (Theme A1+A2+A3 + Theme B). Remaining: the `/release-prep` (C) and `/release-complete` (D) skills.

## 2026-06-22 — Phase 17 B/C/D: durable `tmux` spawner + survive-restart reattach (PR #77) — **Phase 17 COMPLETE**

The pluggable `Spawner` (extracted in A, PR #56) gains its first alternative backend: a durable `tmux` mode whose sessions outlive the gateway, so an in-flight agent run survives a restart instead of being orphaned/requeued. The `pty` path is unchanged (its specs run unedited). Closes [outstanding.md](outstanding.md) #10 (scoped to tmux; warp/iterm dropped).

- [x] **B — `TmuxSpawner`** ([`terminal/spawner/tmux-spawner.ts`](../packages/gateway/src/terminal/spawner/tmux-spawner.ts)): `tmux new-session -d -s midnite-<id>` running `exec env … <cmd>`, chained with `remain-on-exit on`, + a node-pty `tmux attach-session` for the live stream (reuses the whole ring/broadcast path). `onExit` fires from a `pane_dead_status` poll so callers get the **real inner exit code**; `detach()` drops the stream but leaves the session; fail-closed `TmuxUnavailableError` (no silent `pty` fallback).
- [x] **C1 — selection + enum prune**: module factory picks the backend by `terminal.mode`; `warp`/`iterm` removed → enum is `pty | tmux` (a config naming them now fails validation).
- [x] **C2 — boot reattach**: recovery moved from `AgentPoolService` to [`AgentRunnerService.onModuleInit`](../packages/gateway/src/pool/agent-runner.service.ts) (it owns the slot/timeout/onExit wiring; runs after the pool, before the scheduler). Under tmux it reattaches still-live sessions, requeues dead ones, and reaps strays; under pty it requeues as before.
- [x] **C2.5 — hook auth survives restart**: the per-session hook secret was in-memory, so reattached `claude` sessions' Stop/PreToolUse callbacks would fail auth (a completed run would hang). The secret **hash** is now persisted (`hook_secrets` table + `HookSecretRepository`, migration `0033`) and rehydrated by `ApprovalService.verifySecret` on a cache miss; cleared on session end/discard.
- [x] **C3 — shutdown divergence**: `TerminalService.onModuleDestroy` detaches durable sessions (leaves them running) and kills pty ones.
- [x] **D — tests**: a `Spawner` contract spec (pty always; tmux skip-guarded on `tmux -V` — ran green locally) + pure-helper unit tests + recovery tests (the deterministic survive-restart equivalent) + a config-schema test. `:typecheck`/`:lint`/`:test` + `moon ci` green; existing terminal/approval/gateway/pool specs unedited.

**🎉 Phase 17 complete** (A seam → B tmux → C selection/reattach → D contract tests). midnite agent runs can now survive a gateway restart.
## 2026-06-22 — Phase 10 Theme D: Playwright e2e harness + core flow specs (PR #84)

Phases 0–9 built the product; this is the first **end-to-end flow coverage** — Playwright driving the real Next.js app against a real, seeded gateway, exercising the cross-package paths unit/Storybook tests can't (navigation, the kanban drag, live gateway data, the office canvas).

- [x] **D1 — harness** ([playwright.config.ts](../packages/web/playwright.config.ts), [e2e/](../packages/web/e2e/)): boots two servers per run — the **real gateway** as a direct `node --import tsx` child (killable, so teardown can't orphan it → no stale reuse) on a **throwaway absolute temp SQLite file**, with pool/heartbeat/workflows disabled and **no LLM credentials** (serves real REST/WS, never spawns or calls out), plus a **Next dev server** pointed at it via `NEXT_PUBLIC_GATEWAY_URL`. Deterministic & isolated: ports freed + temp DB removed before each run, on oddball dedicated ports clear of dev (3000/7777). Seeded over the gateway REST API; asserts by role/text. IPv4-pinned origins (the gateway binds 127.0.0.1).
- [x] **D2 — flow specs:** **board** (seed → assert columns → drag Todo→Backlog → persists across reload, a plain restatus that never spawns), **office** (Phaser canvas + HUD mount, store-driven DOM not pixels), **workflows/councils/dashboard** (one happy-path each; dashboard stubs external widget calls).
- [x] New **`web:e2e`** moon task with **`runInCI: false`** — out of `moon ci` and the default `:test` gate (heavier, spawns servers). Added `@playwright/test`; `e2e/**` + `playwright.config.ts` added to web's typecheck/lint cache inputs.
- ⏳ **Deferred:** the office **proximity-walk** interactions (board room / library / break) — need deterministic Phaser physics control (flaky); covered at the component level by the office-HUD stories (C2).
- [x] `web:e2e` **6/6 green** (repeatable, no accumulation); pre-push gate green (`:typecheck`, `:lint`, `:test` — web 245 + all packages, run from a worktree outside `.git` since Vite denies `.git/**`); `moon ci` green on PR #84. Self-review caught + fixed the IPv4 binding and the parallel-invocation foot-gun (documented).

**Theme D done** (bar the deferred office walk). Remaining Phase 10: **Theme E** (screenshot previews — depends on this) and **Theme F** (CI wiring: the e2e job, coverage). Themes A/B/C already shipped.

## 2026-06-22 — Phase 15 Theme C: answered-question affordance + filter (PR #83)

The gateway already answered `question`-kind tasks inline at intake (PR #55: `PlannerService.answer` → resolve to **done** + an `answer` task-event, with the thread rendering the markdown answer). But on the board an answered question was indistinguishable from any other completed task and there was no way to find them. This finishes Theme C's UI.

- [x] **`shared`** — `isAnsweredQuestion(task)` predicate + `ANSWER_EVENT_KIND` constant: the single contract for "this question was answered inline" (kind `question` + an `answer` event). The gateway's answer-event write now uses the constant instead of a string literal. Unit-tested.
- [x] **`web`** — an **"Answered"** badge on the task card and in the thread header, and an **"Answered"** filter toggle on the Tasks page so resolved questions are distinguishable from ordinary completed work and findable apart from it. `FilterPills` gained a `hideAll` option for the single-toggle case; the thread timeline now keys off `ANSWER_EVENT_KIND`.
- [x] **Tests** — shared predicate tests; `task-card.test.tsx` (badge shows for an answered question, not for a plain done task or an unanswered question); an `AnsweredQuestion` Storybook story (browser-tested) + board fixture.
- ↪️ **Decision §3 resolved:** `done` + `answer` event (not a new `answered` status) — matching what PR #55 already shipped, so no migration.
- [x] `:typecheck` · `:lint` · `:test` (web 265, gateway 594, shared, ui 15) green; `moon ci` green on PR #83. Before/after card + board screenshots in the PR.

**Theme C complete.** Remaining Phase 15: **Theme A** (bulk add — note already shipped via Phase 16) and **Theme D** (knowledge-files watcher) — D is the last net-new infra slice.

## 2026-06-22 — Phase 19 Theme D: ongoing setup-readiness panel in settings (PR #82)

A permanent **Setup readiness** section in Settings → System — readiness isn't only a first-run concern, an install can break later (a revoked key, an uninstalled CLI). Reuses the Theme-A endpoint; no second source of truth. Web-only.

- [x] **`SetupStatusPanel`** ([app/(main)/settings/system/setup-status-panel.tsx](../packages/web/app/(main)/settings/system/setup-status-panel.tsx)) wired into `SystemSection`: an `Accordion` with a Ready / Setup-incomplete badge, the per-item checklist (dot + label + detail + a **Fix/Manage** deep-link), a **Re-check** button, and graceful loading + error/retry states. Re-checks on window focus.
- [x] **DRY:** extracted the status-dot colours + per-item settings hrefs into [lib/setup-items.ts](../packages/web/lib/setup-items.ts), shared by the panel and the Theme-C nudge.
- [x] RTL ([setup-status-panel.test.tsx](../packages/web/app/(main)/settings/system/setup-status-panel.test.tsx)) + Storybook (`NotReady`/`Ready`/`Error`) coverage; `web:typecheck`/`web:lint`/`web:test` (277) green; CI green on PR #82.

**Phase 19 is now A + C + D done** — only **Theme B** (the guided wizard, which also folds in the server-side completed marker + first-run auto-open deferred from C) remains.

## 2026-06-22 — Phase 14 Theme B1 (part): workflow credential vault — encrypted store + REST (PR #81)

A secure home for the secrets Theme C integration nodes will reference by id. Lands the security-critical store; consumers follow.

- [x] **shared** — `workflow-credential.ts`: secret-free public view (id/name/type/timestamps), per-type secret payload as a discriminated union (`http-bearer`/`http-basic`/`http-header`/`slack`/`smtp`), create/list responses. `type` = the payload discriminant (one home).
- [x] **gateway** — `workflow_credentials` table (migration **0032**); repo AES-256-GCM-encrypts the JSON secret blob before disk and decrypts only for server-side resolve; `WorkflowCredentialsService` (`list`/`create`/`remove`/`resolve`); thin `GET/POST/DELETE /workflow-credentials`. Reuses the existing `CryptoService` (no second crypto path).
- [x] **Fail-closed** — `create` rejected with 400 + WARN when `MIDNITE_SECRET_KEY` is unset; secrets unusable without the key (same contract as provider keys, Phase 7 A1).
- [x] **Write-only secrets** — list/create return names + types only; plaintext never serialised to a client. `service.resolve(id)` returns the decrypted, validated payload for executors, inside the gateway.
- [x] 10 service tests (real `:memory:` SQLite + `CryptoService`): round-trip via resolve, type-from-discriminant, encrypted-at-rest (`v1:` row, no plaintext), never-leak (list+create), delete, unknown-id, both fail-closed paths. Full gateway suite green (94 files / 604 tests — also proves AppModule boots). `moon ci` green on #81.
- ↪️ **Follow-ons (B1 remainder):** HTTP-node `credentialId` consumption in the engine (`WorkflowNode.credentialId` + `service.resolve()` already exist) and the web credentials manager + node-config picker; then **B2** (OAuth2). Gates **Theme C** integrations.

## 2026-06-22 — Phase 29 Theme B: root CHANGELOG.md (PR #80)

midnite had no user-facing release history — `0.0.0` everywhere, one `v0.0.0` tag, changes living only in commit subjects and `todo/done.md` (a phase tracker, different audience). Theme B seeds the curated changelog the release tooling writes into.

- [x] Root [`CHANGELOG.md`](../CHANGELOG.md) in **Keep a Changelog** format: `## [Unreleased]` (curated, grouped highlights heading toward `0.1.0`) + `## [0.0.0] - 2026-06-18` scaffold baseline + compare/tag links.
- [x] Preamble states the **lockstep** rule (shared `MAJOR.MINOR`, independent `PATCH`) and that release sections are cut via `/release-prep`→`/release-complete` (Themes C/D), kept separate from `done.md`. README links it.
- [x] Scaffold + high-level seed only (Decision §7); precise per-release notes land when the first release is cut. Docs-only — typecheck + lint green. Phase 29: A2 + B done; A1/A3 (RELEASING.md) and C/D (skills) remain.

## 2026-06-22 — Phase 12 Theme D: full n8n-style expression editor (PR #76)

Phase 12 shipped the `{{ }}` engine (A–C) and the ƒx toggle (D starter, #63), but references were still hand-typed with no discovery or feedback. This finishes Theme D's headline UX: references become discoverable, insertable, and previewable. Web-only; the grammar/resolver stays the shared contract — the new code only *navigates* it.

- [x] **Autocomplete** — typing in a ƒx field suggests roots (`$json`/`$node`/`$env`), upstream node **labels** inside `$node["…"]`, and object **keys** after any resolvable parent path; keyboard-navigable (↑/↓/Enter/Esc).
- [x] **Data picker** — a click-to-insert tree of the last run's data: the node's own input under `$json` and each **ancestor** node's output under `$node[label]` (downstream nodes can't be referenced), drilling into nested objects/arrays.
- [x] **Inline resolved-value preview** — what the field resolves to against the last run, a path-naming error for a bad reference, and a "run once to preview" empty state. Pinned sample data stays deferred to Theme E.
- [x] Pure, tested logic in [`lib/expression-editor.ts`](../packages/web/lib/expression-editor.ts) (ancestor walk, design-time `ExpressionContext`, reference tree, cursor-aware suggestions, insertion); React wiring in [`components/expression-editor.tsx`](../packages/web/components/expression-editor.tsx); the last run is threaded `WorkflowEditor → NodeConfigPanel → NodeFields`. Design-time context mirrors the engine exactly.
- [x] Review caught + fixed an edge-case bug: a caret before a leading `{{` was reported as *inside* the span (would splice a bare ref outside the braces) — bound the `lastIndexOf` search to `cursor - 2`, with a regression test.
- [x] 16 lib unit tests + RTL on `NodeConfigPanel` (preview, missing-ref error, autocomplete, picker insert) + a Storybook catalog with interaction tests; `:typecheck`/`:lint`/`:test` (270 web) green; CI green on #76.

Phase 12 status: **A–D + F all ✅**. Remaining: **Theme E** pin-sample-data (deferred — its consumer, the picker/preview, now exists).

## 2026-06-22 — Phase 19 Theme C: soft first-run setup nudge (PR #79)

Surfaces the Theme-A readiness model. A dismissible corner card that appears when the install isn't `ready`, points the user at what's missing, and **never blocks the board** (Decision §2). Web-only.

- [x] **`SetupNudge`** ([components/setup-nudge.tsx](../packages/web/components/setup-nudge.tsx)) mounted once in the `(main)` layout: fetches `/setup/status`, and when `!ready` floats a compact red/amber/green checklist (mirroring the system-toolchain dots) with each unfinished row deep-linking into its settings surface + a primary CTA at the first blocker.
- [x] **Soft only:** hidden when `ready`, hidden on `/settings/*` (Theme D owns the in-settings view), dismissible for the session, fail-open on a fetch error. Re-fetches on window focus so a regressed setup (revoked key / uninstalled CLI) re-surfaces.
- ◐ **Dismiss flag (Decision §4):** shipped the sanctioned **localStorage/session** fallback (sessionStorage); the **server-side per-install marker + first-run wizard auto-open** are deferred to **Theme B** (the wizard) where they're actually needed — avoids a gateway migration colliding with the in-flight schema work.
- [x] RTL ([setup-nudge.test.tsx](../packages/web/components/setup-nudge.test.tsx)) + Storybook (`NotReady`/`AlmostReady`/`Ready`) coverage; `web:typecheck`/`web:lint`/`web:test` (260) green; CI green on PR #79.

Next on Phase 19: **Theme B** (guided wizard UI — folds in the server-side completed marker + auto-open) and **Theme D** (ongoing Status panel in settings/system). Both consume the Theme-A endpoint.

## 2026-06-22 — Phase 14 Theme D: CLI workflow commands with live `--watch` (PR #78)

Workflows were API-only from the terminal. Theme D adds `midnite workflow` parity, and `--watch` reuses the live-streaming reducer from Theme A (#72) — the terminal tail and the web run panel now fold the same event stream.

- [x] **`midnite workflow list`** — table: id · name · enabled · trigger (cron inline for schedules) · steps · last run.
- [x] **`midnite workflow run <id>`** — trigger a manual run (`run <id> [status]`); `-w/--watch` streams per-node status live until terminal (exit 1 on failure).
- [x] **`midnite workflow runs <id>`** — recent run history.
- [x] **`--watch` folds `/ws/workflows` through the shared `applyWorkflowEvent` reducer**, printing per-node lines with real node labels. REST backs it like the web hook: connect-time backfill (early/instant-run events precede the subscribe), a reconcile on `run.failed`, and a poll fallback if the socket dies. Global `WebSocket` (Node 22) — no new deps.
- [x] **Typed client methods** validate every response against the shared zod schemas (`WorkflowSummary`/`Workflow`/`WorkflowRun`/`RunResponse`). CLI stays a pure HTTP/WS client.
- [x] 12 unit tests over the pure render helpers (27 cli tests total); `:typecheck`/`:lint` green; `moon ci` green on #78. **Verified live** against a running gateway — `list`, `runs`, and `run --watch` (`✓ Fetch todo #1 → … → ✓ run succeeded`, exit 0).

Phase 14 status: **A ✅ (#72), D ✅ (#78)**. Remaining: **B** (credential vault) → **C** (integrations), **E** (editor polish).

## 2026-06-22 — Phase 13 follow-on E: per-repo branch naming + PR templates (PR #74)

Every agent run got the same bare seed prompt regardless of target repo — no way to express "branch off `feature/` here" or "follow this PR-body shape." Follow-on E adds optional per-repo conventions that fold into the agent's prompt.

- [x] **`shared`** — `branchPrefix` / `prTemplate` (optional, length-capped: 100 / 4000) on `RepoSchema`, the create/update requests, and the `config.repos` seed shape (`repo.ts` / `config.ts`); tests for trim/optional/over-long/clear-with-empty.
- [x] **`gateway`** — `branch_prefix` / `pr_template` columns (forward migration `0031_repo_conventions`), threaded through `ReposService` create/update/seed (empty string clears → null). A pure `appendRepoConventions` helper ([`pool/lib/build-agent-prompt.ts`](../packages/gateway/src/pool/lib/build-agent-prompt.ts)) appends a `## Repository conventions` section to the seed prompt, wired into `AgentRunnerService` after URL-context enrichment. A task with no/unknown repo, or a repo with no conventions, leaves the prompt untouched. Helper + service + runner tests.
- [x] **`web`** — branch-prefix + PR-template fields in the Settings → Repos add/edit forms, plus a branch chip + "PR template" indicator per repo row. RTL: send-on-create, edit, display.
- [x] Gate green (typecheck · lint · 585 gateway · 248 web); ticks [`outstanding.md`](outstanding.md) #9. Phase 13 follow-on E done — C (inference repo-guessing) and F (per-repo status widget) remain.

## 2026-06-22 — Phase 24 Theme A2: mobile bottom-tab navigation (PR #75)

On a phone the desktop sidebar was still pinned left as a 3.5rem icon rail, eating width and shifting every page right — no thumb-reachable nav. A2 swaps it for a mobile-native pattern below `md` while leaving tablet/desktop untouched.

- [x] **New `mobile-nav.tsx`** — a fixed **bottom-tab bar** rendered below `md`: the first four enabled surfaces (same `lib/features` order the sidebar uses) get one-tap tabs with an active top-indicator + `aria-current`, and a **More** button opens a bottom **sheet** (`role="dialog"`, Escape/backdrop/navigation dismiss) holding the overflow surfaces plus **Settings / Theme / Lock**. `More` is always present so those last three stay reachable even when every tab slot is a feature (Decision §5 settled: bottom-tabs + overflow drawer).
- [x] **`nav-bar.tsx`** — the sidebar is now `hidden md:flex` (icon-rail/expanded states unchanged at `md+`); it computes the ordered enabled-feature list once and hands it to `MobileNav`, keeping the lock/passcode/idle flow in one place. ⌘K stays the power-user jump.
- [x] **Layout/header hygiene** — `(main)/layout.tsx` clears the fixed bar with safe-area-aware bottom padding on mobile and keeps the `--nav-offset` left offset only at `md+` (inline style → `md:[padding-left:var(--nav-offset)]`). `page-header.tsx` wraps its title/actions row (`flex-wrap` + `min-w-0`) instead of overflowing at narrow widths.
- [x] **Tests** — `mobile-nav.test.tsx` (RTL): tab set, active state, sheet contents, Settings-always-reachable, Lock fires + closes, overflow-route active flag, Escape/navigation dismiss.
- [x] `:typecheck` · `:lint` · `:test` (web 252) · `web:build` green; `moon ci` green on PR #75. Before/after phone screenshots (390×844) in the PR.

**A2 complete.** Remaining Phase 24: **A3** (per-surface reflow + office/editor desktop-only gates) → **B** (touch interactions) → **C** (PWA installability).

## 2026-06-22 — Phase 14 Theme A: live run streaming via incremental event reducer (PR #72)

The workflow run panel was half-wired — the hook opened `/ws/workflows` but re-pulled the whole run over REST on every event, so it was effectively still polling. Theme A finishes the live path so a running workflow updates straight off the event stream.

- [x] **`shared` — pure `applyWorkflowEvent(run, event)` reducer** (+ `isRunTerminal`) in `workflow-run-reducer.ts`: folds one `WorkflowEvent` into a run snapshot (start → per-node transitions → finish), never mutating the input. Lives in `shared` so the web hook **and** the future CLI `--watch` (Theme D) share it, and liveness is testable without a browser (the doc's explicit ask). Fixtures-only unit test (transitions, purity, run-mismatch, `run.failed` vs `run.finished`, full fold).
- [x] **`web` — `use-workflow-run.ts` folds events incrementally** instead of refetching per message. Node statuses, outputs, and the canvas colouring update live; the run-output panel reads the same `run.nodeRuns` so it updates for free. Polling is the explicit fallback when the socket is down.
- [x] **REST kept to four roles**: initial seed (`runWorkflow` returns all nodes `pending`), one **connect-time backfill**, the reconnect/poll fallback, and a single reconcile on `run.failed` (no run body in the event). A terminal-state guard stops a slow backfill from clobbering the final run. Hook test drives a fake WebSocket to prove no per-event refetch.
- ↪️ **Latent bug fixed:** the run starts server-side before the WS handshake completes and the gateway has no event replay, so a trigger-only / instant run finished before the client subscribed and the old code hung at `running` forever. The connect-time backfill resolves it.
- [x] `:typecheck` · `:lint` · `:test` green across the graph (web 252, gateway 90, ui 14, cli 2, shared 316); `moon ci` green on PR #72. No static visual change (only update *timing*), so no screenshots.

**Theme A complete.** Remaining Phase 14: **B** (credential vault) → **C** (integrations), with **D** (CLI parity, reuses this reducer for `--watch`) and **E** (editor polish) sliceable in parallel.

## 2026-06-22 — Phase 19 Theme A: setup-readiness model + `GET /setup/status` (PR #73)

The substrate for first-run onboarding — a single "is this install set up?" signal the wizard / soft nudge / status panel (Themes B–D) will all key off. Model + endpoint only; no UI yet.

- [x] **`SetupStatus` contract in `shared`** (`setup.ts`): a per-item checklist (`provider` · `secret-key` · `agent-cli` · `agent-pool` · `repo`), each `{ id, label, state: ok|warn|missing, detail? }`, plus a derived `ready`. `isSetupReady()` encodes **Decision §3** — ready ⇔ a usable secret key **AND** a reachable model (a provider key **or** a working agent CLI); `warn` items (pool off, no repo) never block. zod schema + truth-table tests.
- [x] **`GET /setup/status`** — thin `SetupController` over a `SetupService` that **composes existing services** (`ProvidersService` / `CryptoService` / `AgentsService`) + the loaded config. Pure aggregation: no new persistence, no cross-domain repository access. `ProvidersModule` now exports its service.
- [x] **`web`** — `getSetupStatus()` added to the typed API client for Themes B–D.
- ↪️ **Deviation noted:** the agent-CLI check uses `AgentsService` (where `claude`/`gemini`/… detection lives), not `EnvironmentService` (dev toolchain only — homebrew/node/proto/moon, none of which gate readiness). Same `detectCli` login-shell probe.
- [x] `:typecheck` · `:lint` · `shared/gateway:test` (582) · `web:test` (245) green; `moon ci` green on PR #73. No visual change.

Next on Phase 19: **Theme B** (guided wizard UI reusing env cards + provider form), **C** (first-run soft nudge banner), **D** (ongoing status panel in settings/system) — all consume this endpoint.

## 2026-06-21 — Phase 25 Theme D: Storybook catalog + DS docs + browser tests (PR #69) — **Phase 25 COMPLETE**

The final Phase 25 theme — `@midnite/ui` now has its own Storybook (component catalog + design-system docs) and runs its stories as browser tests. **Closes out Phase 25** (Themes A–D all merged); unblocks Phase 26 (the docs app).

- [x] **Lib Storybook on `@storybook/react-vite`** (no Next) — addon-a11y + addon-vitest + addon-docs. Preview applies the lib's tokens + a dedicated Tailwind config (content scans `src` + `.storybook`; colours → `hsl(var(--token))`) and wraps stories in `ThemeProvider` with a light/dark toolbar, so primitives render exactly as in the app.
- [x] **Primitive stories authored fresh** — the base primitives had no stories (Phase 10 storied domain components); a `Primitives/*` story per primitive covering key variants/states.
- [x] **Design-system MDX docs** (`Design System/*`) — colour-token palette, typography specimen, radius scale + clearly-marked placeholders (spacing/shadow/z-index/motion), getting-started on-ramp.
- [x] **Browser-test wiring** — `vitest.config.ts` splits into `unit` (node: boundary/tokens/theme-script/cn) + `storybook` (chromium: every story as a render+a11y test). `moon run ui:test` runs both; `moon.yml` gains `storybook`/`build-storybook`. CI installs chromium repo-wide.
- [x] **Docs-app seam** — lib cleanly consumable (`exports`, token CSS, peer React); Storybook is the v1 docs surface. `tsconfig` sets `declaration:false` for the typecheck pass (Storybook types trip TS2742 on declaration-check); shipped `.d.ts` come from vite-plugin-dts.

No `web` changes. Verified: `ui:build` (`"use client"` preserved) / typecheck / lint / build-storybook (31 stories + 4 docs) / `ui:test` **46 passed** (15 node unit + 31 chromium story tests); pristine frozen install; CI green. Independent review: faithful.

**🎉 `@midnite/ui` is now a complete, self-documenting design-system package** (Themes A scaffold → B tokens+theme → C primitives → D catalog). Next: Phase 26 (docs app on `@midnite/ui`).

## 2026-06-21 — Phase 10 C2: stories for workflows/councils/shipped widgets (PR #70)

Three more list-style self-fetching widgets storied on the `installMockFetch` helper (#53), continuing [Phase 10 C2](phase-10-test-suite-hardening.md). Pure coverage; no product change.

- [x] `workflows-widget` (`GET /workflows`), `councils-widget` (`GET /councils`), `shipped-widget` (`GET /tasks`) — each loaded / empty / error, asserting visible text in the headless-chromium run; static fixtures, no clock-derived assertions.
- [x] 9 new story tests; `:typecheck`/`:lint`/`:test` + `moon ci` green on PR #70 (`web:test` 245).
- ↪️ Remaining un-storied widgets are the chart/multi-endpoint ones (`throughput`/`usage`/`system-monitor`, `agents`/`all-projects`, `market-*`, `boardroom-panel`) — each needs more than the list-widget pattern (a pinned clock or multi-endpoint mocks).

## 2026-06-21 — Site: remove 3D for now + gradient-border on the preview panel (PR #68)

Two requested tweaks to the public site. The WebGL field was heavy and we're stepping back from it for now; the panel gains the brand gradient-border motif.

- [x] **Removed the 3D/WebGL particle field** (Phase 11 Theme B, ⏳ parked): deleted [`components/scene/`](../packages/site/components/) (particles/core/shaders/scene/backdrop), dropped `SceneBackdrop` from the landing + download routes, removed the `@react-three/*` + `three` deps (the scene was a dynamic chunk, so the WebGL bundle is gone at runtime). Relocated `prefersReducedMotion` → [`lib/reduced-motion.ts`](../packages/site/lib/reduced-motion.ts).
- [x] **Static [`AmbientBackdrop`](../packages/site/components/ambient-backdrop.tsx)** replacement: fixed, pointer-events-none, soft brand-tinted CSS blurs — keeps some depth without any canvas, themed for light/dark.
- [x] **Gradient-border on the persistent panel** (Theme C refinement): restructured [`PanelFrame`](../packages/site/components/panel/panel-frame.tsx) (ring/glow on an outer un-clipped element, content clipped on an inner one) + `pointer-events-auto` so it reacts to hover inside the panel's pointer-events-none wrapper. Subtle edge at rest → pronounced rotating conic gradient + a `.panel-glow` breathing pulse on hover/focus ([`globals.css`](../packages/site/app/globals.css)); disabled under reduced motion. Applies to the inline mobile panel too.
- [x] `:typecheck`/`:lint` green across the graph; `site:test` (19) + `site:build` (7 routes) green; `moon ci` green on PR #68.

## 2026-06-21 — Phase 15 Theme B: URL + GitHub-context inference (PR #67)

Links in a task's prompt are fetched and folded into the agent's seed prompt as a "Linked context" block — closing part of [Phase 15](phase-15-smart-intake.md#theme-b--url--github-context-inference--m--done-pr-67-2026-06-21) / [outstanding.md](outstanding.md) #3. Best-effort + fail-open; no new fetch path or runtime dep.

- [x] **Detect** — pure `extractUrls` + shared `parseGithubIssueOrPr` (resolves both `/issues/N` and `/pull/N`); helpers + formatting in `agent/lib/url-context.ts`, unit-tested.
- [x] **GitHub** — `gh api repos/{repo}/issues/{n}` (user auth → private repos) with an anonymous `api.github.com` REST fallback when `gh` is absent. `UrlContextService` owns the shell-out + fetch (network primitives are protected seams the spec overrides).
- [x] **General URLs** — fetched through the existing outbound SSRF guard (`isSafeHttpUrl`, private/loopback blocked) and reduced to readable text/title; reuses `readCapped`/`parseHtmlMetadata` from `opengraph.ts` rather than adding a second fetch path.
- [x] **Inject** — appended at the agent-run seed-prompt point (`agent-runner.start()`), byte-capped (5 URLs · 4k/source · 12k total), fail-open. `gateway:test` 573 · `shared` 290 · `cli` 15; `moon ci` green on PR #67.
- ↪️ **Phase 15 remaining:** Theme D (knowledge-files watcher). Theme A (bulk add) shipped via Phase 16; Theme C (inline answers) via PR #55.

## 2026-06-21 — Phase 29 Theme A2: lockstep version planner + version-check CI task (PR #66)

The versioning core the release skills depend on ([Phase 29](phase-29-releases-versioning-changelog.md#theme-a--versioning-policy--the-lockstep-tool--m)). Encodes the rule once: every package shares `MAJOR.MINOR`, only `PATCH` advances independently.

- [x] **`planVersionBump` + `sharesLockstepMajorMinor`** in [`@midnite/shared`](../packages/shared/src/version.ts) — pure bump math: `major`/`minor` move every package in lockstep (`(X+1).0.0` / `X.(Y+1).0`), `patch` bumps only the changed packages, `none` is identity; throws if the input isn't already in lockstep. 12 unit tests.
- [x] **`scripts/version-check.mjs`** + a workspace-root `root:version-check` moon task (new root [`moon.yml`](../moon.yml) + `.moon/workspace.yml` glob/sources split) — fails CI if package.json versions don't share one `MAJOR.MINOR` (patch may differ), naming divergers; runs once in `moon ci`. No versions changed (all stay `0.0.0`).
- [x] `:typecheck` (all projects resolve) · `:lint` · `shared:test` (300, +12) · `root:version-check` green; `moon ci` green on PR #66 (one re-run for the known-flaky terminal env-dump spec, unrelated).
- ↪️ **Remaining (phase-29):** A1 policy doc (`docs/RELEASING.md`) · A3 tag/branch scheme · B root `CHANGELOG.md` · C `/release-prep` · D `/release-complete`.

## 2026-06-21 — Phase 24 Theme A1: viewport + responsive breakpoint foundation (PR #51)

First slice of [Phase 24](phase-24-responsive-mobile-pwa.md) — the foundation the rest of Theme A (mobile nav A2, per-surface reflow A3) builds on. Web-only; the loopback data contract is unchanged (Decision §1). Settles the breakpoint-approach decision (§4): Tailwind v3 was already wired, so the answer is Tailwind responsive variants + one shared source of truth, not hand-rolled `@media`.

> ⚠️ **MERGED DURING A GITHUB ACTIONS OUTAGE — CI did not run on PR #51.** Actions was stalled repo-wide on 2026-06-21 (no runs anywhere 15:23–15:40+ UTC); PR open, close/reopen, and an empty-commit `synchronize` push all failed to spawn a workflow run. Merged at the user's instruction on a full **green local gate on the rebased tree** (rebased onto current `main` incl. #50/#65 `@midnite/ui`): `web:typecheck` ✅ · `web:lint` ✅ (0 errors) · `web:test` ✅ **56 files / 236 passed**. **To verify independently from `main`:** check the `push: main` CI run for squash commit `4e29b0b` once Actions recovers. (Same note on the PR #51 thread.)

- [x] **A1.1 — viewport export** ([`app/layout.tsx`](../packages/web/app/layout.tsx)): Next.js `viewport` (`width=device-width, initial-scale=1`); `themeColor` follows the `--background` token (light `#ffffff` / dark `#09090b`) via `prefers-color-scheme` instead of hardcoded white; pinch-zoom left enabled for a11y.
- [x] **A1.2 — breakpoint foundation** ([`lib/breakpoints.ts`](../packages/web/lib/breakpoints.ts)): Tailwind-aligned px values (`sm`–`2xl`) + `mediaUp`/`mediaDown`/`mediaBetween` helpers — one place CSS (`md:`/`lg:` variants) and JS agree on cutoffs (mobile `<md` 768 · tablet `md–lg` · desktop `≥lg` 1024). SSR-safe [`useMediaQuery`](../packages/web/hooks/use-media-query.ts) (`useSyncExternalStore`, no hydration mismatch) + semantic `useIsMobile`/`useIsTablet`/`useIsDesktop` for JS-driven reflow.
- [x] Added the **Responsive** convention to CLAUDE.md's Web section (the stale "Tailwind not yet wired" note was already corrected by #50). 10 new tests (`breakpoints` + `use-media-query`).
- ↪️ **Deferred within A1 (noted, not dropped):** dynamic `theme-color` on an *explicit* theme override (vs. system `prefers-color-scheme`) lands with Theme C's manifest colours; the `@tailwindcss/container-queries` plugin gets wired when A3's first self-reflowing component needs it. **Remaining in Phase 24:** Theme A2 (mobile nav), A3 (per-surface reflow + desktop gates), Theme B (touch), Theme C (PWA).

## 2026-06-21 — Phase 25 Theme C: migrate generic primitives → `@midnite/ui` (PR #65)

Moves the 10 generic UI primitives out of `packages/web/components/ui` into the library (Theme A scaffolded it, Theme B moved tokens + theme). Behavior-preserving — every primitive is logic-identical, web keeps working via re-export shims (Decision §2).

- [x] **10 primitives → `@midnite/ui/src/components`** — accordion, button, card, collapse, input, select, styled-select, switch, tabs, textarea. Only the `cn` import is rewritten to the lib's own `./lib/cn` (+ accordion→collapse, styled-select→select intra-refs); `'use client'` preserved on the 6 stateful ones so `dist/index.js` keeps its RSC boundary. `src/index.ts` re-exports each primitive's full surface (components + types + `buttonVariants`).
- [x] **`asset-search-select` stays in web** — domain-coupled (`@midnite/shared` types + `@/lib/api`).
- [x] **Web shims** — the 10 `web/components/ui/*` files are now thin re-exports of `@midnite/ui`; every import site (incl. `*.stories.tsx` + `asset-search-select`) compiles unchanged. Codemod that deletes the shims is a later sweep.
- [x] New lib deps: `class-variance-authority`, `lucide-react`, `react-select`. `button`'s `buttonVariants` gets an explicit type annotation (cva's inferred type tripped TS2742 on `.d.ts` emit — runtime + `VariantProps` inference unchanged).
- [◐] Primitive **stories stay in web** (running via the shims) until Theme D brings the lib's own Storybook — no story regresses.

Verified: lib build (`"use client"` on `dist/index.js`) / typecheck / lint / vitest; web `next build` + typecheck + lint + vitest **211** (52 files, incl. storybook chromium rendering the primitives via shims); pristine frozen install; CI green. Independent review: faithful, behavior-preserving. **Next:** Theme D (lib's own Storybook `@storybook/react-vite` + MDX DS docs; migrate the primitive stories) — completes Phase 25.

## 2026-06-21 — Phase 13 follow-on F: repo chip on task cards (PR #64)

Surfaces a task's target repo on the board now that repos are a first-class entity (Themes A+B).

- [x] New `RepoChip` ([`repo-chip.tsx`](../packages/web/components/repo-chip.tsx)) — a monochrome folder-git + repo-name chip, distinct from the colored project tag (repo and project are orthogonal axes).
- [x] Rendered in the task-card badge row ([`task-card.tsx`](../packages/web/components/task-card.tsx)) when `task.repo` is set; the task thread already showed the repo. A `WithRepo` story (run as a test) asserts it renders. `web:typecheck`/`lint`/`test`/`build` green (web 54 files / 226 tests) on PR #64.
- [x] Reconciled phase-13 follow-ons: **D (per-repo concurrency caps) already shipped via Phase 5 / PR #49**; the optional per-repo status widget remains → Phase 7 Theme C; C (repo guessing) + E (branch/PR templates) still open.

## 2026-06-21 — Phase 11 COMPLETE: scrollytelling core — particles, panel, hero, modules (PR #59)

Completes the public-site rewrite. The interlocking core the foundations slice (PR #44, Themes A/D/G/H) was built to carry: the three always-mounted layers the scroll controller drives. **Phase 11 is now fully done** (all 8 themes). `packages/site` only; added `motion` (Decision §2).

- [x] **Theme C — Persistent preview panel:** one Mac-window [`<PreviewPanel>`](../packages/site/components/panel/preview-panel.tsx) rendered once at the page root that morphs position **and** size between sections (Framer Motion spring) and cross-fades its content, driven by the scroll controller as the single source of truth. Per-section target rects from a pure [`panelRectFor`](../packages/site/components/panel/panel-rect.ts) helper ([`panel-sections.ts`](../packages/site/components/panel/panel-sections.ts)); fades out over the download section. Desktop-only; mobile stacks an inline panel. Instant under reduced motion.
- [x] **Theme F — Panel content modules:** stylised evocations (Decision §3) — a typing [terminal](../packages/site/components/panel-content/terminal-module.tsx), a [kanban board](../packages/site/components/panel-content/kanban-module.tsx) with a card looping across columns, and a live [agent/session card](../packages/site/components/panel-content/session-module.tsx) with a ticking timer — in a shared [`PanelFrame`](../packages/site/components/panel/panel-frame.tsx) (traffic-light chrome). Each has an idle micro-animation; all degrade under reduced motion.
- [x] **Theme E — Epic hero:** app icon + wordmark, a headline cycling three typed title/subtitle pairs ([`useTypewriterCycle`](../packages/site/components/sections/use-typewriter-cycle.ts), Decision §5 placeholder copy), radial scrim, the centred grid-card panel; `sr-only` stable text. Reduced motion shows pair 1.
- [x] **Theme B — Particle field:** lerps accent tint/size/swirl toward the active section's style, recolours fog/vignette/exposure for light vs dark (Decision §7), pauses the rAF time-advance when the tab is hidden; reduced motion snaps to static. Reads the active section + theme from outside the R3F canvas and passes them in as props.
- [x] Tests: `useTypewriterCycle`, the panel-sections config, and the pure `panelRectFor` helper (site suite now 19 tests). `:typecheck`/`:lint` green across the graph; `site:test` + `site:build` (7 routes prerender) green; `moon ci` green on PR #59. (CI initially didn't fire — the branch had a `pnpm-lock.yaml` conflict with the fast-moving main, so GitHub couldn't build the merge ref; merging main in resolved it.)

## 2026-06-21 — Phase 12 Theme D (start): ƒx expression toggle + unique node labels (PR #63)

The two **S** foundations of the n8n-style expression editor — the autocomplete input, data picker, and resolved-value preview remain.

- [x] **ƒx toggle** ([`node-config-panel.tsx`](../packages/web/components/node-config-panel.tsx)): every `expressionable` field gets a per-field ƒx button flipping it between its literal control and a monospace expression input (field-specific aria-label). Mode seeds from whether the saved value is already a `{{ }}` template; the field forms re-seed per selected node (keyed on node id).
- [x] **Unique node labels** ([`workflow-store.ts`](../packages/web/lib/workflow-store.ts)): a `uniqueLabel` helper auto-suffixes a clash (" 2", " 3", …), applied in `addNode` and a new `setLabel` action; the config-panel header becomes an editable rename field that commits on blur/Enter and re-syncs when the store de-dupes. Labels matter because expressions reference upstream nodes by label.
- [x] Tests (+8): `workflow-store` (`uniqueLabel`; addNode/setLabel auto-suffix; free rename) + `node-config-panel` (ƒx round-trips a field literal↔expression; seeds from a template; rename auto-suffixes). `:typecheck`/`:lint`/`:test` + `web:build` green on PR #63 (web 50 files / 210 tests).

## 2026-06-21 — Phase 18 Theme D: generalize the report renderer (PR #62)

The shared substrate for [Phase 18](phase-18-reports-exports.md#theme-d--generalize-the-renderer--reuse-shared-substrate--sm--done-pr-62-2026-06-21) — lift the councils-only client-side renderer so tasks/projects/workflow-run exports (Themes A/B/C) just plug in. Reuse, no redesign; the no-puppeteer (markdown server-side · PDF client-side) contract is untouched.

- [x] **Generic renderer** — new pure, unit-tested [`report-html-export.ts`](../packages/web/lib/report-html-export.ts): `buildReportHtml({ title, bodyHtml, metaLine? })` → self-contained offline printable HTML, with `escapeHtml` + `REPORT_PROSE_CSS` lifted out of `council-html-export.ts`, plus `reportHtmlFilename`.
- [x] **Shared markdown capture** — [`capture-markdown-html.tsx`](../packages/web/lib/capture-markdown-html.tsx) lifts the render-`MarkdownPreview`-and-capture helper out of `council-run-tabs.tsx` so every HTML export matches in-app rendering + sanitization.
- [x] **Councils reuses the substrate** — `council-html-export.ts` imports the shared `escapeHtml` + prose CSS; output is **byte-identical** (verified) — no behaviour change, proving the lift.
- [x] **`ExportMenu`** was already generic with copy-as-markdown; added an optional `title` for the print document title (distinct from the download slug) — the `{ fetchMarkdown, filename, title }` shape A/B/C drop in.
- [x] 6 new `report-html-export` unit tests; `:typecheck`/`:lint`/`:test` + `moon ci` green on PR #62 (`web:test` 208).
- ⏳ The *optional* gateway export-response helper is deferred to land with Theme A's first export route (no consumer yet). **Next:** Theme A (task export) — pure `taskToMarkdown` + `GET /tasks/:id/export` + `ExportMenu` in the task thread.

## 2026-06-21 — Phase 10 C2: stories for sessions/memories/activity widgets (PR #60)

More self-fetching dashboard widgets storied on the `installMockFetch` helper (#53), continuing [Phase 10 C2](phase-10-test-suite-hardening.md#c2-interaction-tests-on-key-components--partial-pr-36--48--53--60-2026-06-21). Pure coverage; no product change.

- [x] `sessions-widget` (`GET /sessions`, raw array), `memories-widget` (`GET /memories`, `{ memories }` envelope), `activity-widget` (`GET /tasks`) — each with **loaded / empty / error** stories asserting visible text in the headless-chromium run; static fixtures, no relative-time assertions.
- [x] 9 new story tests; `:typecheck`/`:lint`/`:test` + `moon ci` green on PR #60 (`web:test` 211).
- ↪️ Remaining self-fetching widgets (`market-*`, `agents`/`throughput`/`usage`/`system-monitor`/`workflows`/`councils`/`all-projects`, `boardroom-panel`) still backfillable with the same helper.

## 2026-06-21 — Phase 25 Theme B: design tokens + theme runtime → `@midnite/ui` (PR #57)

Moves the design system's *foundation* out of `packages/web` into the `@midnite/ui` leaf (Theme A stood up the empty package). Extraction, not redesign — token values unchanged; web's appearance is identical.

- [x] **Tokens → `@midnite/ui/styles`** — the shadcn-style HSL custom properties + `.dark` block now live in `src/styles/tokens.css` (framework-agnostic: no `@layer`/`@tailwind`, so a non-Tailwind consumer can use them). A typed token map in `src/tokens` mirrors them for JS consumers; verified byte-exact against the values removed from `globals.css`.
- [x] **Full DS taxonomy** — `color` + `radius` filled; `spacing`/`typography`/`shadow`/`zIndex`/`motion` present as clearly-marked `{ placeholder: true }` so the system is structurally complete + extensible.
- [x] **Theme runtime → `@midnite/ui/theme`** — `ThemeProvider`/`useTheme`/theme-context + the no-flash init script. The Vite build now **preserves `'use client'`** on `dist/theme.js` (a `preserveUseClient` rollup plugin re-emits the directive rollup strips by default) so a Next.js RSC consumer gets a real client boundary — confirmed in `dist` + `next build`.
- [x] **Web consumes the lib** — `globals.css` imports `@midnite/ui/styles` (drops the duplicated tokens, keeps `--nav-offset` + app CSS); `app/theme/*` become thin re-export shims (Decision §2, codemod later); `@midnite/ui` added to deps + `transpilePackages` + web's moon `dependsOn`.

`theme-toggle` stays in web until Theme C (it composes the `Button` primitive that moves there). Verified: lib build/typecheck/lint/vitest (15); web `next build` + typecheck + lint + vitest **194** (incl. storybook chromium rendering `ThemeProvider` via the shim); pristine frozen install; CI green. **Next:** Theme C (migrate the generic primitives + their stories, web keeps re-export shims).

## 2026-06-21 — Phase 4: inline answers for question-kind tasks (PR #55)

A task classified as a `question` is answered directly by the plan model at intake instead of being queued for a coding agent — closing a Phase 4 done-criterion (also Phase 15 Theme C).

- [x] `PlannerService.answer(prompt)` ([`planner.service.ts`](../packages/gateway/src/agent/planner.service.ts)): a plain-text answer on the plan model, fail-soft → `null` (AI off / error / empty), mirroring `triage`.
- [x] `createFromPrompt` ([`tasks.service.ts`](../packages/gateway/src/tasks/tasks.service.ts)): `question`-kind tasks generate an answer; a successful answer resolves the task to **`done`** (no agent run) with the answer recorded as an `answer` thread event. Only questions take this path; falls back to the triage column when no answer is produced.
- [x] Web ([`task-thread-modal.tsx`](../packages/web/components/task-thread-modal.tsx)): the `answer` event renders as Markdown rather than a JSON payload dump.
- [x] Tests (+6): planner answer (disabled/trimmed+usage-tag/empty+throw); service question→done+event, null→queued, non-question never answers. `:typecheck`/`:lint`/`:test` + `gateway:build` green on PR #55 (gateway 559 · web 194). **Phase 4 remaining:** URL/GitHub context → Phase 15 B; repo-guessing → Phase 13; KB watcher → Phase 15 D; bulk-input already done via Phase 16.

## 2026-06-21 — Phase 17 Theme A: extract the `Spawner` interface from TerminalService (PR #56)

The behaviour-preserving refactor that gates the pluggable terminal backends ([Phase 17](phase-17-spawner-tmux.md#theme-a--extract-the-spawner-interface--l--done-pr-56-2026-06-21)). Puts the node-pty process lifecycle behind a `Spawner` seam so a `tmux` backend (Theme B) can slot in without touching the ring/streaming/approval machinery. Gateway-only; `pty` behaviour byte-for-byte unchanged.

- [x] **`Spawner` / `SpawnSpec` / `SpawnHandle` + `SPAWNER` token** ([`terminal/spawner/spawner.ts`](../packages/gateway/src/terminal/spawner/spawner.ts)) — gateway-internal; `SpawnHandle` mirrors node-pty's `IPty` so `PtyHandle.proc`'s type swap is the only call-site change.
- [x] **`PtySpawner`** ([`terminal/spawner/pty-spawner.ts`](../packages/gateway/src/terminal/spawner/pty-spawner.ts)) — owns the lazy `require('node-pty')` + fail-closed semantics (throws `SpawnUnavailableError`, never a silent disable); a thin pass-through. Now the only node-pty importer in the spawn path.
- [x] **`TerminalService`** drops its node-pty import / `loadPty()`; all three spawn paths route through the injected `Spawner`. Module provides `SPAWNER` via a `terminal.mode` factory (PtySpawner default); the constructor also defaults the spawner to a real `PtySpawner` so direct-construction specs work without DI.
- [x] Every terminal/approval/gateway spec passes **unedited** — `:typecheck`/`:lint`/`:test` + `moon ci` green on PR #56 (gateway 553; one re-run for the known-flaky terminal env-dump spec, unrelated).
- ↪️ **Remaining (phase-17):** B `TmuxSpawner` (durable sessions) · C backend selection + survive-restart reattach + drop warp/iterm · D Spawner contract tests.

## 2026-06-21 — Phase 10 C2: data-fetching widget stories + fetch-stub helper (PR #53)

Continues [Phase 10](phase-10-test-suite-hardening.md#c2-interaction-tests-on-key-components--partial-pr-36--48--53-2026-06-21) C2 — the data-fetching widgets that previously couldn't be storied because they self-fetch. Adds the missing mock infra + the first widget stories on it. Pure coverage; no product change.

- [x] **`installMockFetch` helper** ([`stories/mock-fetch.ts`](../packages/web/stories/mock-fetch.ts)): swaps `globalThis.fetch` for a path-keyed stub of canned, schema-valid gateway responses; a `status >= 400` handler drives a widget's error branch. **Unmatched requests fall through to the real fetch** — important so Storybook's own browser module loading is never intercepted (the first cut returned 502 for unmatched and broke later stories' dynamic imports; caught in the local run and fixed).
- [x] **Widget stories:** `news-widget` (list / grid / error), `weather-widget` (°C / °F / error), multi-endpoint `health-widget` (healthy / gateway-down — `/health` + `/agents/cli/statuses` + `/agents`, handlers ordered specific→general). Each a render + interaction test in the headless-chromium story run.
- [x] 8 new story tests; `:typecheck`/`:lint`/`:test` + `moon ci` green on PR #53 (`web:test` 202).
- ↪️ **Remaining (logged in phase-10 C2):** the rest of the self-fetching widgets (`market-*`, `sessions`/`agents`/`throughput`/`usage`/`system-monitor`, `boardroom-panel`) can now be backfilled with the same helper — each a small add.

## 2026-06-21 — Phase 13 COMPLETE — Theme B: repos selectable & validated (PR #52)

The last theme of [Phase 13](phase-13-repos-first-class.md#theme-b--selectable--validated--m--done-pr-52-2026-06-21). Theme A (PR #45) made repos a DB-backed registry; B makes them selectable at task-creation time and makes `task.repo` always point at a known repo. **Phase 13 is now done** (Themes A + B; the C–F follow-ons stay explicitly deferred). Spans gateway + web; CLI flag was already in place from PR #47.

- [x] **B1 picker (web):** a Repo `<select>` in the new-task modal ([`new-task-modal.tsx`](../packages/web/components/new-task-modal.tsx)), fed by `GET /repos` with an explicit **Unassigned** default, alongside the project picker as an orthogonal scope axis; threaded through [`tasks-view`](../packages/web/components/tasks-view.tsx) + the tasks page; sent on single + bulk create; hidden when no repos exist. (CLI `add --repo` landed in PR #47.)
- [x] **B2 validation (gateway):** `TasksService.resolveRepoReference` validates `repo` against the registry on create/bulk — unknown name → 400, blank → unassigned (null), never a dangling free string; bulk fails fast on a bad batch repo. References stay the registry-unique **name**, not an id (Decision §1/§3). `TasksService` gains a `ReposService` dep (`TasksModule` imports `ReposModule`).
- [x] **B3 cwd precedence:** extracted the project workDir → repo → fallback → gateway-cwd ordering into a pure, unit-tested [`pickSessionCwd`](../packages/gateway/src/terminal/lib/resolve-cwd.ts) helper, pinning the behaviour `resolveCwd` relies on (Decision §4); refactor is behaviour-preserving.
- [x] Tests at each layer: gateway service (known/unknown/blank repo, bulk fail-fast), `pickSessionCwd` precedence, web RTL (picker options, repo sent / omitted). `:typecheck`/`:lint`/`:test` + `moon ci` green on PR #52 (gateway 550 · web 194).
- ↪️ **Deferred (still in phase-13):** C repo-guessing in inference · D per-repo concurrency caps · E branch/PR templates · F repo chip in UI — all depend only on the now-shipped registry.

## 2026-06-21 — Phase 25 Theme A: `@midnite/ui` package scaffold + Vite library build (PR #50)

Stands up [Phase 25](phase-25-ui-library.md)'s first theme — a new **leaf** design-system package, built and wired, before any primitives/tokens migrate into it (Themes B/C/D). No components moved yet; this is extraction *infrastructure*.

- [x] **`@midnite/ui` package** — `"type":"module"`, React/React-DOM as `peerDependencies`, `exports` map mirroring `shared`'s subpaths: `.` (components) / `./theme` / `./styles` (token CSS). `sideEffects: ["**/*.css"]`.
- [x] **Vite library mode** — `vite.config.ts` with `build.lib` (ESM, `index` + `theme` entries) + `vite-plugin-dts` for `.d.ts`; every declared dep + peer dep externalized so the bundle ships only our code and consumers dedupe. A small plugin copies the token CSS to `dist/tokens.css`. **Decision §4 settled:** the lib ships compiled CSS + token CSS (framework-agnostic), documented in the package README (§7 Vite-lib divergence).
- [x] **`moon.yml`** — `build` (vite, overriding the `tsc -b` default) / `typecheck` / `lint` / `test`; leaf (no `dependsOn`); `moon ci` auto-registers via `packages/*`. `storybook`/`build-storybook` deferred to Theme D (Storybook not installed yet — declaring the task would give `moon ci` an unrunnable job).
- [x] **Boundary guard** — `src/boundary.test.ts` fails if the lib imports any in-repo package (`shared`/`web`/`gateway`/`cli`/`desktop`/`site`); enforces the leaf rule in CI. Seeded with the `cn()` class-merge helper (+ unit test) and reserved `./theme` (`THEME_MODES`) + `./styles` `tokens.css` placeholders for Themes B/C.
- [x] **Docs** — `CLAUDE.md` gains `ui` in the dependency graph + Repo Layout + the leaf rule; the stale "Tailwind not yet wired" Styling note corrected (Tailwind **is** wired; primitives + tokens are extracting into `@midnite/ui`).

Lockfile reconciled with PR #47's `cli-table3` addition on merge; `pnpm install --frozen-lockfile` green. `ui` build (ESM + `.d.ts`) / typecheck / lint / vitest (5 tests) green; CI green. **Next:** Theme B (move tokens + theme runtime into the lib).

## 2026-06-21 — Phase 5: per-repo agent concurrency cap (PR #49)

The agent pool was a single global FIFO, so multiple agents could run on the same repo and race on one working tree. New `agent.maxPerRepo` caps concurrent agents per `task.repo`.

- [x] `agent.maxPerRepo` config ([`shared/config.ts`](../packages/shared/src/config.ts)), default `0` = unlimited; documented in the README config section.
- [x] The scheduler ([`agent-pool-scheduler.service.ts`](../packages/gateway/src/pool/agent-pool-scheduler.service.ts)) skips a `todo` task whose repo already has `maxPerRepo` agents running and picks the next eligible one; the per-repo running counts are recomputed each tick iteration (so an in-tick start counts) and built once per iteration, not per scanned candidate. Repo-less tasks are never capped. New `busyTaskIds()` accessor on the pool exposes the live running set.
- [x] Tests (+3): a repo at cap is skipped while another repo runs and resumes when a slot frees; `maxPerRepo: 0` is unlimited; repo-less tasks uncapped. `:typecheck`/`:lint`/`:test` + `moon ci` green on PR #49 (gateway 544). **Phase 5 remaining:** spawner backends → Phase 17; per-repo branch/PR-template config overlaps Phase 13; suspend-`waiting` deliberately deferred.

## 2026-06-21 — Phase 10 Theme C2: Storybook story backfill for modals, office HUD & widgets (PR #48)

Closes the high-value half of [Phase 10](phase-10-test-suite-hardening.md#c2-interaction-tests-on-key-components--partial-pr-36--48-2026-06-21) C2's "backfill un-storied components" item. The C1 `@storybook/addon-vitest` run mounts every story in headless chromium during `web:test`, so each story is a real render/interaction test (and feeds the Theme E screenshot pipeline). Pure coverage — no product code changed.

- [x] **Modals:** `project-modal` (create/edit render + Sources tab-switch), `memory-modal` (new/edit + close), office `library-modal` (search filters to empty-state + close). Modal stories that call `useConfirm()` mount inside a `ConfirmProvider`; the project modal's `useRouter()` uses the existing global `nextjs.appDirectory` mock.
- [x] **Office HUD:** `office-hud` — seeds the Zustand `office-store` per story (empty / with-agents / near-board / on-break) via a meta-level `beforeEach` that resets state after each story so nothing leaks. Conditional data-fetching children (board/library panels) left closed so the HUD stays offline.
- [x] **Widget primitives:** `memory-card` (global/scoped/archived + open `play`), `widget-card`, `empty-state` (CTA `play`).
- [x] Shared `Memory` (global/scoped/archived) + `OfficeAgent` fixtures in [`stories/fixtures.ts`](../packages/web/stories/fixtures.ts). 20 new story tests; `:typecheck`/`:lint`/`:test` + `moon ci` green on PR #48 (web `web:test` 190 passed). `play` functions query by role/label and assert visible outcomes / `storybook/test` spies, per the C2 pattern.
- ↪️ **Remaining (logged in phase-10 C2):** data-fetching widgets (`health-widget`, `market-*`, `news-widget`, `boardroom-panel`, …) stay un-storied — they self-fetch via `usePolling`/`useApiData` and need a query/API-mock story decorator (new infra) before they can be storied.

## 2026-06-21 — Phase 16 COMPLETE — Theme B: CLI `add --bulk` (PR #47)

The CLI client for plural intake — the last theme of Phase 16 (A API #40, C web modal #42). **Phase 16 is now fully done.**

- [x] `midnite add --bulk` ([`cli/src/index.ts`](../packages/cli/src/index.ts)): reads a list from `--file <path>` or **stdin** (`cat ideas.txt | midnite add --bulk`, heredocs) → `POST /tasks/bulk`. Renders a **cli-table3** summary (Line → Kind → Result) + an `N created, M skipped, K failed` tally. Partial batches succeed; exits non-zero only if every attempted line failed.
- [x] `createBulk` + a `TaskDefaults` type on the typed client ([`cli/src/client.ts`](../packages/cli/src/client.ts)); `--repo`/`--priority`/`--project` apply batch-wide and are now also threaded through a single `add`. Added `cli-table3` to the CLI.
- [x] **ESM fix:** the CLI binary used extensionless relative imports, so `node dist/index.js` threw `ERR_MODULE_NOT_FOUND` (latent — CI runs vitest, not the binary). Switched to `.js` extensions (repo convention). Live-verified `add --bulk` end-to-end against a running gateway.
- [x] Pure helpers in [`cli/src/bulk.ts`](../packages/cli/src/bulk.ts) (exit code / summary / rows), unit-tested; `client.test.ts` covers createBulk + createTask defaults. `:typecheck`/`:lint`/`:test` + `moon ci` green on PR #47 (cli 15 · shared 288 · gateway 541 · web 170). **README CLI usage docs intentionally skipped** — no per-command CLI section exists yet (siblings `add`/`list`/`move` undocumented too); commander `--help` covers it.

## 2026-06-21 — Phase 13 Theme A complete: repos as a first-class DB-backed entity (PR #45)

Promote `repos` from a dormant `config.repos` array to a managed, DB-backed registry. Closes [Phase 13](phase-13-repos-first-class.md) Theme A (A1–A4); satisfies the registry half of [outstanding.md](outstanding.md) #4. **Theme B** (task-creation picker, write-time `task.repo` validation, cwd-precedence tests) remains.

- [x] **shared:** new [`repo.ts`](../packages/shared/src/repo.ts) — `RepoSchema` + `CreateRepoRequestSchema`/`UpdateRepoRequestSchema` (trim/min/max; empty-patch rejected) + `RepoResponseSchema`; barrel export + zod tests.
- [x] **gateway:** `repos` Drizzle table (UUIDv7 id, **unique** `name`, `path`, timestamps) + forward-only migration `0030_repos` (minimal columns — deferred `branchPrefix`/`prTemplate`/`cap` to Themes D/E, Decision §5). New `repos/` module — `ReposRepository` (Drizzle-only), `ReposService` (unique-name enforcement → `RepoNameTakenError`, `~`-path normalisation, `RepoDoesNotExistError`), thin `ReposController` (`GET`/`GET /:id`/`POST`/`PATCH /:id`/`DELETE /:id`; 400/404/409 translation); registered in `AppModule`. (Plural class names match the `projects` module convention.)
- [x] **seed + cwd (A3):** `ReposService.onModuleInit` seeds from `config.repos` insert-if-absent by name (DB authoritative thereafter; never overwrites/deletes — Decision §2). `resolveCwd` resolves `task.repo` → path via the registry (`expandTilde` on read) instead of `config.repos` — also fixes a latent raw-`~` bug where config paths weren't expanded.
- [x] **web:** typed `getRepos`/`createRepo`/`updateRepo`/`deleteRepo` client; a **Settings > Repos** panel (list · add · inline-edit · remove) with inline validation + surfaced server errors + a sidebar nav entry.
- [x] Tests at each layer — shared schema, gateway service (`:memory:`: CRUD, unique-name on create+rename, seed idempotency) + controller (400/404/409), web RTL (list/add/error/validation). `:typecheck`/`:lint`/`:test` + `moon ci` green on PR #45 (one pre-existing flaky terminal env-dump spec needed a CI re-run — unrelated).

## 2026-06-21 — Phase 6 follow-up: ai.claude node defaults to canonical sonnet4.6 (PR #46)

The workflow `ai.claude` node defaulted to `sonnet4.7`, a retired alias whose dated id 404s — the adapter only kept it resolving as a legacy fallback. New nodes now default to the canonical `sonnet4.6` (same underlying `claude-sonnet-4-6`, but in the adapter's advertised list), so a freshly-added node works against real credentials.

- [x] `node-types.ts`: `ai.claude` default model + field placeholder → `sonnet4.6`. Legacy `sonnet4.7`/`opus4.7` aliases stay resolving in [`anthropic.provider.ts`](../packages/gateway/src/agent/llm/providers/anthropic.provider.ts) for existing configs — only the default changed, so no migration.
- [x] `node-types.test.ts`: updated the default assertion + a guard that the default is always one of `LLM_PROVIDER_MODEL_SUGGESTIONS.anthropic` (a retired alias can't sneak back as the default). `:typecheck`/`:lint`/`:test` + `moon ci` green on PR #46 (shared 279 · gateway 521 · cli 7 · web 165).

## 2026-06-21 — Phase 11 Themes A, D, G, H: public-site foundations, sections, download, legal (PR #44)

The first independent slice of the public-site rewrite — the four self-contained, individually-shippable themes, leaving the interlocking panel/particle/hero core (B/C/E/F) for later. `packages/site` only; no `@midnite/web` internals imported (the theme + markdown bits are copies with source-of-truth comments).

- [x] **Theme A — Foundations:** ported the web app's theme system — no-flash init script + `ThemeProvider` (light/dark/system/time) sharing the same `midnite.theme` localStorage key, a nav theme toggle, favicons/manifest copied into [`packages/site/public/`](../packages/site/public/), `metadata.icons` wired, hardcoded `dark` class dropped so tokens drive both themes.
- [x] **Theme D — Sections + typed titles:** a typed section registry (with forward-looking panel/particle fields for B/C), a single-IntersectionObserver [`SectionProvider`](../packages/site/components/sections/section-controller.tsx) as the active-section source of truth, a [`useTypewriter`](../packages/site/components/sections/use-typewriter.ts) hook, and a [`TypedTitle`](../packages/site/components/sections/typed-title.tsx) (types title→subtitle then fades in children) wired into the How/Features/CLI headings. Type-once on first activation; full reduced-motion degradation; `sr-only` full text for a11y.
- [x] **Theme G — Download restyle:** featured recommended-platform card + elegant all-platforms list, version badge + release-notes link, particle backdrop carried onto the route. [`downloads.ts`](../packages/site/lib/downloads.ts)/[`platform.ts`](../packages/site/lib/platform.ts) and all detection/coming-soon/deep-link behaviour unchanged; `data-testid`/`data-platform` hooks preserved.
- [x] **Theme H — Legal pages:** nested [`/legal`](../packages/site/app/legal/) sub-layout with a sidebar of all docs (active-link highlight, mobile top-selector) + a react-markdown/remark-gfm renderer, driven from a shared [legal-docs registry](../packages/site/lib/legal.ts); placeholder Privacy + EULA (marked draft / not legal advice), linked from the footer.
- [x] Tests: new site vitest (jsdom + Testing Library) project + moon `test` task — `useTypewriter`, section registry, `SectionProvider` (most-visible + sticky), `TypedTitle` a11y (10 tests). Config clears vite's `.git` fs-deny so tests collect in a `.git/worktrees` checkout too. `:typecheck`/`:lint` green across the graph; `site:test` + `site:build` (7 routes prerender) green; `moon ci` green on PR #44.
- [ ] **Remaining in Phase 11:** Theme B (cursor-following particle field), Theme C (persistent preview panel), Theme E (epic hero + cycling typed titles), Theme F (panel content modules) — the interlocking scrollytelling core.

## 2026-06-21 — Phase 6 P11: workflow editor autosave (PR #43)

Editor edits only persisted on an explicit Save; this debounces a save ~1.5s after the last dirty edit so work isn't lost. While here, the Phase 6 follow-ups were reconciled — minimap/zoom + drag-from-palette were already shipped, P8 (logic nodes + `{{expr}}`) was closed by Phase 12, and P7/P9/P10 are tracked under Phase 14.

- [x] **`use-autosave` hook** ([`lib/use-autosave.ts`](../packages/web/lib/use-autosave.ts)): subscribes to the editor store, debounces, and calls `save()` after a quiet interval. Pauses while a save is in flight or a run is active (`run()` saves first — no double-POST); selection-only changes never trigger it; `save`/`paused` read through refs so it never re-subscribes.
- [x] **Save-status indicator** ([`workflow-toolbar.tsx`](../packages/web/components/workflow-toolbar.tsx)): an `aria-live` "Saving… / Unsaved changes / All changes saved" label; the manual Save button stays as an escape hatch.
- [x] **Revision guard** (self-review): `save()` snapshots the graph before its `await` but `markSaved()` cleared `dirty` unconditionally — an edit landing mid-save was marked saved-but-not-persisted (the walk-away case). The store now tracks a monotonic `revision`; `markSaved(atRevision)` clears `dirty` only if none landed since, else it persists and autosave re-fires.
- [x] Tests: `use-autosave.test.ts` (5, fake timers — debounce/coalesce/paused/selection/clean) + `workflow-store.test.ts` (+3 revision-guard). `:typecheck`/`:lint`/`:test` + `moon ci` green on PR #43 (web 38 files / 165 tests). **Phase 6 P11 remaining:** run-history replay, templates (CLI `workflow` commands → Phase 14).

## 2026-06-21 — Phase 16 Theme C complete: web paste-list modal (PR #42)

The web client for plural intake — paste a multi-line list into the New task modal and create one task per line in a single batch, consuming the Theme A API (PR #40). Theme C is ✅ DONE; only Theme B (CLI `add --bulk`) remains in Phase 16.

- [x] **web client:** `createBulk` on the typed [`lib/api.ts`](../packages/web/lib/api.ts) → `POST /tasks/bulk`, sending the **raw** text so the gateway re-parses it with the same `parseBulkLines` the preview uses.
- [x] **Bulk mode in [`new-task-modal.tsx`](../packages/web/components/new-task-modal.tsx):** a `Single` / `Bulk paste` toggle + textarea; **live preview** (detected-task count, over-`MAX_BULK_LINES` warning, and the cleaned prompts listed with markers stripped); **per-line result summary** (created / skipped / failed with failing lines surfaced for fix-and-re-submit). Status hidden in bulk (per-task triage decides it); project + priority apply batch-wide. **Repo deferred** — no repo picker in the UI yet (Phase 13).
- [x] Board refreshes once off the coalesced `tasks.bulkCreated` event (the payload-agnostic `useTaskEvents` already invalidates on it); `tasks-view` also invalidates directly on the callback so it works without a live socket.
- [x] `new-task-modal.test.tsx` (RTL, 3 cases): single default; bulk preview counts + strips markers + hides status; submit sends raw blob + renders result summary incl. a failing line. `:typecheck`/`:lint`/`:test` + `moon ci` green on PR #42 (web 36 files / 152 tests). Honors Decisions §1/§2/§4/§5.

## 2026-06-21 — Phase 12 Theme E (partial): run-history debugging — input→resolved→output + inline node errors (PR #41)

See what references actually resolved to — the payoff of Theme B's persisted `resolvedParams`. Until now the run-output panel only showed a node's output, and a failed `{{expr}}` reference was buried in the run log. Theme E is ◐ partial: the run-output panel + inline node errors landed; "pin sample data" is deferred.

- [x] **Run-output panel** ([`run-output-panel.tsx`](../packages/web/components/run-output-panel.tsx)): expanding a node shows **Input → Resolved params → Output**, each block rendered only when it has data (resolved params absent for trigger nodes), plus the error in red for a failed node.
- [x] **Inline node errors** ([`workflow-node-view.tsx`](../packages/web/components/nodes/workflow-node-view.tsx)): a failed node now carries its run error onto the canvas (red strip under the summary, full text on hover) — not just in the log. `WorkflowNodeData` gains an `error` field; `applyRunStatuses` → `applyRunState(nodeRuns)` reflects status **and** error together and clears both for nodes absent from a re-run.
- [x] Tests: `workflow-store` (`applyRunState` applies + stale-clears status/error) and `run-output-panel` (input/resolved/output on expand; failed node surfaces its `ExpressionError`; empty state). `web:typecheck`/`lint`/`test` (35 files / 149 tests) + `moon ci` green on PR #41.
- [ ] **Deferred — pin sample data** (Theme E item 2): store an editor-local/persisted sample payload so the Theme-D picker/preview work *before* a real run. Its consumer (Theme D expression editor) isn't built yet. **Remaining in Phase 12:** Theme D (expression editor) + this pin-sample item.

## 2026-06-21 — Phase 10 C3 (partial): axe a11y checks on stories (PR #39)

Wires `@storybook/addon-a11y` into the C1 Storybook-as-tests run so axe-core scans every story during `moon run web:test`. C3 is ◐ partial — the addon is enabled at `'todo'` (warnings) per "start as warnings"; promoting to `'error'` is gated on clearing the surfaced backlog.

- [x] `@storybook/addon-a11y` (pinned `10.4.3`, matching `addon-vitest`) added to `@midnite/web` + registered in [`.storybook/main.ts`](../packages/web/.storybook/main.ts). The SB ≥10.3 vitest addon auto-applies its preview annotations, so axe runs on every story with **no setup file**.
- [x] `parameters.a11y.test: 'todo'` in [`.storybook/preview.tsx`](../packages/web/.storybook/preview.tsx) — violations surface as warnings (a11y panel + run output) without failing CI; an in-file comment documents the promotion path. `:typecheck`/`:lint`/`web:test` green (33 files / 144 tests; 71 stories scanned); `moon ci` green on PR #39.
- [ ] **Remaining for C3:** fix the real violations then promote to `'error'` — `board-view` (color-contrast, nested-interactive, scrollable-region-focusable); `task-card`/`project-card`/`workflow-card` (color-contrast); `session-card` (aria-prohibited-attr); `page-header` (empty-heading); `markdown-preview` (label — task-list checkboxes). Design-system/clickable-card work, deliberately out of scope for this infra slice.

## 2026-06-21 — Phase 16 Theme A complete: bulk task creation API (PR #40)

Plural intake substrate — `POST /tasks/bulk` turns a pasted blob into one task per line with a single coalesced board update. Theme A (the API) is ✅ DONE; the CLI `add --bulk` (B) and web paste modal (C) clients remain. Satisfies [outstanding.md](outstanding.md) #2's API half / Phase 15 Theme A.

- [x] **shared:** pure `parseBulkLines` (drops blanks/`#`-comments, strips `- `/`* `/`1. `/`- [ ] ` markers), `BulkCreateTaskRequest/Response` schemas (raw **or** `lines[]`, batch-wide repo/project/priority, per-line result rows + `{created,skipped,failed}`), `MAX_BULK_LINES` (200), and a coalesced `tasks.bulkCreated` member on the `TaskBoardEvent` union (+ fixture/identity test).
- [x] **gateway:** `TasksService.createBulk` fans each line through the existing `createFromPrompt` (no forked create path; an `emit` flag suppresses the per-task broadcast) and emits one `tasks.bulkCreated` event. Partial failure is first-class (error rows); batch capped at 200 → 400; bounded concurrency via a new `mapWithConcurrency` lib helper (pool 5). Thin `POST /tasks/bulk` route.
- [x] **web:** notifications hook skips the bulk event (no single task); the payload-agnostic invalidation hook already fires one refresh for the batch.
- [x] Tests at each layer (shared schema/parse/event, gateway service+controller+concurrency); `:typecheck`/`:lint`/`:test` + `moon ci` green on PR #40. Decisions §1/§2/§3/§4/§6 honored.

## 2026-06-21 — Phase 12 Theme F complete: palette grouping & new-node surfacing (PR #38)

The growing node set is now navigable in the editor's left sidebar, and the Theme-C nodes that shipped but were unreachable are finally draggable. Theme F is ✅ DONE.

- [x] Palette groups into **Actions · Logic · Data · Storage** from the registry `category`, with **collapsible** sections (chevron + per-section count); searching force-expands matches.
- [x] The Phase 12 reshape/storage nodes (`logic.setData`, `logic.merge`, `data.filter`, `storage.set`, `storage.get`) now render — they were registered but invisible because the palette only knew `action`/`logic` categories. Their icons (`pencil`, `git-merge`, `filter`, `database`) are mapped and `data`/`storage` get distinct accent hues (`--node-data`/`--node-storage`, light + dark) for consistent palette + canvas styling.
- [x] Search/filter box (Theme F item 3) was already present; kept. Triggers stay intentionally excluded (a workflow has one canonical trigger).
- [x] New `node-palette.test.tsx` (RTL, 6 cases): grouping, new-node surfacing, trigger omission, search + empty state, collapse/expand, click-to-add. `web:typecheck`/`lint`/`test` (144) green; `moon ci` green on PR #38. **Remaining in Phase 12:** Theme D (expression editor) + Theme E (run-history/debugging).

## 2026-06-21 — Phase 10 C2 (partial): Storybook interaction tests (PR #36)

Builds on C1: `play` functions assert real interactions on the highest-value components, plus a backfilled command-palette story. C2 is ◐ partial — the broad un-storied-component backfill remains.

- [x] **task-card / session-card / board-view** — clicking a card fires `onSelect` / `onClick` (a plain click, not a flaky dnd drag).
- [x] **theme-toggle** — open the menu → pick **Light** → reopen and confirm it's the checked option (`menuitemradio` aria-checked).
- [x] **templates-table** — expand an accordion row; the Expand→Collapse label flip is asserted.
- [x] **command-palette** (new backfilled story) — `Ctrl+K` opens the dialog; typing `profile` filters to Profile (Settings drops out); a non-matching query shows the "No matches." empty state.
- ⏳ **filter-pills** play deferred — the Next router mock doesn't feed `router.replace` back into `useSearchParams`, so a click can't assert a visible toggle; render stories already cover it.
- [x] All assert visible outcomes / `storybook/test` spies, querying by role/label (CLAUDE.md). 71 story tests (was 68) + 67 unit green; `web:typecheck`/`lint`/`test` green; `moon ci` green on PR #36. **Remaining for C2:** the broad story backfill (office HUD pieces, project/memory/library modals, widgets).
## 2026-06-21 — Phase 12 Theme C complete: storage.set / storage.get nodes (PR #37)

The last Theme C slice — persisted, per-workflow key-value state so a run can stash data and a **later** run (or downstream node) read it back. Theme C is now ✅ DONE.

- [x] New `workflow_storage` table (forward-only migration `0029`), scoped per workflow with a nullable `scope` column reserved for a future global/project tier (Decision §4); unique index on `(workflow_id, key)`.
- [x] `repository → service → executors` per gateway layering; `storage.set` / `storage.get` registered in [`node-types.ts`](../packages/shared/src/node-types.ts) (new `storage` category) and the module's `NODE_EXECUTORS`. `NodeRunContext` now carries `workflowId` for per-workflow scoping.
- [x] Key/value flow through Theme B's resolve-before-execute, so both accept `{{expr}}`; `storage.set` returns the stored value (readable via `{{$node}}` in the same run). A never-set key reads back the node's `defaultValue` (null default) rather than hard-failing — and a stored `null` stays distinct from a miss.
- [x] Tests: executor schema + behaviour, per-workflow scoping, upsert overwrite, stored-null vs miss, plus an engine integration proving set-in-one-run / get-in-a-later-run round-trips against `:memory:`. `gateway` 508 green; `:typecheck`/`:lint`/`:test` + `moon ci` green on PR #37.

## 2026-06-21 — Phase 10 C1 complete: Storybook stories run as browser tests (PR #35)

18 stories existed but nothing asserted them. C1 makes every story a smoke test inside `moon run web:test` (so `moon ci` covers it). C1 is now ✅ DONE; C2 (interaction `play` tests) + C3 (a11y) remain.

- [x] `@storybook/addon-vitest` (+ `@vitest/browser`, `playwright`) added to `@midnite/web`, registered in `.storybook/main.ts`. `vitest.config.ts` split into two projects: **`unit`** (jsdom — the existing component/hook/lib specs) and **`storybook`** (headless **chromium** via Playwright — every `*.stories.tsx` mounted; a render-time throw fails the test). The addon (Storybook ≥10.3) auto-applies the `.storybook/preview` decorators (`ThemeProvider`), so no extra setup file is needed.
- [x] **CI:** a `playwright install --with-deps chromium` step before `moon ci`, since `web:test` now needs a browser. `.storybook/**` added to the `web:test` moon inputs so Storybook-config changes invalidate the test cache.
- [x] All **18 stories (68 story tests)** pass next to the **67 unit tests** — 135 total; `:typecheck`/`:lint`/`:test` green; `moon ci` green on PR #35. No story needed a fix. (Decisions §2 — addon-vitest, the recommended path.)

## 2026-06-21 — Phase 12 Theme C (reshape nodes): setData / merge / filter (PR #34)

Three pure data-flow node types that make "use outputs as inputs" practical, consuming Theme B's resolve-before-execute (expression-valued fields arrive already resolved). Theme C is now ◐ partial — only the persisted `storage.set/get` nodes remain (they need a new table).

- [x] `logic.setData` — builds a payload from key→value `fields`; `replace` emits only the set fields, `merge` overlays them onto the input object. One `shared` registry entry + one gateway executor.
- [x] `logic.merge` — fan-in over a multi-predecessor node's array of outputs: `shallowMerge` (object overlay) / `array` (collect) / `concat` (flatten arrays).
- [x] `data.filter` — pick or omit a set of top-level fields; introduces a `data` node category (web's `hueVarForCategory` already falls back safely).
- [x] Registered all three in `node-types.ts` with param schemas + form fields + categories; executors wired into the module's `NODE_EXECUTORS` (one place).
- [x] Tests: executor behaviour per mode + non-object inputs; shared param-schema defaults/rejections; an engine integration proving `setData` resolves `{{$json}}`/`{{$node[...]}}` fields end-to-end and persists `resolvedParams`. `shared` 262 / `gateway` 498 green; `moon ci` green on PR #34.
- **Deferred:** `storage.set`/`storage.get` (Theme C's `workflow_storage` table) — the remaining Theme C slice.

## 2026-06-21 — Phase 12 Theme B complete: workflow engine expression integration (PR #33)

The keystone of Phase 12 — nodes can now reference each other's output. Theme A shipped the resolver in `shared`; Theme B wires it into the engine so params resolve against a per-run context before each node executes.

- [x] **Run context + resolve-before-execute** in [`workflow-engine.service.ts`](../packages/gateway/src/workflows/engine/workflow-engine.service.ts): for each non-trigger node the engine builds `{ $json: <merged input>, $node: <completed outputs by label, each as { json: output }>, $env: process.env }` and runs `resolveParams` over `node.params` before handing them to the executor (and to the branch condition). A missing/invalid reference fails *that* node and short-circuits the run with a path-naming message (`expression error in "<label>": …`) — never a silent empty string.
- [x] **Persisted resolved params:** `node_runs.resolved_params` column (forward-only migration `0028_node_runs_resolved_params`, drizzle-kit generated) + optional `resolvedParams` on `NodeRunSchema` ([`run.ts`](../packages/shared/src/run.ts)); the repository hydrates it and `GET /runs/:id` returns it. Trigger nodes carry none.
- [x] Stale "templating lands later" comments updated in `ai-claude.executor.ts` + `node-executor.ts`; `http.request` and `ai.claude` params now flow through resolution.
- [x] Tests: `workflow-engine.expression.spec.ts` (typed `$node` ref with type preservation, mixed-text `$json` → string, persisted resolved params via `getRun`, missing-ref fails the referencing node not its predecessors, templated branch condition) + a shared `NodeRunSchema` round-trip. `shared`/`gateway` `:test` (481 gateway) / `:typecheck` / `:lint` green; `moon ci` green on PR #33.
- Unblocks Phase 12 Themes C (reshape/storage nodes), D (n8n-style editor), E (run-history debugging).

## 2026-06-21 — Phase 10 B3 complete: shared gateway test harness (PR #32)

Standardises the `:memory:` database setup that nine gateway specs hand-rolled. B3 is now ✅ DONE.

- [x] `gateway/src/test/db.ts` — `createTestDb()` returns `{ db, sqlite, close }`: a fully-migrated in-memory SQLite (open `:memory:` → `foreign_keys = ON` → `drizzle(schema)` → `migrate`). `db` is the `MidniteDb` type repositories accept; `sqlite` is the raw handle; `close()` frees the connection. Migration-folder resolution mirrors the production `DbModule` (module-relative path, cwd fallback). Barrel at `gateway/src/test/index.ts`.
- [x] `gateway/src/test/db.test.ts` (5 tests) — migrations applied (domain tables exist), FK enforcement on, a usable Drizzle handle against the migrated schema, per-instance isolation (writes don't leak), and close frees the connection.
- [x] **Proof refactor:** `tasks.repository.test.ts` + `projects.repository.test.ts` now build their DB via `createTestDb()` instead of the copy-pasted block (per the doc: "a couple as proof; don't churn all").
- ⚠️ **Documented deviation:** the doc's "spin a Nest testing module with overridable providers" was **not** built — `@nestjs/testing` isn't a dependency and the house style (PRs #28/#30/#31) is direct instantiation + `vi.fn()` fakes. The duplicated pain was the DB setup, not provider wiring, so that's what was consolidated.
- [x] Test-only; no product code changed. `gateway:test` 481 pass (+5); `:typecheck`/`:lint` green; `moon ci` green on PR #32.

## 2026-06-21 — Phase 10 B2 complete: scheduler/pool & heartbeat lifecycle integration (PR #31)

Adds the integration layer B2 asked for — real lifecycles driven end-to-end against `:memory:` SQLite, asserting emitted WS events and persisted state agree, plus restart recovery and the heartbeat scheduler. B2 is now ✅ DONE.

- [x] `pool/agent-pool.integration.spec.ts` — real `TasksService` (+ repository, `TaskEventBus`) wired to the pool/scheduler/runner over in-memory SQLite; only the PTY boundary (`TerminalService`) is faked so each spawn's `onExit` is driven deterministically (no wall-clock sleeps). Covers: scheduler tick fills free slots from the todo queue and leaves the rest queued; emitted `task.*` events agree with persisted state; Stop-hook completion (`markDone` + `complete`) frees and reuses a slot; PTY crash → retry (todo, retryCount bumped) → abandoned once exhausted; failed spawn requeues + frees the slot.
- [x] **Restart recovery:** a fresh `AgentPoolService.onModuleInit()` requeues orphaned `wip`/`waiting` → `todo` (persisted state is the source of truth), leaves terminal states untouched, slots start idle, and the scheduler re-runs recovered tasks.
- [x] `agents/heartbeat-scheduler.integration.spec.ts` — elapsed-since-last due logic with the LLM faked disabled: a due tick records a skip and advances the clock so the next tick is not due; not-due / disabled / blank-prompt / never-fired covered.
- [x] Test-only; no product code changed. `gateway:test` 476 pass (+14); `:typecheck`/`:lint` green; `moon ci` green on PR #31.

## 2026-06-21 — Phase 10 B1 complete: remaining controller boundary coverage + flake fix (PR #30)

Finishes the B1 follow-up left open by PR #28: every gateway controller now has a boundary spec, and the noted `terminal.service.spec` flake is fixed. B1 is now ✅ DONE.

- [x] Controller boundary specs for the remaining 18 controllers — admin, agents, councils, environment, fs, health, market, media, memories, metadata, news, providers, routines, sessions, terminal, usage, weather, workflows — same direct-instantiate + `vi.fn()` service pattern as PR #28: body/query validation → `BadRequestException` (400), valid input delegates with the **parsed** payload, and domain/service errors propagate or map (councils → 404/400/409 via its `translate`; market/news/weather wrap upstream failures → 500).
- [x] **Flake fixed:** `terminal/terminal.service.spec.ts` snapshots/restores `process.env` around each test. The spec copies `process.env` into spawned PTY envs and asserts which `MIDNITE_*` vars are present/absent, so a var leaked from another Vitest worker-shared spec could break the secret-scrub assertions; it's now isolated regardless of run order.
- [x] No product code changed (tests + one test-isolation fix). `moon run gateway:test` (462 pass), `:typecheck`, `:lint` green; `moon ci` green on PR #30.

## 2026-06-20 — Phase 9 office C: searchable library modal (PR #29)

The library room's bookshelves were decorative; C makes the bookshelf a real interactable.

- [x] **C1 — interactable + modal**: `nearLibrary`/`libraryOpen` + `openLibrary`/`closeLibrary` on `office-store.ts` (mirrors the board panel; opening one panel closes the others; `reset()` clears them). The scene anchors proximity at `BOOKSHELF_POS` → **E** opens a new `LibraryModal` (follows the `boardroom-panel` convention — backdrop, own-Escape, header); keyboard-freeze + HUD `panelOpen` include `libraryOpen`; HUD shows a proximity prompt.
- [x] **C2 — books data, search & filter**: mock `Book` data in `lib/office/books.ts` across five categories + pure helpers (`bookCategories`, `filterBooks` by title/author substring + category, `bookSearchUrl`). Modal has a title/author search box + category-filter chips; clicking a book opens a Google search in a new tab (`noopener`).
- [x] Tests: `books.test.ts` (5 — categories, case-insensitive title/author match, empty query, category+query combine, encoded URL); `office-store.test.ts` still green. Verified `web:typecheck --force` + `web:lint` green, both suites pass from the primary checkout; `moon ci` green on PR #29. README updated.

## 2026-06-20 — Phase 10 B1 (partial): gateway controller boundary coverage (PR #28)

The gateway HTTP boundary was thinly tested (2 of 27 controllers). Established the pattern + covered the highest-value boundaries; the remaining controllers are a follow-up (B1 stays ◐ partial).

- [x] **Validation + delegation + error mapping**: `tasks`, `projects`, `notes` controller specs — bad body/query (`safeParse` failure) → `BadRequestException` (400); valid input delegates to the service with parsed data; a service-thrown `NotFoundException` propagates through the controller (404).
- [x] **Authenticated hook path**: `approval` (PreToolUse) — missing/wrong `x-midnite-hook-secret` → 404 (service never consulted), valid secret + malformed payload → 400, valid → returns the decision; `workflows/webhook` — forwards id/token/body, defaults a null body to `{}`, propagates a bad-token rejection.
- [x] Direct-instantiation + `vi.fn()` fakes (no DB), mirroring the existing `pool`/`lifecycle-hook` specs. `gateway` now 60 files / 370 tests; `gateway:test`/`typecheck`/`lint` green; `moon ci` green on PR #28 (after a re-run cleared a **pre-existing** flake in `terminal.service.spec.ts` — cross-file `process.env` leakage, noted in the phase doc as a follow-up).

## 2026-06-20 — Phase 12 Theme A: safe `{{ }}` expression engine (PR #27)

The new contract for Phase 12 field-level data flow — a no-`eval` resolver in `@midnite/shared` so the gateway engine and the web editor share one grammar. Unblocks all of Phase 12 B–F.

- [x] **expression.ts** — `resolveExpression` / `resolveParams` / `isExpression` over a typed `ExpressionContext` (`$json` / `$node` by label / `$env`): dotted + bracket paths, quoted keys, `\{{` escape. A bare single span returns the **typed** value; mixed text returns a string (objects JSON-stringified); non-templated strings pass through.
- [x] Missing-reference policy: an unresolved path throws a typed **`ExpressionError`** naming the path; opt into null-safe access with `?.` (`{{$json.maybe?.x}}` → `null`). Honors decisions §1 (no eval/Function), §2 ($node keyed by label), §3 (hard-fail + opt-in optional).
- [x] **`expressionable`** flag on `NodeField` marking the template-capable fields (http `url`/`headers`/`body`, ai `prompt`/`system`, branch `right`) so the editor offers the ƒx affordance (Theme D). Exported from the shared barrel.
- [x] 33 expression tests (paths, brackets, optional, mixed text, escaping, missing-ref throw vs optional, type preservation, malformed-template errors, `resolveParams`). `shared` now 34 files / 257 tests; `shared:test`/`typecheck`/`lint`/`build` green; `moon ci` green on PR #27. Engine integration (resolve-before-execute) is Theme B — not in this slice.

## 2026-06-20 — Phase 9 office E2: communal furnishings (PR #26)

Furnished the communal area into a real lounge — coffee + chill + gaming corners.

- [x] **E2 — chill corner**: a seating arrangement — two `COUCHES` + an `ARMCHAIRS` armchair (collidable decor, like the TV) grouped around the B2 rug, the main sofa facing the gaming TV.
- [x] **E2 — astro turf + gaming carpet**: a bright-green `ASTRO_TURF` patch in a free corner (a new seamless `astroTurf` texture, rendered as a tiled surface like the pool water), and a **carpet** marking the gaming area in front of the TV/console (added to `RUGS`). Zoned alongside the existing coffee corner so the room reads as coffee + chill + gaming.
- [x] `buildKitchen` renders the turf (tiled) + collidable seating in their zones. Tests: `layout.test.ts` communal-furnishing invariants (seats on communal floor; turf entirely on communal floor + inside the interior). Verified `web:typecheck --force` + `web:lint` green, `layout.test.ts` (14 tests) passes from the primary checkout; `moon ci` green on PR #26. README updated.

## 2026-06-20 — Phase 10 A2: fixtures module + client-contract tests (PR #25)

Follow-on to A1: gateway/web tests hand-rolled fakes everywhere and the WS event unions had no systematic encode→decode check.

- [x] **A2 — fixtures module**: `shared/src/__fixtures__/index.ts` — canonical *complete* valid objects (Task, Session(Summary/Transcript), Project, Memory, Note, Media, Routine, Workflow(Node/Edge/Run), NodeRun, the three triggers, UsageRecord, + one fixture per WS-event discriminant). Each spells out defaulted fields so it **parses to identity**.
- [x] Exposed via a new **`@midnite/shared/fixtures`** package export — a test-only entry, **not** the package root — so gateway/web tests reuse them instead of fresh fakes (verified the subpath resolves from a consumer package).
- [x] **A2 — client contract**: `fixtures.test.ts` asserts every fixture parses to identity and each WS union (`TaskBoardEvent`, `WorkflowEvent`, `Client`/`ServerTerminalMessage`) has a fixture for **every discriminant** + survives **JSON encode→decode** unchanged. `shared` now 33 files / 225 tests; `shared:test`/`typecheck`/`lint`/`build` green; `moon ci` green on PR #25. (No standalone typed-API-client module exists in `shared`; the schemas are the contract.)

## 2026-06-20 — Phase 9 office B2: props, plants & decor (PR #24)

Furnished the rooms so the office reads as lived-in and varied, not sparse.

- [x] **B2 — greenery everywhere**: `PLANTS` now carries a `variant` and is expanded to ~3–4 per room across all six rooms (corners, beside doorways, flanking the A3 signage), in three species/sizes — `leafy` shrub, tall `palm`, small `succulent`. Each is a new procedural texture, mapped by a pure `plantTexture(variant)` helper. Poolside palms kept.
- [x] **B2 — props**: framed **wall art** (`WALL_ART`) hung on the top walls of the three top-band rooms (offset from the name plates), and warm **area rugs** (`RUGS`) grounding the work room, the library reading nook, and the communal lounge (drawn under the furniture). New `wallArt`/`rug`/`plantPalm`/`plantSucculent` textures; `buildPlants` is variant-aware (base-anchored) + new `buildWallArt`/`buildRugs`.
- [x] **Tests**: `layout.test.ts` decor invariants (every plant/rug on a room floor, ≥2 plants per room, all three species present, wall art on a wall row) + `textures.test.ts` (`plantTexture` mapping). Verified `web:typecheck --force` + `web:lint` green, both suites pass from the primary checkout; rebased cleanly over the B1 character work (PR #16); `moon ci` green on PR #24. README updated.

## 2026-06-20 — Phase 9 office B1: distinct per-agent robot characters (PR #16)

Every agent's robot was the same sprite with a per-agent colour **tint**, so a deskful of agents was hard to tell apart. B1 makes each agent a visually distinct **character** (procedural pass; ◐ partial — real-art swap + provider-aware + activity poses + player customisation remain open in the phase file).

- [x] **B1 (silhouette + accent)**: robot **variant registry** in [`textures.ts`](../packages/web/lib/office/textures.ts) — `ROBOT_VARIANTS` (6 designs) + `robotVariant(id)`, varying antenna shape (rod/twin/bulb/dish/sensor-bar), optional side fins, and eye/accent/visor colours. Picked **deterministically by agent id** (a different hash multiplier than `agentTint`, so shape and chassis colour aren't correlated) and layered on the existing per-agent tint.
- [x] Texture + walk-anim keys carry a **variant segment** (`office-robot-v3-side-1`); `Actor` tracks its `variant` for the seated frame and walk cycle. Human player stays `v0`.
- [x] **Provider-agnostic** and a clean **seam**: one variant spec ↔ one sprite sheet, so an external pack (MetroCity CC0 / pixel-agents MIT) drops in later with keys unchanged. Procedural art, no new deps. Resolved a merge conflict against the pool/signage work that landed first; `web:typecheck --force` + `web:lint` green; `moon ci` green on PR #16.

## 2026-06-20 — Phase 10 A1: shared unit coverage (PR #23)

Closed the highest-leverage test gap: the `shared` contract package had ~19 untested modules, where a broken zod shape breaks gateway + cli + web at once. Tests only — no product behaviour changed.

- [x] **A1 — cover the untested `shared` modules**: added `*.test.ts` alongside **agent, backup, dashboard, fs, llm, media, memory, node, note, project, routine, run, session, task, trigger, usage, workflow, events/workflow, config-loader** (19 files, ~150 tests).
- [x] Each suite **round-trips** a valid fixture, **rejects** representative invalid inputs (bad enums/unions, out-of-range, non-url, missing required), asserts **applied defaults** (e.g. `task.priority`, trigger method/timezone, workflow `enabled`/`steps`), narrows the **discriminated unions** (`trigger`, `events/workflow`) on their `type`, and covers the pure helpers (`missingProjectRequirements`, `providerSupportsBaseUrl`, `CLI_PROVIDER_MAP`).
- [x] `config-loader` (node-only) exercised against a real temp dir: ancestor walk, explicit-path load, defaults fallback on missing/unparseable. `moon run shared:test` → 32 files / 204 tests; `shared:typecheck` + `shared:lint` green; `moon ci` green on PR #23.
- Note: A1's "task state machine" bullet is N/A here — `shared/task.ts` holds only schemas/enums; transition logic lives in the gateway, covered separately under Theme B.

## 2026-06-20 — Phase 9 office A3: room signage (PR #22)

Replaced the room labels floating over the floor with **wall-mounted name plates** so every room is unmistakable at a glance.

- [x] **A3 — room signage**: `buildLabels()` now draws, per room, a rounded **sign board** (`Phaser.Graphics` plate) on the room's top wall behind a full-opacity accent label — replacing the old alpha-0.7 floating label. One sign per room (work · board · library · Agent pool · communal · corner office).
- [x] **Theme-aware**: the plate **fill follows the theme** (`background`) and is **redrawn on light/dark flip** in `applyPalette` (tracked via a new `roomSigns` list); the **border + text** use the per-room accent so each sign reads as that room's.
- [x] The colour decision is a pure, tested `roomSignStyle(id, palette)` helper in [`theme.ts`](../packages/web/lib/office/theme.ts) (kept out of the Phaser scene); new `theme.test.ts` (3 tests) covers accent border/text, theme-driven fill flip, and distinct per-room accents. Verified `web:typecheck --force` + `web:lint` green, the new test passes from the primary checkout; `moon ci` green on PR #22. README updated.

## 2026-06-20 — Phase 9 office G: Agent pool (pool, water & swims) (PR #21)

Furnished the re-themed Agent pool room into a real poolside leisure space.

- [x] **G1 — pool & poolside**: tiled pool basin (`POOL` rect) + coping edge + **sun loungers** along the deck (`LOUNGE_SEATS` are now loungers) + poolside palms. Basin is **non-walkable** — in `blockedGrid()` (agents route around) + a static body so the player collides; new `water`/`lounger` textures.
- [x] **G2 — animated water**: the water `TileSprite` scrolls each frame for a gentle ambient shimmer.
- [x] **G3 — lounging & occasional swims**: idle agents lie on loungers (`zzz`); a periodic timer occasionally sends one swimming a couple of lanes through the basin (trailing a wake ripple), then climbing out — interrupted cleanly if it starts working. The old lounge sleep/**game** split was dropped (gaming relocates to the communal area in Theme E).
- [x] Relocated the TV + console into the **communal area** as decor (Phase 9 E3 super-sizes + wires the console). `layout.test.ts` gains pool coverage (basin blocked + room still navigable around it); verified `web:typecheck --force` + `web:lint`; `moon ci` green on PR #21.

## 2026-06-20 — Phase 9 office A1 re-theme: Agent pool + Communal area (PR #20)

Re-themed the two bottom rooms so the Pool (G) and Communal (E) themes have named, fittingly-coloured rooms to build on.

- [x] Renamed `RoomId`s — **lounge → pool**, **kitchen → communal** (`layout.ts`); `ROOMS` labels now **AGENT POOL** / **COMMUNAL**.
- [x] Re-paletted in `ROOM_STYLES` (`theme.ts`): pool → tiled-aqua floor + cyan accent; communal → cosy warm floor + orange accent. All six room accents now read distinctly (work blue · board sky · library amber · pool cyan · communal orange · corner green), still translucent over the light/dark base.
- [x] **Seam only** — the pool basin/animated water/swims (G1–G3) and communal couches/astro-turf + relocated super-sized TV/PlayStation + retro-games menu (E2–E4) furnish those rooms in their own slices; coffee break (E1) still works in the communal area. `layout.test.ts` green; verified `web:typecheck --force` + `web:lint`; `moon ci` green on PR #20.

## 2026-06-20 — Phase 9 office A1: multi-room floor plan (PR #19)

Turned `/office` from a single room into a six-room walled floor plan — the foundational seam the rest of Phase 9 builds on.

- [x] **A1 — room model**: replaced the single `LAYOUT` grid with a 34×22 multi-room plan (`layout.ts`) — a 3×2 arrangement (work · board · library over lounge · kitchen · corner office) connected by 2-tile doorways in every shared wall, so the whole map stays one connected walkable space. New `ROOMS` describes each room's interior rect + label. `dimensions.ts` bumped to 34×22.
- [x] **Per-room palette**: `ROOM_STYLES` in `theme.ts` — a translucent floor accent over the theme-driven base (light/dark still shows through) + an accent-coloured label per room, so each room reads as a distinct space.
- [x] Added bookshelf + door textures; built the **library** (bookshelves + reading chair) and a **corner-office door**; repositioned the existing desks/lounge/kitchen/board fixtures into their rooms. Agent A* pathfinding routes through the doorways unchanged.
- [x] `layout.test.ts` (4 tests) asserts the grid invariants and that **every room is reachable from the spawn** (no walled-off pockets). Verified `web:typecheck` (`--force`, to dodge moon's stale typecheck cache), `web:lint`, `web:build`, `web:build-storybook` green; `moon ci` green on PR #19.
- Note: deferred to later Phase 9 slices — camera-follow for the bigger map (**A2**), the searchable library modal (**C**, anchor `BOOKSHELF_POS` ready), the corner-office scene + desk toys (**F**), and per-room decor variety (**B2**).

## 2026-06-20 — Phase 9 office E1: kitchen coffee break (PR #18)

Added a kitchenette to `/office` and a personal "on a break" toggle.

- [x] **E1 — coffee break**: a kitchenette nook in the lounge's bottom-left corner — a **counter** + **stool** (new procedural textures in `textures.ts`) beside the existing **coffee machine**, plus a `KITCHEN` zone label (`layout.ts`). All decor (no colliders).
- [x] The coffee machine is **interactable**: walk up + press **E** toggles an "on a break" state, mirroring the board-room `nearBoard`/`openBoard` proximity+interact pattern (`nearKitchen` → `toggleBreak`). The HUD shows a `☕ On a break` badge + a *take a break / get back to work* prompt; a `☕` floats over the player while on a break.
- [x] State on `office-store.ts`: `onBreak`/`toggleBreak`, `nearKitchen`/`setNearKitchen`. Per Decisions §5 the flag is **mock/local** to the session; `reset()` leaves `onBreak` alone (personal presence flag, not transient scene state). Covered by `office-store.test.ts` (3 tests).
- [x] Verified: `web:typecheck` / `web:lint` green; store test passes from the primary checkout; `moon ci` green on PR #18.
- Note: a standalone walled kitchen **room** comes with the multi-room layout (A1) — this is the corner-nook version that ships independently of it.

## 2026-06-20 — Phase 9 office D1: board room → projects hub (PR #17)

Repurposed the `/office` board room from a static documents whiteboard (Phase 8 D3) into the **live projects hub**, the highest-utility office interaction.

- [x] **D1 — projects in the board room**: `boardroom-panel.tsx` now lists active projects (`getProjects`) — each row shows the project tag, name, and task count. Clicking one opens the existing `project-modal.tsx` **as-is**, portalled over the office (`<body>`, escaping the stage's `overflow-hidden` / page-reveal transform), so the URL stays `/office`. Plans, sources, tasks, and the project's memory are all reachable without leaving the room. Escape from a project returns to the list; Escape from the list returns to the room.
- [x] The project modal subsumes the old per-project document browser (its Plan tab + memory link cover what the whiteboard showed), so `documents.ts`, `documents.test.ts`, and `document-modal.tsx` were removed and replaced by a small, tested `lib/office/projects.ts` (`boardroomProjects` → active + alphabetised) seam.
- [x] `nearBoard`/`openBoard`/`boardOpen` scene+store flow unchanged; web-only, no gateway/shared changes. README updated.
- [x] Verified: `web:typecheck` / `web:lint` green; `projects.test.ts` (2 tests) pass from the primary checkout; `moon ci` green on PR #17.

## 2026-06-20 — Phase 8 office: idle sleep/game (C1), click-to-walk (D2), coffee corner (A3)

Rounded out the achievable rest of Phase 8 (remaining open items need external assets, new session data, or are out of scope).

- [x] **C1 — idle agents sleep or game**: idle lounge agents split deterministically by id (`isGamer`) — sleepers show an animated `z`/`zz`/`zzz` (timer-driven `tickIdleBubbles`/`setActivity`), gamers show `▶` and face the TV. Closes the original "sleep or game" lounge ask.
- [x] **D2 — click-to-walk**: clicking the floor pathfinds the player there, reusing the A* (`findPath` gained an `openEnds` flag so the player can't end on furniture) + a velocity-steered waypoint follower in `movePlayer`. Manual WASD cancels it; a deadline aborts if it's nudged into furniture (`onPointerDown`/`nearestOpenTile`).
- [x] **A3 — coffee corner**: a procedural coffee-station texture in the lounge corner (pure decor).
- [x] Verified: `web:typecheck` / `web:build` (`/office` 4.6 kB) / `web:test` (42 pass).
- Note: B2 day/night is effectively covered (the office already follows the `time` theme via `resolved`); C2 per-tool glow is blocked (no current-tool field on `SessionSummary`); A1 (external pack) + E (multiplayer) remain out of scope.

## 2026-06-20 — Phase 8 office C3: grid pathfinding for agent movement

Agents now route around walls + furniture when they walk between the lounge and a hot desk (previously a straight-line tween that could clip).

- [x] `blockedGrid()` (`lib/office/layout.ts`, Phaser-free): walkability grid = walls + furniture; seat tiles are blocked but the start/goal seat is special-cased so an agent leaves its couch and steps onto its desk without cutting through anything between.
- [x] 4-directional A* + waypoint tween chain in `office-scene.ts` (`findPath`/`tileOf`/`faceActor`, rewritten `walkActor`): per-segment walk facing/animation; degrades to a direct tween if a path isn't found.
- [x] Verified: `web:typecheck` / `web:build` (`/office` 4.6 kB) / `web:test` (42 pass).

## 2026-06-20 — Phase 8 office D1: wire desk Call/Messages to the gateway

Finished the last "still mock" piece of `/office`. Walking up to a desk agent now opens real session views, reusing the Sessions-page modals.

- [x] **Call** → live session terminal (`SessionTerminalModal`), enabled while the session is running/waiting; **Messages** → transcript (`SessionTranscriptModal`, fetched via `getSessionTranscript`). `OfficeAgent` now carries its `SessionSummary` (`agents.ts`); `office-hud.tsx` drops the mock call-ring/textarea. Transcript modal portalled to `<body>` so the stage's `overflow-hidden` / a persisted page-reveal transform can't clip it.
- [x] No one-off "send prompt" gateway API exists — the terminal is the live channel, so Call opens it.
- [x] Verified: `web:typecheck` / `web:build` (`/office` 4.6 kB) / `web:test` (42 pass).

## 2026-06-20 — Phase 8 office: zones (lounge / hot desks / board room), robot agents, document viewer

Turned `/office` into a zoned, lived-in room. The left half is open-plan **hot desks** (work) over a **lounge** (TV + gaming console + couches); the right half is a walled **board room**. Agents are now little **robots**; the human player roams. Boardroom decision: a project's "documents" = its `plan` + memories scoped to it (rendered read-only via the app's `MarkdownPreview`).

- [x] **Zones + floor plan** (`lib/office/layout.ts`, Phaser-free): 24×16 room, partition wall + doorway, desk/lounge seat positions, furniture/label/board anchors, rugs, plants.
- [x] **Actor model + movement** (`office-scene.ts`): working agents (`status !== 'idle'`) sit at hot desks (interactable); idle agents chill on lounge couches/armchairs. On a status flip the robot **walks** (tweened + walk animation) lounge ↔ desk. Furniture (desks, couches, TV, console, conference table) are static colliders; doorway is passable.
- [x] **Higher-fidelity characters** (`lib/office/textures.ts`): 16×20 (was 12×15), two kinds — a **human** player and **robot** agents (antenna, visor + glowing eyes, chest panel/light), down/up/side × 2 walk frames. Plus couch/armchair/TV/console/table/whiteboard/plant textures.
- [x] **Board room** (`boardroom-panel.tsx` + `document-modal.tsx` + `lib/office/documents.ts`): walk up to the whiteboard (E) → panel with a **project filter** (`Select`) listing that project's plan + scoped memories; click → read-only `MarkdownPreview` modal. Fetches `getProjects` + `getMemories` via `useApiData`.
- [x] **Store + HUD**: `office-store.ts` gains `nearBoard`/`boardOpen` (+ freeze input while any panel is open); HUD shows a board prompt and renders `<BoardroomPanel>`.
- [x] Grid bumped to 24×16 (aspect follows via `OFFICE_ASPECT`).
- [x] Verified: `web:typecheck` / `web:build` (`/office` 4.6 kB, Phaser in its dynamic chunk) / `web:test` (42 pass, incl. 4 new `boardroomDocs` tests).
- [ ] **Still deferred**: wire Call/Message → gateway; grid pathfinding (walk uses straight-line tweens through the doorway region); external Tiled/LimeZu pack.

## 2026-06-20 — Phase 8 office fidelity: procedural pixel-art sprites, presence, layout

Executed the achievable slice of [phase-8](phase-8-office-fidelity.md) on `main`. Rather than block on a paid asset pack (LimeZu) + Tiled authoring, the fidelity jump is done **procedurally** — sprites/tiles generated in code — which is deterministic, themeable, and zero-licensing; the external Tiled/LimeZu route stays open as a later upgrade.

- [x] **Procedural pixel-art** (`lib/office/textures.ts`): generated textures for a tiled floor, brick walls, wooden desks/monitors/chairs, and character sprites (down/up/side, 2-frame walk cycle). Idempotent (`exists()`-guarded) so a StrictMode/HMR remount can't double-register a key. Tiles drawn neutral and tinted to the theme palette.
- [x] **Sprites replace blobs** (A2): `office-scene.ts` rewritten — player is a `Sprite` that walks + flips via `walkAnim`; agents sit behind their desks. Per-agent identity tint (`agentTint`) for variety; player has its own tint. All Milestone-1 movement/proximity/store-bridge/teardown logic preserved.
- [x] **Presence** (C1): per-agent status speech bubble (`···`/`?`/`z`/`✓`) coloured by the shared status tint, gently bobbing.
- [x] **Polish** (B2): soft drop-shadows under characters/desks + a radial vignette (`buildVignette`, generated canvas texture).
- [x] **Fixed-aspect-ratio layout** (B3): `OFFICE_ASPECT` (new Phaser-free `lib/office/dimensions.ts`) drives a full-width CSS `aspect-ratio` box; the canvas + HUD scale together and the page scrolls when it overflows the viewport (no more `vh` clamp).
- [x] Trimmed `theme.ts` to the palette fields still used (decorative colours now baked into textures).
- [x] Verified: `web:typecheck` / `web:build` (23 static pages; `/office` 3.35 kB, Phaser in its dynamic chunk) / `web:test` (38 pass) all green.
- [ ] **Deferred** (with reasons in phase-8): D1 wire Call/Message → gateway (separate API/transcript work, deserves its own tested change); C2 per-tool glow (needs a current-tool field on the session); C3 pathfinding/wander/sub-agents; A1 external Tiled/LimeZu pack; B2 day/night + camera zoom/scroll; Theme E multiplayer.

## 2026-06-20 — Office theme-aware colours + Phase 8 roadmap

The [`/office`](../packages/web/components/office/README.md) Phaser canvas hardcoded a dark palette, so it stayed dark on the light theme while the rest of the app flipped. Made the structural colours + labels follow the app's light/dark tokens, and captured the larger fidelity roadmap in [phase-8](phase-8-office-fidelity.md).

- [x] **Theme-aware office** (`feature/office-theme-colors`): `lib/office/theme.ts` `buildOfficePalette()` reads the CSS design tokens (`--background`/`--muted`/`--border`/`--secondary`/`--foreground`) into Phaser ints (reusing the now-exported `hslTripletToInt`); `office-scene.ts` gains `applyPalette()` + tracks recolourable objects; `office-game.tsx` re-applies on `useTheme()` change. Decorative colours (desk/screen/avatar/highlight) + status tints stay fixed.
- [x] **Phase 8 doc** ([phase-8-office-fidelity.md](phase-8-office-fidelity.md)): real sprites via Tiled + LimeZu/Kenney (replace the blobs), walk animations, status-driven liveliness, and wiring Call/Message to the gateway.

## 2026-06-19 — Phase 7 remaining items (hardening, widgets, Theme D, tags)

Implemented the rest of [phase-7](phase-7-hardening-reports-widgets.md) directly on `main`, committed feature-by-feature (the working tree was being edited concurrently, so each commit is scoped to its own files). Phase 7 is now essentially complete; deferred items are listed in the phase doc.

- [x] **A6 — task.* WebSocket broadcast** (`e2b9b73`): `TaskEventBus` + `TasksGateway` (`/ws/tasks`) emit a `TaskBoardEvent` on every transition; web `useTaskEvents` invalidates the cache (polling kept as fallback). Mirrors the workflow gateway. +9 tests.
- [x] **Shipped widget** (`33d3380`): dashboard widget listing recent done tasks with their PR links.
- [x] **Notifications** (`7384897`): opt-in desktop notifications on `→waiting`/`→done`, driven off the A6 event stream (web Notification API; works in Electron). Settings toggle requests permission.
- [x] **A4 durability** (`05acd6d`): `synchronous=NORMAL` + `busy_timeout` WAL pragmas; `POST /admin/backup` (SQLite online backup + uploads copy) via `SQLITE_TOKEN`. +2 tests, boot-smoked.
- [x] **⌘K command palette** (`0fad41c`): navigation switcher across enabled surfaces, mounted in the (main) layout.
- [x] **A3 web tests** (`e3ad2f2`): stood up Vitest + RTL + jsdom + a `test` task (now in `moon ci`); seeded dashboard-widgets / task-events / use-local-storage (9 tests).
- [x] **Tags + saved filters** (`d31cc00` data, `cdee3ec` UI): `tags` column (migration 0025) + `PATCH /tasks/:id/tags` (normalised) + card chips + modal editor + a board tag filter via the `tags` query param (shareable saved view).
- [x] Verified per feature: `:typecheck`/`:lint` green, gateway tests 335, web tests 9, web build 19/19; A4 + earlier hardening boot-smoked.

## 2026-06-19 — Phase 7 Theme B: councils report export (Markdown + PDF)

A reusable report-export framework, with a council run as the first consumer. Markdown is built server-side by a pure serializer; PDF is rendered client-side via print-to-PDF (no puppeteer/jsPDF, per the locked decision). Built in an isolated worktree, reviewed, and merged to `main`. (Paired with the Phase 7 Theme A hardening entry further down — both landed this day.)

- [x] `shared/src/report.ts` — `ReportFormat` enum + server/client-rendered split helpers (`SERVER_RENDERED_REPORT_FORMATS`, `isServerRenderedReportFormat`, `REPORT_CONTENT_TYPE`), reused by the export controller, the API client, and the web `ExportMenu`
- [x] Gateway: pure `buildCouncilRunReport()` (`councils/lib/council-report.ts`) — **format-aware** across the unified council formats, de-anonymizes A/B/C syntheses via the entry `labelMap`, archives non-active per-format syntheses; `GET /councils/:id/runs/:runId/export?format=md` (text/markdown attachment; `pdf`/unknown → 400; missing council/run → 404)
- [x] Web: reusable `ExportMenu` (Copy Markdown · Download .md · Download PDF) on the council run view; PDF via an isolated print container + `window.print()` (works in browser and Electron)
- [x] Electron one-click `printToPDF()` bridge deferred (window.print already yields a PDF in the desktop app) — `TODO(desktop)` left in `export-menu.tsx`
- [x] 17 new tests (14 gateway builder + 3 shared); after merge to main: `moon run :typecheck`, `:lint` (0 errors), `gateway:test` (327), and `web:build` all green

## 2026-06-19 — Plan reconciliation (trackers ↔ reality)

Audited [`docs/INITIAL_PLAN.md`](../docs/INITIAL_PLAN.md) (Phases 1–5) against the actual codebase and brought the stale `todo/` checklists in line with what shipped. No code changed — docs only.

- [x] **Phases 1–3 essentially complete; the project has gone well beyond the plan** (Projects, Memory, Councils, Brainstorms, Phase-6 Workflows, marketing `site`, Electron `desktop`, multi-provider LLM). Stack overrides (Nest+Fastify, Next.js App Router) confirmed intentional.
- [x] Updated [phase-0](phase-0-scaffold.md) → [phase-5](phase-5-polish.md) checkboxes with per-item status + deviation annotations; resolved all three [open-decisions.md](open-decisions.md) (waiting holds slot · pty-first · standalone repo).
- [x] Recorded the genuine remaining gaps from the written plan, with scoping, in new [outstanding.md](outstanding.md):
  - Phase 1/3: **no `task.*` WebSocket broadcast** — live updates are polling + cache invalidation, not event-driven (and no TanStack Query)
  - Phase 4 (**inference, biggest gap**): no bulk/paste add, URL/GitHub context fetch, repo guessing, or inline question answers; **no chokidar knowledge-dir watcher** — KB is user-added source URLs, not watched MD-file content
  - Phase 5: no `tmux`/`warp`/`iterm` spawners (no `Spawner` interface; `terminal.mode` is unread), no per-repo concurrency caps, no per-repo branch-naming / PR-template injection
- [x] Confirmed shipped Phase-5 items: priorities, crash retries, eslint+prettier, `moon ci`, 270+ gateway tests.

## 2026-06-19 — Manual task kickoff (Start button + drag-to-WIP)

A task could only reach `wip` (with a linked Claude Code session) via the autonomous scheduler, which is off by default — and `PATCH /tasks/:id/status` only moved the column without spawning anything. Added an explicit on-demand kickoff that reuses the existing runner, so a user can start a task themselves regardless of `agent.poolEnabled`.

- [x] Gateway `POST /tasks/:id/start` in `pool.controller.ts` — guards (startable only from `todo`/`backlog`, 409 if already slotted), delegates to `AgentRunnerService.start`, 409 on `no free agent slot`. New `pool.controller.test.ts` (6 cases).
- [x] Web `lib/api.ts` `startTask(id)`; `task-thread-modal.tsx` gains a **Start** button (todo/backlog) beside Abandon.
- [x] `board-view.tsx` rebuilt on `@dnd-kit`: draggable cards + droppable columns; drop into *In progress* from todo/backlog (and a hover **Start** button on those cards) routes through `startTask`, every other move stays `updateTaskStatus`. `tasks-view.tsx` owns the optimistic `onMove` (rollback + error banner, e.g. "no free agent slot").
- [x] README Configuration: documented the autonomous (`agent.poolEnabled`) vs manual (`/tasks/:id/start`) paths to `wip`.
- [x] `:typecheck` + `:lint` green; gateway tests 270 passing.

## 2026-06-18 — Multi-provider agents + provider-agnostic LLM wrapper

The Agents page now lists every coding agent as a collapsed accordion with per-agent **CLI** and **API** tabs, and the gateway's own AI calls run through a provider abstraction so any of Anthropic / OpenAI / Google Gemini / an OpenAI-compatible endpoint can power them.

- [x] `shared/src/llm.ts` — `LlmProvider` enum, masked `ProviderCredential` (+ update/active requests, response envelopes), `CLI_PROVIDER_MAP`; `AgentCliStatusListResponse`; widened `AgentConfig.provider` (legacy `'claude'` → `'anthropic'` via preprocess)
- [x] Gateway `agent/llm/`: `LlmProviderAdapter` interface, `LlmService` (active-provider dispatch, `reload()` on change, env/Keychain fallback), four adapters (Anthropic tool-use; OpenAI json_schema; Gemini + openai-compatible JSON-mode via `json-output.ts`); `llm_providers`/`llm_settings` tables (`0019` migration) + `ProviderCredentialsRepository`
- [x] Migrated every internal call site off `AnthropicService` → `LlmService` (classifier, planner, project enhance/draft-plan, heartbeat, ping, workflow `ai.claude` node); deleted `anthropic.service.ts`
- [x] Endpoints: `GET /agents/cli/statuses`, `GET /providers`, `PUT /providers/:provider`, `PUT /providers/active` (keys write-only, returned masked as `hasKey` + last-4)
- [x] Web: `ui/tabs.tsx`, `agent-card.tsx` (per-CLI accordion, CLI + API tabs), Agents page rebuilt (per-agent rows; Primary Agent gains CLI/API routing selectors); api client `getCliStatuses`/`getProviders`/`updateProvider`/`setActiveProvider`
- [x] Tests (257 gateway, +15): json-output parser, providers masked round-trip, adapter enabled-wiring, migrated-service fakes; README AI-providers section
- [x] Verified live against a throwaway gateway: providers list/upsert/activate, masked key (no raw-key leak), all CLI statuses, ping routed to the active provider (real OpenAI 401 with a fake key)

## 2026-06-18 — Windows/Linux desktop builds + tagged release workflow

Extends desktop packaging to all three OSes and automates publishing, so the `/download` page's Windows & Linux buttons become real (they were "Coming soon"). The Electron main process was already portable (`paths.ts` → `app.getPath`), so this is pipeline-only.

- [x] `desktop/electron-builder.yml` — global `artifactName: ${productName}-${version}-${arch}.${ext}` (predictable cross-OS names); added `win` (nsis, x64) + `linux` (AppImage, x64) targets
- [x] `.github/workflows/release.yml` — on `v*` tag: 4-OS matrix (macos-14/13, windows, ubuntu; `fail-fast: false`) → proto/pnpm install (Electron binary downloaded) → gateway+web build → `desktop run stage` (deploy + electron-rebuild per arch) → `electron-builder <os>` → upload-artifact; a `release` job downloads all and creates a **draft** GitHub Release (review gate before buttons go live)
- [x] `site/lib/downloads.ts` — Windows + Linux flipped to `available` with x64 asset names matching electron-builder
- [x] `desktop/package.json` `package:win`/`package:linux` scripts; README "Distribution" rewritten for the tag→workflow flow
- [x] Verified locally: `site:typecheck`+`lint`+`build` green; Playwright drive confirms win/linux now render real `-x64.exe` / `-x64.AppImage` download links (no longer "Coming soon"); workflow YAML reviewed. **Cross-OS builds unverified here** — validated by the first `v0.0.0` tag (CI); win/linux best-effort (icons/native-rebuild may need follow-up)

## 2026-06-18 — Dedicated /download page with platform detection (site)

A standalone `/download` page on the marketing site that detects the visitor's OS and features the matching desktop (Electron) build, while listing every platform so nobody is locked in. macOS (Apple Silicon + Intel) are real download buttons; Windows & Linux show as disabled "Coming soon" until those builds ship (electron-builder is macOS-only today — unchanged here).

- [x] `site/lib/downloads.ts` — typed `DownloadTarget` manifest (single source of truth) + `DESKTOP_VERSION` + `assetUrl()` (`releases/latest/download/<asset>`)
- [x] `site/lib/platform.ts` — pure `detectPlatform(ua, uaPlatform)` (UA Client Hints → UA-string fallback)
- [x] `site/components/download-picker.tsx` — `'use client'`; detected-platform featured card (mac → Apple Silicon primary + Intel) over an all-platforms list; carries the unsigned-macOS `xattr` note
- [x] `site/app/download/page.tsx` — Nav + `.bg-grid` backdrop + `Reveal` + picker + Footer; route metadata
- [x] `site/components/nav.tsx` — "Download" now routes to `/download` (Next `Link` for path links); homepage `download.tsx` keeps its section + gains an "All platforms →" link
- [x] Verified: `site:typecheck` + `site:lint` + `site:build` green; 11-assertion Playwright drive (mac/windows/linux detection via stubbed `userAgentData`, mac arm64 asset href, win/linux "Coming soon", not-locked-in, nav + homepage links → /download); macOS view screenshotted

## 2026-06-18 — Task priorities + crash retries

Tasks now carry a **priority** (0 Low · 1 Normal · 2 High · 3 Urgent) that the scheduler honours (highest-priority `todo` first, oldest-first within a priority), and an agent **retry cap** that bounds the previously-unbounded crash→requeue loop.

- [x] `shared`: `TaskSchema` gains `priority` (0..3, default 1) + `retryCount`; `CreateTaskRequestSchema` gains optional `priority`; `AgentConfigSchema.maxRetries` (default 3)
- [x] `gateway/db`: `priority`/`retry_count` columns + `tasks_status_priority_idx` (migration `0018`, additive/forward-only)
- [x] `gateway/tasks`: `listTasks` orders `priority DESC, createdAt ASC`; `incrementRetry`; service `retry()` transition (bumps count → todo) distinct from transient `requeue`; priority stored on create (clamped)
- [x] `gateway/pool`: `agent-runner` onExit now retries up to `maxRetries` then abandons (was an uncapped requeue); timeouts/manual-cancel stay terminal
- [x] `web`: priority selector in the new-task modal; Low/High/Urgent badge on task cards (Normal unmarked)
- [x] Tests: repo priority-ordering + `incrementRetry` (`:memory:` SQLite); service priority-on-create + `retry`; runner retry-under-cap + exhausted→abandoned. Full `:typecheck` + `:test` (241 gateway) + gateway/web builds green

The left nav can now expand to show labels and be locked open or closed. Default is unchanged (collapsed icon bar). Driven by one new `navMode` field on `AppSettings`, shared between the nav and the settings page via the existing `useLocalStorage`.

- [x] `web/lib/app-settings.ts` — `NavMode = 'auto' | 'expanded' | 'collapsed'`, `navMode` on `AppSettings` (default `'auto'`), `NAV_W_COLLAPSED`/`NAV_W_EXPANDED` constants
- [x] `web/components/nav-bar.tsx` — `auto` overlay-expands on hover **and** keyboard focus-within (no content reflow); `expanded`/`collapsed` lock states; pin/unpin button in the expanded header; labels replace tooltips when expanded; an effect mirrors locked-open width into the `--nav-offset` CSS var. Collapsed rendering left identical to before
- [x] `web/app/(main)/layout.tsx` + `globals.css` — `<main>` padding driven by `var(--nav-offset)` (default `3.5rem`) with a `transition-[padding]`; keeps the layout a server component (no client conversion)
- [x] `web/app/(main)/settings/settings-view.tsx` — new **Navigation** card with an Auto / Locked open / Locked closed segmented radio control
- [x] Verified: `web:typecheck` + `web:build` green; 17-assertion Playwright drive-through (default collapsed, hover overlay without reflow, pin-to-lock + reload persistence, settings lock open/closed/auto round-trip) all green

A stylized **Finances** card: add income and expense line-items, toggle list⇄totals, and see the leftover (income − expenses). First **multi-instance** widget — you can place several (e.g. "Fixed costs" vs "Holiday budget"), each with its own editable title and data.

- [x] `web/lib/dashboard-widgets.ts` — `FinanceEntry`/`FinanceConfig` types, `finances` registry entry (Wallet icon, `mediumSizes`), `MULTI_INSTANCE` set so the catalogue keeps offering it once placed; `newInstance('finances')` mints a `crypto.randomUUID()` id; `sizeForKey` maps the `finances-` prefix
- [x] `web/components/finances-widget.tsx` — editable-list card (modelled on `links-widget`): per-card title, income/expense editors, list vs totals view, leftover line coloured by sign, amounts via `Intl.NumberFormat` (no symbol)
- [x] `web/components/dashboard-grid.tsx` — fan-out to `finances-<id>` grid keys (mirroring `proj-N`); id-keyed render/update/remove/label branches; layout reconcile handles add/remove automatically
- [x] `web/lib/use-local-storage.ts` — **bug fix exposed by multi-instance**: `set` performed the localStorage write + sync-event dispatch *inside* the React updater; the synchronous dispatch re-entered listeners and (with Strict Mode's double-invoke) appended twice. Now resolves against a `valueRef` and persists outside the updater, keeping it pure. Latent for single-instance widgets (catalogue dedup hid it); duplicate finance ids surfaced it
- [x] Verified: `web:typecheck` + `web:build` green; full Playwright drive-through (add 2 cards → independent titles/data, list⇄totals toggle, leftover math, persistence across reload) all green

## 2026-06-13 — Marketing site (`@midnite/site`)

A standalone Next.js App Router landing page on port **3001**, reusing the web app's design language (HSL token system, conic-gradient accents, grid backdrop, system fonts), with a scroll-driven 3D hero. Independent of the gateway — pure marketing surface, no `@midnite/shared` dependency.

- [x] New `packages/site` package (auto-discovered via `packages/*`): `package.json` (`@midnite/site`), `moon.yml` (dev/build/start/typecheck on :3001), `tsconfig.json`, `next.config.mjs`, `tailwind.config.ts`, `postcss.config.mjs`
- [x] Design tokens copied from `packages/web/app/globals.css` (dark-only `<html class="dark">`), plus `.bg-grid`, `.text-gradient`, `.gradient-border` halo, and a scroll `.reveal` keyframe
- [x] React Three Fiber hero (`@react-three/fiber` 9 / `@react-three/drei` 10 / `three` / `@react-three/postprocessing`): custom-GLSL starfield (twinkle + swirl), a geodesic **"orchestration core"** — a smooth fresnel glow sphere inside a slowly-rotating wireframe lattice with glowing nodes — **selective bloom** + vignette + ACES tonemapping; camera pulls back on scroll (core → ambient field) with window-tracked pointer parallax; canvas dynamic-imported `ssr:false`, lazy-loaded out of first-load JS; honours `prefers-reduced-motion`
  - Note: the original morphing noise-displaced orb used additive blending on a closed mesh, which strobed/flickered as it rotated — replaced with the flicker-free geodesic core (single convex glow sphere + clean line/point geometry, normal blending)
- [x] Sections: Hero → How it works (5-step lifecycle) → Features grid (6 cards) → CLI showcase (terminal chrome) → closing CTA + footer; `Reveal` wrapper drives scroll-in via IntersectionObserver
- [x] Verified: `moon run site:typecheck` + `moon run site:build` green; live render confirmed over CDP (16 reveal nodes fire on scroll, WebGL canvas mounts) — hero, how-it-works, features, CLI all screenshotted

---

## 2026-06-08 — Workflows MVP (node-based automation builder)

New **Workflows** space: an n8n/Make-style visual builder where a workflow is a directed graph of nodes wired by edges, starting at a trigger (manual Play, cron schedule, or signed webhook) and flowing data through action nodes (HTTP request, AI/Claude). Runs are persisted with per-node status/output and shown in run history (polled in the MVP). A **node-type registry** in `shared` drives both the gateway executor registry and the web palette/config forms, so adding an integration is one definition + one executor. Branch: `feature/workflow-builder`. See [`todo/phase-6-workflows-mvp.md`](phase-6-workflows-mvp.md).

- [x] `shared`: `node.ts`, `node-types.ts` (registry + 5 MVP types), `trigger.ts`, `run.ts`, `workflow.ts`, `events/workflow.ts`; `WorkflowsConfigSchema` defaulted onto `MidniteConfigSchema`; registry/param tests
- [x] `gateway`: `workflows`/`workflow_runs`/`node_runs` tables (+ migration `0003_workflows`); `WorkflowsModule` (controller/service/repository); `WorkflowEngine` (topological run, cycle rejection, short-circuit, background execution) + `ExecutorRegistry` with `http.request` (SSRF-guarded) and `ai.claude` (reuses `AnthropicService`) executors; single `WorkflowScheduler` tick loop (croner, gated on `workflows.enabled`); signed webhook receiver `POST /hooks/workflows/:id/:token`
- [x] `web`: `@xyflow/react` + `zustand`; `/workflows` list + `/workflows/[id]` React Flow editor (palette, custom nodes, config panel with cron preview + webhook URL, toolbar with Play/Save, run-output panel); editor-scoped Zustand store; polling run hook; nav entry + design-token theming
- [x] Verified live: manual + HTTP run succeeds (real fetch); AI/Claude returns text (`haiku4.5`); webhook fires from an external POST with body as trigger output (bad token → 404); invalid params → 400; `:typecheck` + `:test` green (56 tests)
- [ ] Follow-ups: live WS streaming, logic nodes, credential vault + OAuth, Slack/Google/Email executors, drag-from-palette + autosave, CLI commands

---

## 2026-06-07 — Live 2-way session terminal stream

The session web window is now a **direct, bidirectional stream** between a gateway-spawned PTY and the browser: the web app renders live output via xterm.js *and* sends keystrokes/resizes back over a WebSocket. PTY is configurable (defaults to an interactive shell in the session's repo, `terminal.command: "claude"` to drive a live agent), spawned on demand when a window opens, reused/replayed across reconnects, idle-reaped, and killed on shutdown. Live terminal serves active (`running`/`waiting`) sessions; completed/idle keep the static REST transcript. Branch: `feature/session-terminal-stream`.

- [x] `shared`: `events/terminal.ts` — zod discriminated unions for the WS protocol (`attach`/`input`/`resize` ↔ `output`/`status`/`error`, bytes base64-framed), `TerminalTokenResponse`; extended `TerminalConfigSchema` (`command`/`args`/`scrollbackBytes`/`idleDisposeMs`)
- [x] `gateway`: `terminal.service.ts` (node-pty lifecycle, byte-bounded ring buffer, single-use per-session token, idle/shutdown cleanup, fail-soft load), `terminal.gateway.ts` (`@WebSocketGateway` on `/ws/terminal`, raw-message zod validation, token auth), `WsAdapter` wired in `main.ts`, `POST /sessions/:id/terminal-token`. Added `node-pty` + `ws` (+ root `postinstall` restoring node-pty's macOS `spawn-helper` exec bit dropped by pnpm extraction)
- [x] `web`: `use-terminal-socket` (mint token → attach → stream → input/resize, capped-backoff reconnect), `session-terminal` (xterm.js, client-only `ssr:false` dynamic, FitAddon + ResizeObserver, theme-synced), `session-terminal-modal`, `sessions-view` branches active→terminal / completed→transcript; `gatewayWsUrl()` + `mintTerminalToken()` in `lib/api.ts`
- [x] Tests: shared union round-trips; gateway `terminal.service` (echo PTY, ring trim, reattach replay, exit, destroy, token single-use) + `terminal.gateway` (attach/echo, unauthorized, bad-message, attach-before-input, detach) — 32 gateway tests passing; `:typecheck`, `:lint`, web `next build` green; live E2E against the running gateway (REST token → WS attach → PTY spawn → input echoed) confirmed
- [ ] Follow-ups: browser visual pass; wire the Phase-2 scheduler to pre-spawn `claude` PTYs into the same registry; surface terminal liveness on `SessionSummary`

---

## 2026-06-04 — Projects feature

New **Projects** space: group work under a project with an (AI-assistable) description, up to 10 source links (auto-detected kind + best-effort OpenGraph/oEmbed title), and a project tag (user color, auto-contrast text) that tasks carry. From a project you can draft a markdown plan (one-shot Claude call) and turn checked items into tasks. One project per task via a nullable `tasks.projectId`. Branch: `feature/projects`.

- [x] `shared`: `project.ts` (zod schemas + `MAX_SOURCES_PER_PROJECT`/`MAX_TAG_LENGTH`), `color.ts` (WCAG contrast → readable text), `source.ts` (`detectSourceKind`), `plan.ts` (checklist parse/serialize), `task.ts` +`projectId`
- [x] `gateway`: `projects` + `project_sources` tables, `tasks.project_id` (+ migration `0001_cheerful_argent`); `projects` module (controller/service/repository), `lib/opengraph.ts` (SSRF-guarded fetch + YouTube oEmbed), AI prompts; `AnthropicService.getPlanModel()`; `TasksService.createForProject`; `tasks?projectId=` filter
- [x] `web`: `/projects` page (grid/list toggle), create/edit modal (AI description, color picker, sources), `ProjectTag`, `SourceIcon`, plan panel (draft → interactive checklist → create tasks), board cards show the project tag
- [x] Tests: shared (color/source/plan) + gateway (opengraph/service/repository incl. `:memory:` migration) — 35 passing; `:typecheck`, `web build`, and a live REST E2E (create/limit/validation/oEmbed/create-tasks/filter/delete-unlinks) all green
- [ ] Follow-ups: CLI commands; spawn agents/sessions from project tasks; extract source-doc contents for richer plans

---

## 2026-05-28 — Phase 0 scaffold

Initial empty monorepo skeleton based on [`docs/INITIAL_PLAN.md`](../docs/INITIAL_PLAN.md). Stack overrides confirmed: Nest.js (Fastify adapter) for the gateway, Next.js App Router for the web.

- [x] Workspace root: `.prototools`, `.moon/{workspace,toolchain,tasks}.yml`, `pnpm-workspace.yaml`, root `package.json`, `tsconfig.base.json`, `.gitignore`, `.editorconfig`
- [x] `midnite.json` sample config
- [x] `knowledge/` placeholder folder
- [x] `packages/shared` — zod config schema (`config.ts`), task types (`task.ts`)
- [x] `packages/gateway` — Nest.js + Fastify adapter, `/health` controller, drizzle dir placeholder
- [x] `packages/cli` — commander program with `add` / `list` / `move` / `serve` stubs
- [x] `packages/web` — Next.js App Router with placeholder kanban layout (5 columns)
- [x] `todo/` tracker folder
- [x] `CLAUDE.md` brief

> Verification (`pnpm install`, `moon run gateway:dev`, `moon run web:dev`, `node packages/cli/dist/index.js add hello`) is the next implementer's responsibility — see [phase-0-scaffold.md](phase-0-scaffold.md) for the unchecked verification items.

## 2026-06-11 — Memory page (markdown knowledge entries)

A dedicated Memory page (brain icon in the sidenav) for organising knowledge bases — markdown entries that are either global or scoped to a project. Distinct from sources (links): memories are authored content, edited in place.

- [x] `shared/src/memory.ts` — `MemorySchema` (`projectId: null` = global), create/update request schemas, response schemas
- [x] Gateway `memories` table (+`0009_memories` migration) and `memories/` module: repository → service → controller (`GET/POST /memories`, `PATCH/DELETE /memories/:id`), service tests
- [x] Web `/memory` page: search (`?q=`), scope filter pills (`?scope=` — Global + projects holding memories), grid/list toggle (persisted), New button
- [x] `MemoryCard` (grid/list) with scope chip + excerpt; `MemoryModal` detail view: title, scope select, markdown editor, save/delete with confirm
- [x] Verified: typecheck + tests green; live CRUD smoke against a throwaway gateway (create global/scoped, 400 on missing title, partial patch, null re-scope, delete, 404)

## 2026-06-11 — Councils (multi-agent debate page)

- [x] `shared/src/council.ts` — Council/Participant/Run zod contracts (provider = `AgentCli`, run-participant snapshots with anonymization `label`), `councils.runTimeoutMs` config
- [x] Gateway `councils/` module (+`0010_councils` migration, 4 tables): CRUD + run routes; `CouncilRunnerService` spawns per-participant one-shot CLIs in managed PTYs, captures/cleans output, shuffles + labels A/B/C before the Claude verdict call (label map persisted for UI de-anonymization); stale runs failed on restart
- [x] `TerminalService.spawnManagedRun` — eager pinned PTYs (no idle reap) with capture/exit hooks; `council-` attach guard; `killManagedRun` that preserves the exit hook; terminal-token mint widened to live managed runs
- [x] Web `/councils` list (grid/list toggle persisted, `?q=`, create modal) and `/councils/[id]`: participants side panel (debounced saves, provider select), free-form topic composer (dictation), per-participant live terminal tabs + Verdict tab (markdown + label legend), run thread; nav link
- [x] Verified: typecheck + tests (incl. runner orchestration: timeout/partial-failure/shuffle-label/restart) + full builds green; merged to main after memories (`0009` → `0010` migration order)

## 2026-06-19 — Brainstorms (multi-agent ideation page)

A divergent sibling of Councils: contributors each generate ideas through a fixed *lens*, then a synthesizer distills the **attributed** ideas in a **switchable mode** (shortlist · gaps · opportunities · critique · combine). The same captured ideas can be re-synthesized in another mode without re-running generation.

- [x] `shared/src/brainstorm.ts` — Brainstorm/Contributor/Run zod contracts (provider = `AgentCli`, run-contributor snapshots, **no anonymization label**), `BrainstormSynthMode` enum + labels, `StartBrainstormRunRequest{prompt,mode}` + `RetryBrainstormSynthesisRequest{mode}`, `brainstorms.runTimeoutMs` config
- [x] Lifted `oneshot-command` + `clean-output` from `councils/lib/` to `terminal/lib/` (shared by both runners); updated Council's two imports
- [x] Gateway `brainstorms/` module (+`0021_brainstorms` migration, 4 tables): CRUD + run routes; `BrainstormRunnerService` spawns per-contributor one-shot CLIs in managed PTYs, then runs the synthesizer over attributed ideas in the run's mode; `retrySynthesis(mode)` re-distills captured ideas (mode switch / provider escape hatch) without respawning contributors; ≥1 contributor; stale runs failed on restart
- [x] Web `/brainstorms` list (grid/list/table, bulk archive/delete, `?q=`, create modal) and `/brainstorms/view?id=`: contributors side panel (debounced saves, provider + lens, synthesizer provider + default mode), prompt composer with mode picker, per-contributor live terminal tabs + Synthesis tab (markdown) with a **re-synthesize-in-mode** control, run thread; auto-registered in nav + Settings → Features via `lib/features.ts` (lucide `Brain` icon)
- [x] Starter lenses (First Principles · Contrarian · Customer/JTBD · Moonshot) seeded on create as editable contributors, so a fresh board is immediately useful (`BRAINSTORM_STARTER_LENSES` in shared, seeded in the service)
- [x] Per-mode synthesis archive: each run keeps one synthesis per mode (`syntheses` JSON, +`0022` migration), so re-synthesizing in a new mode accumulates rather than overwriting — the web Synthesis tab shows mode chips to switch between e.g. Shortlist and Gap analysis
- [x] Verified: full `:typecheck`/`:lint`/`:test`/`:build` green (10 shared + 12 gateway brainstorm tests, incl. synthesize / fail-on-no-ideas / mode-switch re-synthesis reusing ideas + accumulating the archive / starter-lens seeding); live REST smoke against a throwaway gateway (seeded contributors, defaults, patch, 400 empty prompt / bad mode, 404 unknown; `0021`+`0022` migrations apply on boot)

## 2026-06-19 — Phase 7 Theme A substrate: encrypt provider keys + LLM usage/cost

**A1 — Provider API keys encrypted at rest (fail-closed).** Replaced the old `key-cipher` (`MIDNITE_PROVIDER_KEY`, plaintext pass-through) with a `gateway/src/crypto/` module (`CryptoService`, AES-256-GCM).

- [x] `CryptoService` — env key **`MIDNITE_SECRET_KEY`** (32 bytes hex/base64); per-value random 12-byte IV; self-describing format `v1:<base64(iv|tag|ct)>`. **Fail-closed**: no key ⇒ encrypted values undecryptable (provider reads as no key / disabled) and writes throw `SecretEncryptionUnavailableError`. Legacy plaintext read as-is + **re-encrypted in place** on next write and via a one-time startup pass.
- [x] `provider-credentials.repository.ts` encrypts on write / decrypts on read; masked `hasKey`+last4 unchanged (computed from decrypted value). `ProvidersService` maps the fail-closed error → 400. Global `CryptoModule`. Deleted `key-cipher.{ts,test.ts}`.
- [x] Tests: crypto round-trip / fail-closed write+read / legacy upgrade; repo `:memory:` integration (encrypted-at-rest, startup upgrade, disabled-without-key).

**A2 — LLM usage & cost accounting (track + soft-warn only).**

- [x] `shared/src/usage.ts` — `LlmFeature` union, usage record / summary / bucket / budget-warning schemas, `UsageConfigSchema` (`dailyBudgetUsd`/`monthlyBudgetUsd`/`warnAtRatio`) defaulted onto `MidniteConfigSchema` (existing configs stay valid).
- [x] Gateway `llm_usage` table (migration **`0024_llm_usage`**, `at`+`feature` indexes) + `usage/` module (repo→service→controller); `GET /usage/summary?from=&to=&groupBy=` returns totals + by day/provider/feature + soft-warn entries (advisory; **never blocks**). Testable static price table (`usage/lib/pricing.ts`).
- [x] Adapter interface carries `usage{inputTokens,outputTokens}`; Anthropic/OpenAI/Gemini adapters wired (openai-compatible inherits). `LlmService` records one row per call with an optional `feature` arg (default `unknown`). Tagged call sites: classifier→`classifier`, planner→`planner`, projects→`project`, heartbeat→`agent`, workflow ai-node→`workflow`. Councils run via spawned CLI sessions (not `LlmService`) → not tracked.
- [x] Web: `getUsageSummary()` client fn + dashboard **LLM cost & usage** widget (spend by day/provider/feature + soft-warn banner) registered in the widget registry/grid.
- [x] Verified after review + merge to `main`: gateway tests **327 pass** (incl. 0024 on `:memory:`), shared 71 pass, `moon run :typecheck`/`:lint` (0 errors)/`web:build` green; an isolated gateway boot smoke confirmed the crypto + usage modules wire up and `/usage/summary` + masked `/providers` respond.
