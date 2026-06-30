# Phase 44 — Outbound webhooks & integrations

> midnite already tells *you* when a task needs attention — Phase 21 ([`notifications/`](../packages/gateway/src/notifications/)) fans task transitions to an in-app feed and a **single** SSRF-guarded webhook URL pulled from config. But there's no way to push those events to **where a team already lives** — a Slack channel, a Discord server, an arbitrary receiver — and certainly not several at once, per team, with formatting and a way to see whether delivery actually worked. **Phase 44 turns the one-off notification webhook into a real outbound-integrations surface:** multiple per-team endpoints managed from the UI, each with a provider format (Slack / Discord / generic JSON), an event filter, an HMAC signature, and a deliveries log you can inspect, test, and re-fire.

> **Scope guardrails (CLAUDE.md).** New gateway feature module `webhooks/` following the **controller → service → repository** convention (template: [`notifications/`](../packages/gateway/src/notifications/)). All wire contracts (the `Webhook`, `WebhookDelivery`, provider enum, event-filter) are **zod schemas in [`shared`](../packages/shared/src/)** — never untyped JSON. Endpoints are **team-scoped** via the existing [`teamScopeFilter`](../packages/gateway/src/db/team-scope.ts) (Phase 33) and gated by Phase 35 RBAC. Delivery is **best-effort and never blocks a task transition** — it rides the [`TaskEventBus`](../packages/gateway/src/tasks/task-event-bus.ts) the way `NotificationsService` / `PhaseDocSyncService` already do. **Reuse, don't reinvent:** the SSRF guard + bounded fetch/retry/backoff already live in [`notifications/channels/webhook.channel.ts`](../packages/gateway/src/notifications/channels/webhook.channel.ts) (extract the safe-delivery core into a shared gateway lib rather than copy-paste); secrets are encrypted at rest with [`CryptoService`](../packages/gateway/src/crypto/crypto.service.ts) (AES-256-GCM, `MIDNITE_SECRET_KEY`); HMAC signing adapts [`lib/token-hash.ts`](../packages/gateway/src/lib/token-hash.ts). Drizzle migrations are **forward-only**. **Phase 21's notification webhook channel is left untouched** (it serves the personal-notification use case); this is an additive, separate surface (Decision §1).

> Effort tags: **S** small · **M** medium · **L** large. **Theme A** (endpoint entity + management) is the foundation; **B** (the signed delivery engine) is the heart; **C** (provider formatting) is what makes a Slack URL "just work"; **D** (deliveries log + test + redeliver) is the observability that makes webhooks debuggable. A→B→C are the intended order; D builds on the delivery records B writes.

---

## Current state (what exists to build on)

- **Event bus** — [`tasks/task-event-bus.ts`](../packages/gateway/src/tasks/task-event-bus.ts): `subscribe()`/`emit(event)`. Event shapes in [`shared/src/events/task.ts`](../packages/shared/src/events/task.ts): `task.created` · `task.updated` · `task.deleted` · `tasks.bulkCreated`, each carrying the full `Task` + an ISO `at`.
- **Subscriber pattern** — `NotificationsService` & `PhaseDocSyncService` subscribe in `onModuleInit`, unsubscribe in `onModuleDestroy`. Mirror it.
- **Existing webhook delivery (Phase 21)** — [`notifications/channels/webhook.channel.ts`](../packages/gateway/src/notifications/channels/webhook.channel.ts): `fetch` + `AbortSignal.timeout()`, `isSafeHttpUrl()` SSRF guard, `MAX_ATTEMPTS=3`, exponential `BACKOFF_MS`, failures logged not thrown. **The reusable core.**
- **Transition-event policy** — [`shared/src/notification.ts`](../packages/shared/src/notification.ts) `notifyForTask(task, events)` turns a status change into a decision; the same idea drives the per-endpoint event filter.
- **Team scoping & RBAC** — [`db/team-scope.ts`](../packages/gateway/src/db/team-scope.ts) `teamScopeFilter`, `TeamScope` from auth guard (Phase 33); role gates from Phase 35.
- **Secrets** — [`crypto/crypto.service.ts`](../packages/gateway/src/crypto/crypto.service.ts) (AES-256-GCM at rest); [`lib/token-hash.ts`](../packages/gateway/src/lib/token-hash.ts) (`hashToken`/`tokenMatches`) to adapt for HMAC-SHA256 signing. Service-token precedent: [`shared/src/service-token.ts`](../packages/shared/src/service-token.ts) + schema.
- **Module + migration flow** — [`notifications/notifications.module.ts`](../packages/gateway/src/notifications/notifications.module.ts) template; tables in [`db/schema.ts`](../packages/gateway/src/db/schema.ts); auto-numbered SQL under [`drizzle/`](../packages/gateway/drizzle/) applied by [`db/db.module.ts`](../packages/gateway/src/db/db.module.ts).

