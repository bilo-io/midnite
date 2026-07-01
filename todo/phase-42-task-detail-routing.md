# Phase 42 — Task detail routing & contextual commands

> midnite's task detail lives in a modal: `TaskThreadModal` ([`components/task-thread-modal.tsx`](../packages/web/components/task-thread-modal.tsx)) is opened from `TasksView` local state, and a `/tasks?open={taskId}` query param ([`components/tasks-view.tsx`](../packages/web/components/tasks-view.tsx)) auto-opens it on mount — that's also where the command palette routes a task hit. It works, but a task has **no real URL**: you can't deep-link, share, or refresh into one, the browser back button doesn't track it, and Phase 41's command registry (`useRegisterPaletteCommands` in [`lib/palette-commands.tsx`](../packages/web/lib/palette-commands.tsx)) sits **wired-but-unused** because there was no per-task context to hang commands on. **Phase 42 gives every task a first-class route** — a shareable `/tasks/:id` page that still feels like a modal when you click a card (Next.js intercepting routes), and the contextual "Move to…" palette commands that finally populate the Phase 41 registry.

> **Scope guardrails (CLAUDE.md).** This is a **web-only phase** — **no gateway schema changes and no new REST endpoints**. The single-task read rides the existing `GET /tasks/:id` (verify the client exposes `getTask(id)`; if not, add the thin client method only — Decision §3). Status transitions reuse `TasksView`'s existing `onMove(id, status)` wrapper over `updateTaskStatus`/`startTask`/`stopTask` ([`lib/api.ts`](../packages/web/lib/api.ts)) — **no new transition logic**. Detail rendering is **extracted, not rewritten**: `TaskThreadModal`'s body becomes a shared `<TaskDetail>` consumed by both the modal and the full page, so behaviour is preserved. State stays client-side; no per-user persistence. Deep-linking mirrors the **ideas precedent** ([`app/(main)/ideas/[id]/idea-detail-view.tsx`](../packages/web/app/(main)/ideas/[id]/idea-detail-view.tsx)): `useApiData` fetch + inline not-found, no hard 404 redirect.

> Effort tags: **S** small · **M** medium · **L** large. **Theme A** stands alone (a shareable detail page); **B** layers the modal-on-click UX over it via intercepting routes and migrates every entry point onto the route; **C** is the small, independent payoff that closes Phase 41's deferred boxes. A+B are the headline and intended to land together; C can ship before or after.

---

## Current state (what exists to build on)

- **Task detail modal** — [`components/task-thread-modal.tsx`](../packages/web/components/task-thread-modal.tsx): `TaskThreadModal` takes `{ task, projects, tasks, onClose }`. Opened from `TasksView` local `selected` state; the "Start"/"Abandon" buttons call `startTask` / `updateTaskStatus` directly.
- **Tasks page + deep-link** — [`app/(main)/tasks/page.tsx`](../packages/web/app/(main)/tasks/page.tsx) renders `TasksView`, which owns the modal and an `?open={taskId}` `useEffect` that auto-opens on mount. **No `[id]` dynamic segment exists.**
- **Transitions** — [`components/tasks-view.tsx`](../packages/web/components/tasks-view.tsx) `onMove(taskId, status)`: optimistic restatus, then `startTask` (todo/backlog→wip), `stopTask` (wip/waiting→todo/backlog), or `updateTaskStatus` (everything else). Board `D`/`A` keys already call `onMove(id, 'done'|'abandoned')` ([`components/board-view.tsx`](../packages/web/components/board-view.tsx)).
- **Command palette + registry** — [`components/command-palette.tsx`](../packages/web/components/command-palette.tsx) pushes a result's `route` via `router.push`; task results route to `/tasks?...`. [`lib/palette-commands.tsx`](../packages/web/lib/palette-commands.tsx): `PaletteCommandsProvider` + `useRegisterPaletteCommands(ns, cmds)` + `usePaletteCommands()`. **Only [`components/global-keymap.tsx`](../packages/web/components/global-keymap.tsx) registers commands today** — no contextual consumers (Phase 41 left this for exactly this kind of feature).
- **Deep-link precedent (ideas)** — [`app/(main)/ideas/[id]/idea-detail-view.tsx`](../packages/web/app/(main)/ideas/[id]/idea-detail-view.tsx): `useApiData(() => getIdea(id), [id])`, inline error/not-found, sub-state (`?chat=open`) in the URL.

---

## Theme A — full task detail page — ✅ DONE (PR #246, 2026-06-30)

