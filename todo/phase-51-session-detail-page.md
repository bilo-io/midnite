# Phase 51 — Session Detail Page (a cockpit per session)

> midnite spawns Claude Code **sessions** to drive tasks, and surfaces them in a `/sessions`
> **list** and as embedded terminals — but there's **nowhere to *focus* on one session**. You
> can't open a session, watch its full-size terminal, see the approvals it's asking for, the task
> it's working, and its live stats all in one place. Phase 51 adds a **deep-linkable session
> detail page**: a large interactive terminal flanked by two independently collapsible,
> state-persisted panels — **left** for approvals + task/project context (with links), **right**
> for session info + stats. It works for **live** sessions (interactive WS terminal) and **ended**
> ones (read-only transcript), and upgrades the sessions list to route into it. This is
> **composition, not invention** — the terminal, the approvals feed, the layout pattern, and the
> session data model all already exist; this phase wires them into a focused cockpit.

> **Scope guardrails (CLAUDE.md).** Almost entirely **web** work — no new gateway domain: a
> **session is a 1:1 view over its task** ([`shared/src/session.ts`](../packages/shared/src/session.ts),
> computed in [`sessions/sessions.service.ts`](../packages/gateway/src/sessions/sessions.service.ts)),
> so the page **composes existing endpoints** rather than adding a store. Two small, additive
> gateway changes only: a lean `GET /sessions/:id` and **exposing the already-supported
> `sessionId` filter** on the approval-log endpoint. New wire shapes are **zod schemas in
> [`shared`](../packages/shared/src/)**. The page follows the **static-export routing convention**
> (`output: 'export'`): a `/sessions/view?id=` query-string route like tasks/councils/ideas/media —
> **no `[id]` segment, no `generateStaticParams`**. The terminal stays **client-only** (xterm via
> dynamic import, `ssr: false`). Reuse the existing [`live-terminal.tsx`](../packages/web/components/live-terminal.tsx),
> [`approvals-drawer.tsx`](../packages/web/components/approvals-drawer.tsx), and the
> [`councils/[id]`](../packages/web/app/(main)/councils/[id]/council-detail-view.tsx) two-sidebar
> layout — **don't rebuild them**. Responsive cutoffs come from the
> [`use-media-query`](../packages/web/hooks/use-media-query.ts) hooks, never hand-written widths.