---

## Theme A — Webhook endpoint entity + CRUD + Settings UI — **M**

A team can register and manage several outbound endpoints.

- [ ] **shared:** `Webhook` / `WebhookCreate` / `WebhookUpdate` zod schemas + a `WebhookProvider` enum (`slack` | `discord` | `generic`) and a `WebhookEventFilter` (which task events / status transitions fire it) in [`shared/src/webhook.ts`](../packages/shared/src/); expose typed client methods in the API client.
- [ ] **gateway:** `webhooks` Drizzle table (`id` UUIDv7, `teamId`, `createdBy`, `url`, `provider`, `eventFilter` JSON, `secret` encrypted-at-rest, `enabled`, `createdAt`, `updatedAt`) + forward-only migration. `WebhooksRepository` (team-scoped reads via `teamScopeFilter`) → `WebhooksService` (validation: safe-URL check at write time, secret generation/encryption) → `WebhooksController` (`GET`/`POST`/`PATCH`/`DELETE /webhooks`, `ZodValidationPipe`). Managing endpoints requires the team-admin role (Phase 35); the signing secret is **revealed once** on create.
- [ ] **web:** a **Settings → Integrations** page — list endpoints (provider badge, target host, enabled toggle, event filter), add/edit/delete, reveal-once secret, per-endpoint enable switch.

---

## Theme B — Signed delivery engine off the event bus — **M**

Events become signed, retried, recorded HTTP deliveries.

- [ ] Extract the safe-delivery core (SSRF guard + bounded fetch/retry/backoff) from [`webhook.channel.ts`](../packages/gateway/src/notifications/channels/webhook.channel.ts) into a shared gateway lib (e.g. `lib/safe-webhook-delivery.ts`); Phase 21's channel keeps using it (behaviour-preserving).
- [ ] `WebhooksService` subscribes to `TaskEventBus` (`onModuleInit`/`onModuleDestroy`), resolves the team's enabled endpoints whose `eventFilter` matches the event, and dispatches a delivery per endpoint. **Best-effort — never blocks or throws into the transition.**
- [ ] **HMAC-SHA256 signature** over the raw body with the per-endpoint secret, sent as `X-Midnite-Signature` + an `X-Midnite-Timestamp` (replay-window guard); document the verification recipe. Secret decrypted via `CryptoService` at send time.
- [ ] Record every attempt in a `webhook_deliveries` table (`webhookId`, `event`, rendered `payload`, `status`, `responseCode`, `attempts`, `error`, `createdAt`) — the data Theme D surfaces.

---

## Theme C — Provider formatting (Slack / Discord / generic) — **S–M**

Shape the event into what each receiver expects.

- [ ] A small formatter per provider mapping a `TaskBoardEvent` → request body: **Slack** incoming-webhook (`{ text }` / Block Kit), **Discord** (`{ content }` / embed), **generic** (the raw signed JSON event — the canonical contract). Provider is chosen on the endpoint; the formatter is selected at dispatch.
- [ ] Keep messages terse + useful (task title, status transition, project, a deep link to `/tasks/:id` — dovetails with Phase 42). Generic stays a stable, documented JSON shape so custom receivers can rely on it.
- [ ] **Linear is explicitly out of scope** (Decision §4) — it needs a stored API token + issue mapping, not an incoming webhook; a later phase.

---

## Theme D — Deliveries log + test + redeliver — **S**

Make webhooks debuggable, not a black box.

- [ ] **web:** a per-endpoint **deliveries log** (recent attempts: event, status, response code, timestamp) in the Integrations page.
- [ ] **"Send test event"** — POSTs a synthetic `task.updated` to the endpoint so a user can confirm wiring + see the formatted payload land, without waiting for a real transition.
- [ ] **Redeliver** a failed delivery — re-fire the stored payload (faithful replay) via the same signed-delivery path; record the new attempt.

---

## Files this phase touches (map)