A real, shareable, refresh-safe URL for a single task.

> **Route shipped at `/tasks/view?id=`, not `/tasks/[id]`.** The app builds with
> `output: 'export'` (no server runtime), which cannot prerender arbitrary runtime
> ids — every other detail surface (`/ideas/view`, `/councils/view`, `/media/view`)
> uses the same query-param pattern, and the doc's "mirror the ideas precedent" *is*
> that pattern. A true `[id]` segment would 404 on direct-link/refresh, which is
> exactly what Theme A must avoid. The `app/(main)/tasks/[id]/` dir holds the
> reusable `task-detail-view.tsx` (matching the ideas/councils/media convention).

- [x] Extract `TaskThreadModal`'s inner body into a reusable **`<TaskDetail task projects tasks variant />`** component (the modal is now a thin shell: overlay chrome + `<TaskDetail>` + `onClose`). Behaviour-preserving — the modal's existing specs pass unchanged.
- [x] Add **`app/(main)/tasks/view/page.tsx`** + a `[id]/task-detail-view.tsx` client view that fetches `getTask(id)` + `getProjects()` + sibling `getTasks()` in parallel (Decision §6) with `useApiData`, renders `<TaskDetail variant="page">`, and shows loading + **inline not-found** (mirror `idea-detail-view`), not a hard 404.
- [x] Page chrome: a back affordance to `/tasks`, the task title in `document.title`, and the same status/transition controls the modal offers (free via `<TaskDetail>`).
- [x] Added `getTask(id)` to [`lib/api.ts`](../packages/web/lib/api.ts) against the existing `GET /tasks/:id` (Decision §3) — no new endpoint.

---

## Theme B — Intercepting-route modal + navigation migration — **M–L**

Click a card → modal overlay (you stay on the board); direct link / refresh / share → the Theme-A full page.

- [ ] Add a parallel **`@modal` slot** under `app/(main)/` with a `default.tsx` (renders nothing) and an **intercepting route** `@modal/(.)tasks/[id]/page.tsx` that renders `<TaskDetail>` inside the modal overlay. Hard navigation falls through to `tasks/[id]/page.tsx` (Theme A). (Decision §1 settles the exact slot/intercept layout.)
- [ ] Migrate every task-open entry point to **`router.push('/tasks/:id')`**: board/list/table `onSelect` ([`tasks-view.tsx`](../packages/web/components/tasks-view.tsx)), the command palette's task-result `route` ([`command-palette.tsx`](../packages/web/components/command-palette.tsx)), and the board `Enter` key.
- [ ] Replace the legacy `?open={taskId}` `useEffect` with a **client redirect** `/tasks?open=:id` → `/tasks/:id` so existing links/bookmarks keep working for one release (Decision §4); remove the local `selected`-state open path once nav drives the modal.
- [ ] Closing the modal returns to the prior route (browser back / `router.back()`); the board's scroll/filter state survives the round-trip.

---

## Theme C — Contextual "Move to" palette commands — **S** — ✅ DONE (PR #254, 2026-06-30)

Populate Phase 41's unused registry with per-task actions, scoped to when a task is open.

