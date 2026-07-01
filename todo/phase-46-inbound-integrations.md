# Phase 46 — Inbound Integrations (external events → tasks)

> Phase 44 made midnite **push** task events out to Slack/Discord/generic receivers.
> Phase 46 is the **mirror**: let external systems **create midnite tasks**. A GitHub
> issue or PR is opened, a Linear issue is filed, or any service posts a signed JSON
> payload — and midnite turns it into a board task that flows through the normal
> classify/plan intake. This **closes the Linear gap Phase 44 explicitly deferred**
> ("needs a stored API token + issue mapping") and turns the board into the single
> inbox a team's tools feed.

> **Scope guardrails (CLAUDE.md).** New gateway feature module `integrations/inbound/`
> following **controller → service → repository** (template: the Phase 44
> [`webhooks/`](../packages/gateway/src/webhooks/) module — entity, team-scope, RBAC,
> reveal-once secret, all mirrored here). All wire contracts (the `InboundSource`,
> provider enum, event filter, delivery record) are **zod schemas in
> [`shared`](../packages/shared/src/)** — never untyped JSON. Sources are **team-scoped**
> ([`teamScopeFilter`](../packages/gateway/src/db/team-scope.ts)) and managed under Phase 35
> RBAC (admin-manages, member-views). The receiver is **unauthenticated by session** —
> the **provider signature is the auth** (HMAC verified against the per-source secret;
> reuse/adapt [`lib/token-hash.ts`](../packages/gateway/src/lib/token-hash.ts)'s
> `timingSafeEqual`). Task creation goes through the **existing**
> [`TasksService.createFromPrompt`](../packages/gateway/src/tasks/tasks.service.ts) — **no
> new task-creation path** — and is **best-effort** (a bad/duplicate payload never throws
> into anything). Secrets encrypted at rest via
> [`CryptoService`](../packages/gateway/src/crypto/crypto.service.ts). Forward-only Drizzle
> migrations. This is a **dedicated** surface, **separate** from the generic
> [workflow webhook trigger](../packages/gateway/src/workflows/webhook.controller.ts)
> (which stays for arbitrary automation) — exactly as Phase 44 is separate from Phase 21's
> notification webhook (Decision §1).

> Effort tags: **S** small · **M** medium · **L** large. **A** (entity + management) is the
> foundation; **B** (the signed receiver) is the heart; **C** (provider adapters) is what
> makes "connect GitHub" just work; **D** (log + backlink) is the observability. A→B→C is
> the intended order; D builds on the delivery records B writes.

---

## Current state (what exists to build on)

- **Outbound mirror (Phase 44)** — [`webhooks/`](../packages/gateway/src/webhooks/):
  team-scoped entity + CRUD + encrypted reveal-once secret + RBAC via
  `TeamsService.getMembership` + a Settings → Integrations page. **Mirror its structure.**
- **Task creation pipeline** — [`TasksService.createFromPrompt`](../packages/gateway/src/tasks/tasks.service.ts)
  (`createFromPrompt(input, { emit: true })`) already classifies, plans, guesses the repo,
  and emits `task.created`. A mapped inbound item becomes a normal `todo` task.
- **GitHub fetch precedent** — [`UrlContextService`](../packages/gateway/src/agent/url-context.service.ts)
  already lifts GitHub issue/PR title+body via `gh` (auth) / anonymous REST fallback — the
  parsing reference for the GitHub adapter.
- **HMAC primitives** — [`lib/token-hash.ts`](../packages/gateway/src/lib/token-hash.ts)
  (`timingSafeEqual`); Phase 44 generates + encrypts per-endpoint secrets the same way.
- **Sources system** — tasks already carry typed `Source` links (the origin issue/PR URL
  attaches here, no new concept).
- **Module + migration flow** — [`webhooks.module.ts`](../packages/gateway/src/webhooks/webhooks.module.ts)
  template; tables in [`db/schema.ts`](../packages/gateway/src/db/schema.ts); auto-numbered
  SQL under [`drizzle/`](../packages/gateway/drizzle/) applied by
  [`db/db.module.ts`](../packages/gateway/src/db/db.module.ts).
- **Raw body** — signature verification needs the **raw** request bytes; the Fastify adapter
  must expose them on the receiver route (Decision §4 — the main technical risk).

---

## Theme A — Inbound source entity + contract + Settings UI — **M** — ✅ DONE (PR #259, 2026-07-01)

A team registers and manages the external systems that may open tasks.