- **New (shared):** [`shared/src/webhook.ts`](../packages/shared/src/) — `Webhook`/`WebhookCreate`/`WebhookUpdate`/`WebhookDelivery` + provider & event-filter schemas; client methods in [`shared/src/api.ts`](../packages/shared/src/api.ts)
- **New (gateway):** `gateway/src/webhooks/` — `webhooks.module.ts`, `.controller.ts`, `.service.ts`, `.repository.ts`, `delivery.service.ts` (bus subscriber), `formatters/{slack,discord,generic}.ts`, `lib/sign.ts` (HMAC)
- **New (gateway):** `gateway/src/lib/safe-webhook-delivery.ts` — extracted SSRF-guard + retry/backoff core
- **New (gateway):** `webhooks` + `webhook_deliveries` tables in [`db/schema.ts`](../packages/gateway/src/db/schema.ts) + a forward-only [`drizzle/`](../packages/gateway/drizzle/) migration
- **Edit (gateway):** [`notifications/channels/webhook.channel.ts`](../packages/gateway/src/notifications/channels/webhook.channel.ts) — delegate to the extracted core (behaviour-preserving); register `WebhooksModule` in `AppModule`
- **New (web):** `app/(main)/settings/integrations/` — Integrations management page + delivery-log + test/redeliver components; wire into the settings sidebar
- **No changes to Phase 21's notification behaviour** beyond the shared-core extraction.

---

## Verification

- [ ] A team admin can add a Slack, a Discord, and a generic endpoint, each with an event filter; the signing secret is shown once on create and stored encrypted (never returned again).
- [ ] Moving a task to a filtered status fires every matching enabled endpoint; a disabled or non-matching endpoint does **not** fire.
- [ ] Slack and Discord endpoints receive a correctly-shaped payload that renders in-channel; the generic endpoint receives the documented JSON with a valid `X-Midnite-Signature` (HMAC verifies with the secret) + timestamp.
- [ ] A failing endpoint retries with backoff, is logged, and **never blocks or errors the task transition**; an SSRF-unsafe URL is rejected at write time.
- [ ] The deliveries log shows each attempt (event, status, code); "Send test event" delivers a synthetic event; "Redeliver" re-fires a failed delivery faithfully.
- [ ] Endpoints are team-scoped (a user only sees/manages their team's) and management is gated by RBAC; the Phase 21 notification webhook still works unchanged.
- [ ] `moon run :typecheck` · `moon run :lint` · `moon run :test` green across the graph (gateway service + repository + formatter unit tests; web RTL for the Integrations page; a delivery-engine test asserting filter + signature + retry).

---

## Decisions / open questions

1. **Relationship to Phase 21's webhook channel** *(settled: additive, separate).* Phase 21's single-URL notification webhook stays as-is for personal notifications; Phase 44 is a distinct team-integrations surface. They share only the extracted safe-delivery core. A future phase could consolidate, but not here.
2. **Signing** *(recommend: HMAC-SHA256, per-endpoint secret, `X-Midnite-Signature` + `X-Midnite-Timestamp`).* Adapt `lib/token-hash.ts`; secret encrypted at rest via `CryptoService`. Timestamp header bounds replay. Document the verification recipe for receivers.
3. **Event coverage** *(recommend: task lifecycle first).* `task.created` / `task.updated` (status transitions, reusing the `notifyForTask` filter idea for waiting/done/abandoned) / `task.deleted`, with a per-endpoint filter. Agent / approval / workflow events are a later extension.
4. **Linear** *(settled: out of scope).* Not an incoming webhook — needs an API token (reuse Phase 38 service tokens + `CryptoService`) and issue create/update mapping. Deferred to a dedicated integration phase.
5. **Delivery granularity** *(recommend: one delivery per event per endpoint, no coalescing).* Simpler and more faithful than Notifications' 1.5s coalescing; revisit if a noisy board floods an endpoint (a per-endpoint rate cap is the future knob, not v1).
6. **Redeliver payload source** *(recommend: replay the stored rendered payload).* Persist the rendered body on each delivery so redeliver is faithful even if the task later changed; the alternative (rebuild from current task state) can drift. Settle while building Theme D.
7. **RBAC granularity** *(recommend: admin-manages, member-views).* Creating/editing/deleting endpoints requires the team-admin role (Phase 35); viewing the deliveries log is open to any team member. Confirm against the existing role gates while building Theme A.