> Effort tags: **S** small · **M** medium · **L** large. **A** (contract + API enrichment) unblocks
> the data; **B** (shell + routing + layout) is the frame; **C** (terminal) is the centerpiece and
> the one real design fork (live vs. ended); **D**/**E** fill the panels; **F** wires the entry
> points. A→B→C is the critical path; D/E/F build on B's shell.

---

## Current state (what exists to build on)

- **Session = a view over its task (1:1)** — `SessionSummarySchema`
  ([`shared/src/session.ts`](../packages/shared/src/session.ts)): `id`, `projectSlug`/`projectDisplay`,
  `title`/`subtitle`, `status` (`running`|`waiting`|`completed`|`idle`), `lastActivity`,
  `linkedTaskId`, `agentCli`, `provider`, `contextTokens`/`contextLimit`, `archivedAt`. Synthesized in
  [`sessions.service.ts`](../packages/gateway/src/sessions/sessions.service.ts) — **no separate table.**
- **Sessions list (no detail page)** — [`app/(main)/sessions/page.tsx`](../packages/web/app/(main)/sessions/page.tsx)
  → `sessions-view.tsx` (list/grid/table, status filters, archive/unarchive/delete). **There is no
  `/sessions/view` / `/sessions/[id]` yet — this phase builds it.**
- **Terminal stack (ready)** — [`session-terminal.tsx`](../packages/web/components/session-terminal.tsx)
  (dynamic `ssr:false` wrapper) → `session-terminal-impl.tsx` → [`live-terminal.tsx`](../packages/web/components/live-terminal.tsx)
  (`@xterm/xterm` + FitAddon; `approvals` prop renders inline prompts; **read/write on desktop,
  read-only on touch**). WS via [`use-terminal-socket.ts`](../packages/web/hooks/use-terminal-socket.ts)
  (`attach`/`input`/`resize`/`approval-response` ↔ `output`/`status`/`approval-request`/`approval-resolved`),
  token from `POST /sessions/:id/terminal-token`, to [`terminal/terminal.gateway.ts`](../packages/gateway/src/terminal/terminal.gateway.ts).
  **Ring-buffer replay on reconnect is in-memory** — an *ended* session has no live stream.
- **Transcript (for ended sessions)** — `GET /sessions/:projectSlug/:id/transcript`
  (`getSessionTranscript` in [`web/lib/api.ts`](../packages/web/lib/api.ts)) returns the persisted
  transcript + events + `cwd` — the read-only scrollback source when the ring buffer is gone.
- **Approvals, session-scoped** — pending live in [`terminal/approval.service.ts`](../packages/gateway/src/terminal/approval.service.ts)
  (`replayPending(sessionId, …)`, broadcast over WS; [`approvals-drawer.tsx`](../packages/web/components/approvals-drawer.tsx)
  already subscribes + renders); persistent in `approval_log` (`sessionId`, `taskId`, `toolName`,
  `resolution`, `decidedBy`, …). **The log repo already supports a `sessionId` filter — the
  controller/`listApprovalLog()` only expose `taskId`.** Small enrichment.
- **Session ↔ task ↔ project** — `session.linkedTaskId === task.id`; `task.projectId → projects.id`.
  Fetch `session` + `getTask(linkedTaskId)` + `getProject(task.projectId)` in parallel.
- **Two-sidebar layout precedent** — [`councils/[id]/council-detail-view.tsx`](../packages/web/app/(main)/councils/[id]/council-detail-view.tsx):
  sticky `PageHeader`, `flex flex-col lg:flex-row lg:items-start`, `min-w-0 flex-1` main,
  collapsible rails with `useLocalStorage`-persisted open state, `useIsMobile`/`useIsTablet`/`useIsDesktop`
  ([`use-media-query.ts`](../packages/web/hooks/use-media-query.ts)). **The template to match.**
- **Stats reality** — real today: `status`, `provider`/`agentCli`, `lastActivity`, `cwd` (transcript),
  `retryCount` (on `task`), uptime (from `task.createdAt`). **Placeholder:** `contextTokens`/`contextLimit`
  are hash-seeded, **not** real token counts — surfaced honestly as an estimate (Decision §4).

---

## Theme A — Session detail contract + API enrichment — **S-M** — ✅ DONE (PR #264, 2026-07-01)

Give the page a first-class shape and the two small endpoints it needs.

- [x] **shared:** a `SessionDetailSchema` extending `SessionSummary` with the page's fields —
      `createdAt` (uptime source), `retryCount`, `cwd`, and a `contextEstimate` flag making the
      placeholder nature explicit. Re-export from [`index.ts`](../packages/shared/src/index.ts).
- [x] **gateway:** a lean `GET /sessions/:id` returning `SessionDetail` (today the web does
      `getSessions().find(...)`); thread `retryCount`/`createdAt`/`cwd` from the linked task/transcript
      in [`sessions.service.ts`](../packages/gateway/src/sessions/sessions.service.ts).
- [x] **gateway + web:** **expose the `sessionId` filter** the `approval_log` repo already supports —
      add it to the `GET /approvals/log` query + `listApprovalLog({ sessionId })` in
      [`web/lib/api.ts`](../packages/web/lib/api.ts). No new table; a query param + passthrough.

---

## Theme B — Detail page shell, routing & collapsible layout — **M** — ✅ DONE (PR #264, 2026-07-01)

The frame: a static-export route with a big center and two persistent rails.

- [x] `app/(main)/sessions/view/page.tsx` — reads `?id=` via `useSearchParams`, fetches
      `session` + `task` + `project` in parallel through `useApiData`. **No `[id]` segment** (static export).
- [x] The three-region shell (mirror the council layout): sticky `PageHeader` (session title/status),
      `flex flex-col lg:flex-row lg:items-start`, the terminal as `min-w-0 flex-1` center, a **left** and a
      **right** panel that each **collapse to a slim rail**.
- [x] **Persist panel open/closed state** via `useLocalStorage` (distinct keys, e.g. `session.leftOpen`,
      `session.rightOpen`) — closed stays closed across reloads (Decision §3).
- [x] **Responsive:** on `useIsMobile` the panels become **drawers** (toggled from the header), not rails;
      the terminal takes the full width. Cutoffs from the media-query hooks only.

---

## Theme C — Terminal: live interactive + ended transcript — **M** — ✅ DONE (PR #265, 2026-07-01)

The centerpiece — and the one real fork.

- [x] **Live sessions** (`running`/`waiting`/`idle`): the **full interactive** `SessionTerminal` (WS read/write,
      resize/fit, inline approval prompts) sized large in the center region — reuse
      [`session-terminal.tsx`](../packages/web/components/session-terminal.tsx) as-is (desktop read/write,
      touch read-only per its existing behavior). (Idle counts as live — still attachable.)
- [x] **Ended sessions** (`completed`/archived): a **read-only transcript scrollback** rendered from
      `getSessionTranscript` — the ring buffer is ephemeral, so there's no live socket to attach
      (Decision §2). A clear **live vs. ended** affordance (a badge/header state) so it's never ambiguous.
      Extracted `SessionTranscriptBody` so the modal + ended view share one renderer.
- [x] Terminal chrome shows connection status (live: reused `SessionTerminal`'s existing status chrome) and an
      "ended · read-only" badge for history.

---

## Theme D — Left panel: approvals + task/project context — **M**

Everything about *what this session is working and asking for*.

- [ ] **Approvals feed** for the session: **live pending** (reuse the [`approvals-drawer.tsx`](../packages/web/components/approvals-drawer.tsx)
      WS subscription, filtered to this `sessionId`) + **historical decisions** (the new `approval_log`
      `sessionId` filter) — tool, summary, resolution, who decided.
- [ ] **Task metadata**: status, priority, prompt, retries, timestamps — with a link to
      `/tasks/view?id={linkedTaskId}`.
- [ ] **Project metadata**: name, repo/branch (when `task.projectId` is set) — with a link to the project.
      Absent gracefully when the session has no project.

---

## Theme E — Right panel: session info & stats — **S-M**

The instrument readout — honest about what's real.

- [ ] Provider / `agentCli`, **uptime** (from `createdAt`), **last activity**, status, `cwd`, **retry count**,
      archived state — the fields that genuinely exist.
- [ ] **Context window** shown as `contextTokens/contextLimit` **labeled an estimate** (a tooltip noting it's
      approximate) — no fabricated precision (Decision §4).
- [ ] A compact, scannable definition-list layout; degrades gracefully for fields a given session lacks.

---

## Theme F — Sessions list upgrade + entry points — **S-M**

Make the cockpit reachable from everywhere a session appears.

- [ ] Every card/row in [`sessions-view.tsx`](../packages/web/app/(main)/sessions/sessions-view.tsx) links to
      `/sessions/view?id={id}` (the list becomes a real index into the detail pages).
- [ ] Add an **"Open session"** entry point from the **task page** (when a task has a live/recent session) and
      from the **office** (clicking an agent → its session detail).
- [ ] Ensure deep links resolve directly (a bookmarked `/sessions/view?id=` loads standalone, fetching its own data).

---

## Files this phase touches (map)

- **New/edit (shared):** `SessionDetailSchema` + the `sessionId` approval-log filter param in
  [`shared/src/session.ts`](../packages/shared/src/session.ts) / the approvals contract; re-export from
  [`index.ts`](../packages/shared/src/index.ts); client methods in [`web/lib/api.ts`](../packages/web/lib/api.ts)
  (`getSession`, `listApprovalLog({ sessionId })`)
- **Edit (gateway):** `GET /sessions/:id` + `retryCount`/`createdAt`/`cwd` threading in
  [`sessions/sessions.service.ts`](../packages/gateway/src/sessions/sessions.service.ts) +
  [`sessions.controller.ts`](../packages/gateway/src/sessions/sessions.controller.ts); expose the `sessionId`
  filter on the approval-log endpoint ([`approvals/approvals-settings.controller.ts`](../packages/gateway/src/approvals/approvals-settings.controller.ts))
- **New (web):** `app/(main)/sessions/view/page.tsx` + a `session-detail-view.tsx`; panel components
  `components/sessions/session-left-panel.tsx` (approvals + task/project), `session-right-panel.tsx`
  (info/stats), a live/ended terminal switch
- **Edit (web):** [`sessions-view.tsx`](../packages/web/app/(main)/sessions/sessions-view.tsx) (link cards/rows);
  task page + office entry points
- **Reuse (no changes):** [`live-terminal.tsx`](../packages/web/components/live-terminal.tsx),
  [`session-terminal.tsx`](../packages/web/components/session-terminal.tsx),
  [`use-terminal-socket.ts`](../packages/web/hooks/use-terminal-socket.ts),
  [`approvals-drawer.tsx`](../packages/web/components/approvals-drawer.tsx),
  [`use-media-query.ts`](../packages/web/hooks/use-media-query.ts), the council layout pattern

---

## Verification

- [ ] `/sessions/view?id=<live session>` opens a page with a **large interactive terminal** (type into it,
      approve a tool inline), a left panel, and a right panel; a bookmarked deep link loads standalone.
- [ ] An **ended/archived** session opens the same page with a **read-only transcript scrollback** (no live
      socket) and a clear ended-state affordance; stats show final values.
- [ ] Left/right panels **collapse to rails independently** and their open/closed state **persists across a
      reload**; on mobile they become **drawers** and the terminal goes full-width.
- [ ] Left panel shows the session's **pending approvals live** (a new PreToolUse request appears without a
      reload) **and** its historical decisions (via the `sessionId` log filter); task + project metadata link to
      `/tasks/view?id=` and the project.
- [ ] Right panel shows provider/agentCli, uptime, last activity, status, cwd, retries; **context window is
      labeled an estimate**, not presented as an exact token count.
- [ ] Every `/sessions` card/row links into the detail page; the task page + office expose an "Open session"
      entry point; a session with no project degrades gracefully.
- [ ] The existing embedded terminals (office, sessions list) and the approvals drawer **still work unchanged**
      (reused, not forked).
- [ ] `moon run :typecheck` · `moon run :lint` · `moon run :test` green (shared schema unit; gateway
      `GET /sessions/:id` + approval-log `sessionId`-filter tests; web RTL/story for the detail view, panel
      collapse persistence, and the live-vs-ended switch; **web tests run from the primary checkout, not a
      `.git` worktree**).

---

## Decisions / open questions

1. **Static-export routing: `/sessions/view?id=`** *(settled).* A query-string route like
   tasks/councils/ideas/media — **no `[id]` segment / `generateStaticParams`** (unavailable under
   `output: 'export'`). Deep-linkable and standalone-loadable.
2. **Live = WS terminal; ended = transcript** *(settled).* The ring buffer is in-memory and gone after a
   session exits, so ended sessions render the persisted **transcript** read-only rather than attaching a dead
   socket. This is the one real design fork — build both paths behind a status check.
3. **Panel state in `localStorage`, per the council precedent** *(recommend).* Persist collapse state client-side
   with `useLocalStorage`; server-synced preferences (Phase 43) are a later upgrade, not needed here.
4. **`contextTokens` shown as an estimate** *(recommend).* The field is hash-seeded today, not a real token count
   — label it approximate (tooltip) rather than faking precision. **Real token/usage accounting is deferred** to a
   future observability/metrics phase (this keeps Phase 51 web-only).
5. **Two small additive gateway changes only** *(settled).* A lean `GET /sessions/:id` and exposing the
   already-supported `approval_log` `sessionId` filter — no new domain, table, or store. Everything else composes
   existing endpoints.
6. **Full-interactive on desktop, read-only on touch** *(recommend).* Keep [`live-terminal.tsx`](../packages/web/components/live-terminal.tsx)'s
   existing behavior (no stdin on phones) rather than forcing mobile input — the detail page just gives it more room.
7. **Reuse, don't rebuild** *(settled).* The terminal, the approvals feed, and the collapsible two-sidebar layout
   already exist — this phase composes them. New code is the page shell, the two panels' content, and the entry-point links.
8. **Out of scope** *(settled).* Real LLM token/tool-call accounting, byte-level replay of ended sessions
   (transcript is the history surface), and a multi-session split/compare view are deferred.
