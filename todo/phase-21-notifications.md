# Phase 21 — Notifications & alerting

> midnite's whole premise is running **many agents in parallel** — but today you have to *watch the board* to know when one needs you. A session goes `waiting` on your input (or a tool approval), a task finishes, or a run crashes out after its retries — and nothing tells you. **Phase 21 gives the orchestrator a "tap on the shoulder":** the gateway watches state transitions, applies a notify-policy, persists a feed, and dispatches to in-app toasts, the browser/OS, and a generic webhook — so you can start a batch and walk away.

> **The hook point already exists.** [`task-event-bus.ts`](../packages/gateway/src/tasks/task-event-bus.ts) is in-process pub/sub that `TasksService` emits on **every** state transition (the `TasksGateway` already fans it to the web over `/ws/tasks`). A `NotificationService` just **subscribes** — no new emit paths. Notify-worthy moments come straight from the existing status sets: task `backlog · todo · wip · waiting · done · abandoned` ([`task.ts`](../packages/shared/src/task.ts)), session `running · waiting · completed · idle` ([`session.ts`](../packages/shared/src/session.ts)); tool-approval requests already route through [`approval.service.ts`](../packages/gateway/src/terminal/approval.service.ts).

> **Scope guardrails (CLAUDE.md).** The `Notification` shape + the WS `notification.created` event live in [`@midnite/shared`](../packages/shared/src/) with zod schemas; `cli`/`web`/`desktop` stay pure clients. A new **`notifications` module** owns its table (forward-only migration), the policy, and dispatch — it **subscribes** to other domains' events, it does not import their repositories. The webhook channel **reuses the SSRF guard** [`lib/allowed-origin.ts`](../packages/gateway/src/lib/allowed-origin.ts) — no second fetch path. `config.notifications` is read via `loadConfig()` only. Channels sit behind one small interface (the same "one interface, N implementations" shape as the workflow executors / the Phase 17 spawner).