- [x] Added **`useTaskPaletteCommands(task, tasks)`** (new hook): registers namespace `task-detail` with **"Move to in progress", "Mark done", "Move to waiting", "Abandon"** via `useRegisterPaletteCommands`, unregistering on unmount and skipping the task's current status. Each command routes through the shared **`lib/task-transitions.moveTask`** — the start/stop/updateStatus selection extracted from `tasks-view`'s `onMove` (which now delegates to it too, so no duplication). Signature took `tasks` (not `onMove`) so the hook is self-contained and can confirm a blocked start.
- [x] Consume the hook from `<TaskDetail>` (so it fires for both the modal and the full page) — commands appear in `⌘K` only while a task is open and vanish on close. Abandon + blocked-start confirm, matching the detail surface and board.
- [x] These complete the 2 deferred Phase 41 boxes (contextual task-detail "Move to" commands). The `E` edit-form shortcut **stays deferred** (the detail surface *is* the edit surface; `E` would duplicate opening it). *(✅ DONE — PR #254, 2026-06-30)*

---

## Files this phase touches (map)

- **New:** [`app/(main)/tasks/[id]/page.tsx`](../packages/web/app/(main)/tasks/) — full detail page (Theme A)
- **New:** `app/(main)/tasks/[id]/task-detail-view.tsx` — client fetch + render wrapper (Theme A)
- **New:** `components/task-detail.tsx` — `<TaskDetail>` extracted from the modal body (Theme A)
- **New:** `app/(main)/@modal/default.tsx` + `app/(main)/@modal/(.)tasks/[id]/page.tsx` — intercepting-route modal (Theme B)
- **New:** `hooks/use-task-palette-commands.ts` — contextual command registration (Theme C)
- **Edit:** [`components/task-thread-modal.tsx`](../packages/web/components/task-thread-modal.tsx) — becomes a thin shell around `<TaskDetail>`
- **Edit:** [`components/tasks-view.tsx`](../packages/web/components/tasks-view.tsx) — `onSelect` → `router.push`; retire `?open=` local-state path (redirect)
- **Edit:** [`components/board-view.tsx`](../packages/web/components/board-view.tsx) — `Enter` pushes the route
- **Edit:** [`components/command-palette.tsx`](../packages/web/components/command-palette.tsx) — task result route → `/tasks/:id`
- **Edit:** [`app/(main)/layout.tsx`](../packages/web/app/(main)/layout.tsx) — render the `@modal` parallel slot
- **Maybe:** [`lib/api.ts`](../packages/web/lib/api.ts) — add `getTask(id)` if missing (no new endpoint)
- **No gateway changes** — `GET /tasks/:id` and the transition routes already exist.

---

## Verification

- [ ] Visiting `/tasks/:id` directly (or refreshing on it) renders a **full detail page** with the task's data; an unknown id shows an inline not-found, not a crash or hard 404.
- [ ] Clicking a card on the board (or pressing `Enter` on a focused card) opens the task as a **modal overlay** and the URL becomes `/tasks/:id`; the board stays mounted behind it.
- [ ] Closing the modal returns to `/tasks` (or the prior route) via browser back, with board scroll/filter state intact.
- [ ] A command-palette task result navigates to `/tasks/:id` (modal in-app); a shared `/tasks/:id` link opens the full page for a fresh visitor.
- [ ] Legacy `/tasks?open=:id` redirects to `/tasks/:id`.
- [ ] With a task open, `⌘K` shows **"Move to wip / Mark done / Move to waiting / Abandon"**; each transitions the task correctly (start/stop session logic respected) and the commands disappear when no task is open.
- [ ] `TaskThreadModal`'s existing specs still pass after the `<TaskDetail>` extraction (behaviour-preserving).
- [ ] `@midnite/ui` boundary test passes (no new leaf imports needed).
- [ ] Playwright e2e covers: direct-link full page, in-app modal, refresh-on-modal → full page, palette → detail, contextual commands appear-and-transition. (Web tests run from the **primary checkout**, not a `.git` worktree.)
- [ ] `moon run :typecheck` · `moon run :lint` · `moon run :test` green across the graph.

---

## Decisions / open questions

1. **Intercepting-route layout** *(recommend: `@modal` slot under `(main)`).* Add `app/(main)/@modal/default.tsx` (renders `null`) + `app/(main)/@modal/(.)tasks/[id]/page.tsx` (the intercepted modal), with the full page at `app/(main)/tasks/[id]/page.tsx`. The `(.)` matcher intercepts same-segment navigation from `(main)`; confirm the matcher depth against where the `<Link>`/`router.push` originates and adjust to `(..)` only if the slot sits a level up.
2. **Detail reuse** *(settled: extract `<TaskDetail>`).* Pull the modal body into a shared component consumed by the modal shell and the full page — rather than rendering the entire modal-in-a-page. Keeps one source of truth for detail UI and avoids a modal chrome nested inside a page.
3. **Single-task fetch** *(recommend: reuse `GET /tasks/:id`).* Verify [`lib/api.ts`](../packages/web/lib/api.ts) exposes `getTask(id)`; if the app only ever fetched the list, add the thin client method against the existing endpoint. **No new gateway route** — if it turns out `GET /tasks/:id` doesn't exist, stop and reconsider scope (that would breach the web-only guardrail).
4. **Legacy `?open=` back-compat** *(recommend: redirect for one release).* Client-redirect `/tasks?open=:id` → `/tasks/:id` so existing palette links/bookmarks keep working, then drop the param in a later phase.
5. **`E` edit shortcut** *(settled: out of scope, stays deferred).* The detail surface is the edit surface; a dedicated edit form / `E` binding is not part of this phase.
6. **Detail page data needs** *(open).* `<TaskDetail>` wants `projects` and sibling `tasks` (for links/deps). Decide whether the full page fetches those alongside the task (extra requests) or renders a lighter detail when they're absent — settle while building Theme A.