- [x] **shared:** [`inbound.ts`](../packages/shared/src/inbound.ts) — `InboundSource`/create/update
      schemas, `InboundProvider` (github|linear|generic), a flat `InboundEventFilter { events: string[] }`
      (empty = accept all) + a curated `INBOUND_PROVIDER_EVENTS` catalog, reveal-once
      `InboundSecretResponse`, and the `InboundDelivery` shapes (for B/D); typed client methods in `web/lib/api.ts`.
- [x] **gateway:** `inbound_sources` + `inbound_deliveries` tables + migration `0061`.
      `InboundSourcesRepository` (team-scoped) → `InboundSourcesService` (secret gen/encrypt, reveal-once,
      rotate, team-scope, RBAC) → `InboundSourcesController` (`GET`/`POST`/`PATCH`/`DELETE /integrations/inbound`
      + `POST :id/rotate`); registered in `AppModule`; explicit `@Inject` tokens. **Shared base extracted**
      (`integrations/lib/managed-secret.ts`: secret + team-admin RBAC + team-scope) and Phase 44's webhooks
      service refactored onto it.
- [x] **web:** an **Inbound sources** section on Settings → Integrations — list (provider, receiver URL,
      event filter, default repo/project, enable toggle), add (provider + event picker + defaults),
      reveal-once secret modal, rotate, delete. *(✅ DONE — PR #259, 2026-07-01)*

---

## Theme B — Provider-aware receiver + task creation — **M**

Signed external events become board tasks.

- [ ] `InboundReceiverController` — `POST /integrations/inbound/:id` reads the **raw body**,
      resolves the source (404 if unknown/disabled), and **verifies the provider signature**
      (HMAC over the raw bytes with the decrypted per-source secret; `timingSafeEqual`). A bad
      signature → `401`, recorded as a rejected delivery; no task. **No session auth** — the
      signature is the gate.
- [ ] On a verified, filter-matching event: the provider adapter (Theme C) maps the payload →
      a `CreateTaskInput`, and the service calls
      [`createFromPrompt`](../packages/gateway/src/tasks/tasks.service.ts) (lands in `todo`,
      classified/planned; the source's `defaultRepo`/`defaultProjectId` seed it unless the
      payload implies otherwise). The origin issue/PR URL is attached as a task `Source`.
- [ ] **Idempotent / dedup:** persist the external delivery/item id per source; a redelivery
      or duplicate event is a no-op (recorded as `skipped-duplicate`, no second task).
- [ ] **Best-effort:** parsing/creation failures are caught, logged, and recorded as a failed
      delivery — they never throw out of the request (the sender gets a `2xx`/`4xx`, never a
      partial side effect).

---

## Theme C — Provider adapters (GitHub / Linear / generic) — **M**

Turn each provider's payload into a normalized task.

- [ ] A small adapter per provider: **GitHub** (`X-Hub-Signature-256` HMAC; `issues`/
      `pull_request` `opened` → title + body + html_url), **Linear** (`Linear-Signature`
      HMAC; `Issue` `create` → title + description + url), **generic** (the documented signed
      JSON contract — `X-Midnite-Signature`, matching Phase 44's outbound scheme — so any sender
      can integrate). Each exposes `verify(rawBody, headers, secret)` + `toTask(payload, source)`.
- [ ] The event filter gates which provider events create a task; a non-matching event is a
      recorded no-op. Document each provider's webhook setup (URL + secret + which events).
- [ ] Keep the mapped prompt terse + useful (title as the task prompt, body truncated, the
      source link attached). Generic stays a **stable, documented** shape.

---

## Theme D — Inbound deliveries log + source backlink — **S**

Make inbound debuggable, not a black box.

- [ ] Record every received event in an `inbound_deliveries` table (`sourceId`, `provider`,
      `event`, `externalId`, `result` (`created` / `skipped-duplicate` / `rejected` /
      `ignored`), `taskId?`, `error?`, `createdAt`).
- [ ] **web:** a per-source deliveries log (recent events: provider, event, result, created-task
      link, timestamp) in the Integrations → Inbound section.
- [ ] The created task surfaces its origin: the issue/PR URL as a `Source` (reusing the existing
      sources UI on the task card / thread) — so "where did this task come from?" is one click.

---

## Files this phase touches (map)

- **New (shared):** [`shared/src/inbound.ts`](../packages/shared/src/) — `InboundSource` / create / update / `InboundProvider` / `InboundEventFilter` / delivery + secret-response schemas; client methods in [`web/lib/api.ts`](../packages/web/lib/api.ts)
- **New (gateway):** `gateway/src/integrations/inbound/` — `inbound.module.ts`, `inbound-sources.controller.ts`, `inbound-sources.service.ts`, `inbound-sources.repository.ts`, `inbound-receiver.controller.ts`, `inbound.service.ts` (verify + map + create + dedup), `adapters/{github,linear,generic}.ts`, `lib/verify-signature.ts`
- **New (gateway):** `inbound_sources` + `inbound_deliveries` tables in [`db/schema.ts`](../packages/gateway/src/db/schema.ts) + a forward-only [`drizzle/`](../packages/gateway/drizzle/) migration
- **Edit (gateway):** register `InboundModule` in [`app.module.ts`](../packages/gateway/src/app.module.ts); ensure the receiver route gets the **raw body** (Fastify) for HMAC
- **Edit (web):** [`app/(main)/settings/integrations/`](../packages/web/app/(main)/settings/integrations/) — add the **Inbound** section + sources management + deliveries log
- **Reuse:** `TasksService.createFromPrompt`, `CryptoService`, `TeamsService.getMembership`, the sources system — no changes to them.

---

## Verification

- [ ] A team admin can register a GitHub, a Linear, and a generic inbound source; the signing secret is shown once and stored encrypted (never returned again); the receiver URL is displayed to paste into the sender.
- [ ] A correctly-signed GitHub `issues.opened` (and a Linear `Issue` create, and a generic signed payload) creates a board task whose prompt is the issue title/body and whose `Source` is the origin URL; the task appears live on the board.
- [ ] A **bad signature** is rejected (`401`, logged as `rejected`) and creates **no** task; a **non-matching event** is a logged no-op; a **redelivery / duplicate** external id creates **no** second task (`skipped-duplicate`).
- [ ] A malformed payload is caught + logged and never throws out of the request; task creation runs through the normal classify/plan intake (lands in `todo`).
- [ ] Sources are team-scoped (a user only sees/manages their team's) and management is gated by RBAC; the generic JSON contract is documented for custom senders.
- [ ] The deliveries log shows each received event (provider, event, result, created-task link); the Phase 44 outbound webhooks + the generic workflow webhook trigger still work unchanged.
- [ ] `moon run :typecheck` · `moon run :lint` · `moon run :test` green across the graph (gateway service + repository + adapter/signature unit tests; a receiver test asserting verify + dedup + create; web RTL for the Inbound section).

---

## Decisions / open questions

1. **Dedicated surface vs. compose on the workflow webhook** *(settled: dedicated `integrations/inbound/` module).* A purpose-built inbound surface (provider-aware verification + payload mapping + dedup + a "Connect GitHub" UX), separate from the generic workflow-webhook trigger (which stays for arbitrary automation) — mirroring how Phase 44 outbound is separate from Phase 21's notification webhook.
2. **Provider coverage** *(settled: GitHub + Linear + generic).* Both named providers push outbound webhooks into us (no polling needed) plus a documented generic signed-JSON contract. Closes the Linear gap Phase 44 deferred.
3. **Linkback / write-back** *(settled: out of scope for v1).* The created task records the origin URL as a `Source`; midnite does **not** write back to the external system. Commenting the task link onto the source issue (needs a stored API token + write scopes) is a future theme.
4. **Raw body for HMAC** *(recommend: per-route raw body on the receiver).* Signature verification needs the exact bytes the sender signed, so the receiver route must read the raw request body (Fastify `rawBody`/a content-type parser), not the parsed JSON. **This is the main technical risk** — settle the Fastify wiring early in Theme B; a body-parser that re-serializes would break signatures.
5. **Dedup key** *(recommend: `(sourceId, externalId)` persisted, idempotent).* Use the provider's delivery id or item id; a duplicate is a recorded no-op. Prevents double tasks on redelivery.
6. **Mapped-task intake** *(recommend: route through `createFromPrompt`).* The inbound item becomes a normal `todo` task (classified/planned/repo-guessed) rather than a special kind — keeps one task-creation path and one board.
7. **UI placement** *(recommend: a second "Inbound" section on the existing Settings → Integrations page).* Outbound (Phase 44) and Inbound live together as one integrations hub rather than two pages.
8. **Default routing** *(recommend: a per-source default repo/project; richer label/field routing deferred).* Keeps v1 mapping simple; rule-based routing (by label, by repo in the payload) is a future extension.