> **Deferred to Phase 14 (recorded, not built here):** **Slack** and **email** notification channels. They want the credential vault + integration executors from [phase-14-workflows-connect.md](phase-14-workflows-connect.md) — building them here would duplicate that work. Phase 21 ships the channel **interface** + a generic webhook so they slot in as two more `NotificationChannel`s once P14 lands. *(See [Deferred follow-ons](#deferred-follow-ons) — and P14 should flesh these out.)*

> Effort tags: **S** small · **M** medium · **L** large. **A is the substrate** (model + ingestion + feed); B dispatches it; C/D are client surfaces over B. Every box starts unchecked.

---

## Current state (baseline to build on)

- **events:** [`TaskEventBus`](../packages/gateway/src/tasks/task-event-bus.ts) emits `TaskBoardEvent` (`task.created`/`updated`/`deleted`, each carrying the full `Task`) on every mutation; [`TasksGateway`](../packages/gateway/src/tasks/tasks.gateway.ts) (`/ws/tasks`) fans it to the web. A status change arrives as a `task.updated` with the new `status`.
- **statuses:** task `STATUSES` include `waiting` (needs input) / `done` / `abandoned` (crashed out / given up); session `SESSION_STATUSES` include `waiting`. The agent runner retries crashes up to `agent.maxRetries` before `abandoned`.
- **approvals:** [`approval.service.ts`](../packages/gateway/src/terminal/approval.service.ts) routes Claude tool-permission requests to the web UI — a "needs approval" is the most blocking notify-worthy event.
- **desktop:** [`packages/desktop/`](../packages/desktop/) is an Electron app (main process spawns the gateway + serves the web build) — can raise **native OS notifications**.
- **SSRF guard:** [`lib/allowed-origin.ts`](../packages/gateway/src/lib/allowed-origin.ts) (blocks private/loopback) — the model for the webhook channel.
- **missing:** no notification model, table, feed, policy, dispatch, or UI. Entirely net-new.

---

## Theme A — Notification model + ingestion + persisted feed + config — **M** — ✅ DONE (PR #103, 2026-06-22 — see [done.md](done.md))

The substrate: turn state transitions into a stored, policy-filtered feed.

### A1. Contract + config in `shared` — **S**
- [x] A `Notification` schema ([`notification.ts`](../packages/shared/src/notification.ts)): `{ id, kind, severity ('info'|'warn'|'urgent'), title, body, entity: { type, id }, route, readAt, createdAt }`; the `notification.created` WS event + path; `config.notifications` block — `{ enabled, events, channels: { web, browser, webhook? } }`. zod + tests.
- [x] A pure **policy** (`notifyForTask`) mapping a task's status → notify decision (severity + copy), so "which events notify" is data, not scattered `if`s.

### A2. Table + repository — **S–M**
- [x] A `notifications` Drizzle table (migration `0035`): `id`, `kind`, `severity`, `title`, `body`, `entity_type`, `entity_id`, `route`, `read_at` (nullable), `created_at`. Repository: `insert`, `list` (paged, unread-first), `markRead(ids)`, `markAllRead`, `clear`, `countUnread`.

### A3. `NotificationsService` — ingestion + policy — **M**
- [x] Subscribes to [`TaskEventBus`](../packages/gateway/src/tasks/task-event-bus.ts); on a `task.updated` whose status entered `waiting`/`done`/`abandoned` it applies the **policy**, persists a `Notification`, and emits `notification.created`. Default policy: task→`waiting` (warn), `done` (info), `abandoned` (urgent) — all toggleable via `config.notifications.events`. *(Approval/session-specific signals + the dispatcher hand-off are Theme B.)*
- [x] Coalesces same-kind bursts in a 1.5s window (a mass move → one "N tasks finished", not a storm).
- [x] `GET /notifications` (paged + unread count), `POST /notifications/read` (ids / all), `DELETE /notifications` (clear) — thin controller; emits `notification.created` over WS via `NotificationEventBus` → `NotificationsGateway` (`/ws/notifications`).

---

## Theme B — Channel dispatch — **M** — ✅ DONE (PR #108, 2026-06-22 — see [done.md](done.md))

One interface, pluggable channels; config decides which fire.

- [x] A **`NotificationChannel`** interface (`name`/`enabled(config)`/`send`), collected via a `NOTIFICATION_CHANNELS` multi-provider; **`NotificationDispatcher`** fans a persisted notification to all **enabled** channels (`Promise.all`, per-channel failure isolated + logged).
- [x] **`WebChannel`** — emits the `notification.created` WS event (the in-app feed/toasts, Theme C #107). Always on. The service now routes through the dispatcher, so this channel performs the emit (behavior-preserving).
- [x] **`WebhookChannel`** — POSTs the notification JSON to a configured URL, **SSRF-guarded via `isSafeHttpUrl`** (the project's real outbound guard; the doc's `allowed-origin.ts` is the CORS helper) with bounded retry/backoff, best-effort. Off unless `config.notifications.channels.webhook` is set.
- [x] Unit tests (mocked fetch): dispatcher fans to enabled channels + isolates a failure; webhook POSTs to a safe URL, **refuses loopback/private**, no-ops when unset, retries-then-gives-up without throwing; the service spec still asserts the WS emit via a real WebChannel.

**This closed Phase 21 Themes A–C** (D — desktop native notifications — landed later in PR #110).

---

## Theme C — Web notification center + toasts + browser opt-in — **M**

- [x] ✅ (PR #107) **Notification center** — bell + unread badge in the nav bar; dropdown feed (newest-first, severity styling, relative time), **mark-read / mark-all-read / clear**, deep-link via `route`. Backed by `GET /notifications` + the live `notification.created` WS event (`NotificationsProvider` opens `/ws/notifications`, mirroring `use-task-events`).
- [x] ✅ (PR #107) **In-app toasts** — severity-styled toast on each live `notification.created` (reused the existing `toast.tsx` primitive; `urgent` = long-lived, the closest to "sticky" the toast API allows).
- [x] ✅ (PR #107) **Browser/OS notifications** — raised when the `notifyTaskUpdates` opt-in is on, permission is granted, and the tab is hidden (pure, tested `shouldRaiseBrowserNotification`); click focuses + routes. The permission prompt already lives in Settings. Superseded + removed the old task-event `use-task-notifications` hook (the feed path covers waiting/done + abandoned, no double-fire).
- [ ] ◐ PARTIAL — **Settings panel**: the browser-notification opt-in toggle already exists in Settings; the **policy (per-event) + webhook-URL** editing UI (reflecting `config.notifications`) is **deferred** to a follow-up (config-mirroring UI).

---

## Theme D — Desktop native notifications — **S–M** — ✅ DONE (PR #110, 2026-06-22 — see [done.md](done.md))

- [x] In the [Electron app](../packages/desktop/), surface notifications as **native OS notifications** — especially valuable when the window is backgrounded. Implemented the **enhancement** (Decision §5) directly: a **main-process IPC bridge** (preload `window.midniteDesktop.notify` → `midnite:notify` → main `new Notification().show()`), so they fire reliably even when the renderer is hidden/throttled (where its own Notification API isn't).
- [x] **Click → focus** — clicking a desktop notification focuses the window (`win.restore()`/`focus()`) and routes to the entity by sending `route` back over `midnite:navigate` → the renderer's `onNavigate` → `router.push`.
- [x] Respect the same `config.notifications` policy + the user's OS-level permission — the shared `notifyTaskUpdates` opt-in + "only while the window is away" gate apply to both paths (`chooseNotificationDelivery`); the OS owns the native permission (no web-permission gate on the desktop path). Plain browsers keep the web Notification API. Coverage: `chooseNotificationDelivery` + `getDesktopBridge` unit tests (web).

**This closes Phase 21 Themes A–D — Phase 21 COMPLETE** (the Theme C ◐ Settings policy/webhook editing panel remains a deferred config-mirroring follow-up; Slack/email channels remain deferred to Phase 14).

---

## Deferred follow-ons

> Recorded so the boundary is explicit. **These belong with [Phase 14](phase-14-workflows-connect.md)** (credential vault + integration executors) — Phase 21 ships the `NotificationChannel` interface so they're each just one more channel.

- **`SlackChannel`** — post to a channel via a P14 `slack` credential. *(P14 Theme C already builds a `slack.message` executor; the notification channel reuses the same credential + client.)*
- **`EmailChannel`** — SMTP/Gmail via P14 Theme C's `email.send`.
- **Quiet hours / digest** — suppress non-urgent notifications in a window, or batch them into a periodic digest.
- **Per-event routing** — different channels per event type (e.g. only `abandoned` → webhook).

---

## Files this phase touches (map)

- **shared:** new [`notification.ts`](../packages/shared/src/) (`Notification` + policy + the WS `notification.created` event member) + `config.notifications` in [`config.ts`](../packages/shared/src/config.ts) + barrel + tests; typed client functions.
- **gateway:** new `notifications/` module — `notifications.controller.ts` (`GET`/`POST read`/`DELETE`), `notifications.service.ts` (subscribe + policy + coalesce), `notifications.repository.ts`, channel dir (`notification-channel.ts` interface, `web.channel.ts`, `webhook.channel.ts`), `notifications.module.ts` (register in `AppModule`); a forward-only migration for the `notifications` table; reuse [`allowed-origin.ts`](../packages/gateway/src/lib/allowed-origin.ts) + the WS fan-out pattern.
- **web:** a bell/notification-center in the app chrome, a toast primitive, a browser-notification opt-in + settings panel, the `notification.created` subscription; client calls in [`lib/api.ts`](../packages/web/lib/api.ts).
- **desktop:** native OS notification surfacing (+ optional main-process IPC bridge) in [`packages/desktop/`](../packages/desktop/).
- **Docs:** update [`CLAUDE.md`](../CLAUDE.md) (notifications module + policy) + README (`config.notifications`); append to [`done.md`](done.md) as slices land; **add the Slack/email channels to [phase-14](phase-14-workflows-connect.md)'s scope** when that phase is next touched.

---

## Verification

- [ ] A session entering **`waiting`** (needs input/approval) raises an in-app toast + a notification-center entry within a moment of the transition; the board still works normally.
- [ ] A task reaching **`done`** and a task **`abandoned`** each produce a notification per the default policy; toggling that event off in settings stops it.
- [ ] The **unread badge** counts correctly; mark-read / mark-all / clear persist across a reload (DB-backed feed); deep-link routes to the entity.
- [ ] With `config.notifications.channels.webhook` set, a notification POSTs to the URL; a **loopback/private** webhook URL is never called (SSRF guard); a webhook failure doesn't suppress the in-app notification.
- [ ] With browser-notification permission granted and the tab unfocused, a browser notification appears; in the **desktop app**, a native OS notification appears and clicking it focuses + routes.
- [ ] A **bulk** status change (e.g. many tasks at once) is coalesced, not a notification storm.
- [ ] `moon run :typecheck` · `moon run :lint` · `moon run :test` green across the graph; `moon ci` green. (Run web tests from the **primary checkout**, not a `.git` worktree.)

---

## Decisions / open questions

1. **Channels in v1** *(settled in brainstorm).* In-app/web (always) + browser/OS (opt-in) + a generic SSRF-guarded webhook. **Slack/email are deferred to [Phase 14](phase-14-workflows-connect.md)** (reuse its vault + executors); the channel interface makes them drop-in later.
2. **Feed persistence** *(settled in brainstorm: persisted center).* A `notifications` table + a read/unread notification center, so a notification raised while you're away isn't lost. (Adds a migration.)
3. **Default notify policy** *(recommend).* session→`waiting` (needs input/approval), task→`done`, task→`abandoned`. All toggleable via `config.notifications.events`. Confirm the default-on set in the A PR.
4. **Dispatch source** *(recommend: subscribe to the existing bus).* Reuse [`TaskEventBus`](../packages/gateway/src/tasks/task-event-bus.ts) (+ approval/session signals) — no new emit paths in the domains. The notifications module is a pure subscriber.
5. **Desktop delivery** *(recommend: renderer API v1).* Use the renderer Notification API (works in Electron) for v1; add a main-process IPC bridge as an enhancement for reliable backgrounded delivery. Confirm in the D PR.
6. **Coalescing window** *(open).* The debounce window + grouping key that turns a burst (bulk add, mass move) into one/few notifications. Pick concrete numbers in the A3 PR.
