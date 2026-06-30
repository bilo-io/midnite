# Phase 42 — Server-Side Preference Sync

> Today every personal preference midnite knows about — the Phase 39 appearance
> set (background, accent, density, motion, font), the theme, the side-nav mode,
> the feature toggles, and the screensaver/cycle timers — lives only in the
> browser's `localStorage`. Open midnite on a second machine (or a fresh profile)
> and you start from defaults; clear site data and your setup is gone. **Phase 42
> floats those preferences up to the gateway, keyed per user**, so a signed-in
> account carries its look-and-feel between devices. It's the natural follow-on
> to Phase 33 (accounts + `/users/me` + JWT auth) and Phase 39 (the prefs
> themselves).

> **Scope guardrails (CLAUDE.md).** Auth is **optional** in midnite — the gateway
> runs single-user/local (no user record, JWT off) *or* multi-user (JWT on). Sync
> therefore engages **only when authenticated**; unauthenticated/local stays
> exactly as it is today (localStorage-only), and `localStorage` remains the cache
> + offline store in both modes. The synced contract lives in **`shared`** (the
> "shared is the contract" rule); the gateway follows the standard
> controller→service→repository layering with a forward-only Drizzle migration; the
> web app consumes the typed client, never gateway internals. No new untyped JSON
> over the wire. This phase does **not** change what any preference *does* — only
> where it's persisted.

> Effort tags: **S** small · **M** medium · **L** large.

---

## Current state (what exists to build on)

- **Accounts + current-user API** — Phase 33 shipped JWT auth (gated on
  `MIDNITE_JWT_SECRET`), the [`users`](../packages/gateway/src/db/schema.ts) table,
  and [`users.controller.ts`](../packages/gateway/src/users/users.controller.ts)
  with `GET /users/me` + `PATCH /users/me` behind the `@CurrentUser()` decorator.
  The natural mount point for preferences.
- **The preferences themselves** — [`packages/web/lib/app-settings.ts`](../packages/web/lib/app-settings.ts)
  defines `AppSettings` (appearance, nav mode, feature flags, inactivity/cycle
  timers) persisted under `localStorage['midnite.settings']`; theme lives under
  `localStorage['midnite.theme']` via [`@midnite/ui` theme-script](../packages/ui/src/theme/theme-script.ts).
  Its own header already calls out that these "will eventually be backed by … a
  user record" — this phase makes that true.
- **Typed API client** — [`packages/shared/src/api.ts`](../packages/shared/src/api.ts)
  `MidniteClient`, the single place web talks to the gateway.
- **No `user_preferences` table, no preferences column** on `users` yet — net-new.

---

## Theme A — Preferences contract in `shared` — **S–M**

The shape both sides agree on, defined once.

- [ ] Add [`packages/shared/src/preferences.ts`](../packages/shared/src/preferences.ts):
      a `UserPreferencesSchema` (zod) covering the **synced subset** — appearance
      (background / accent / density / motion / font), theme, nav mode, feature
      toggles, inactivity + cycle timers — plus a `DEFAULT_USER_PREFERENCES` object
      and `UserPreferences` type. Every field `.optional()` or defaulted so a
      partial/forward-compatible blob still parses.
- [ ] Export from the package index; add request/response schemas
      (`GetPreferencesResponse`, `PutPreferencesRequest` = the full object) so the
      wire contract is typed end-to-end.
- [ ] Refactor [`app-settings.ts`](../packages/web/lib/app-settings.ts) so the
      synced slice **references the shared schema** as the source of truth
      (device-only bits — e.g. the Phase 41 recent-items list — stay web-local and
      are *not* part of `UserPreferencesSchema`). No behavioural change to any
      individual setting.
- [ ] Shared unit tests: schema parses a full + partial blob, defaults round-trip,
      unknown keys are dropped (not rejected).

---

## Theme B — Gateway persistence + API — **M**

Store the blob per user; expose authed read/write.

- [ ] Drizzle schema: a **dedicated `user_preferences` table** — `userId` (PK,
      text), `data` (text/JSON), `updatedAt` (text) — in
      [`db/schema.ts`](../packages/gateway/src/db/schema.ts). Keeps the synced blob
      off the auth-critical `users` row. Forward-only migration under
      [`db/migrations/`](../packages/gateway/src/db/migrations/).
- [ ] `PreferencesRepository` (Drizzle only) — `get(userId)`, `upsert(userId, data, updatedAt)`.
- [ ] `PreferencesService` — owns the merge/validation logic: parse incoming blob
      against `UserPreferencesSchema`, **full-object replace** (the client always
      holds the complete prefs), stamp `updatedAt`, persist. Reads return defaults
      (`DEFAULT_USER_PREFERENCES`) when the user has no row yet.
- [ ] Routes on the existing users controller (or a thin `preferences` module):
      `GET /users/me/preferences` + `PUT /users/me/preferences`, both behind
      `@CurrentUser()` (401 when unauthenticated), body parsed via a
      `ZodValidationPipe` against the shared schema.
- [ ] IDs/UUIDs + transaction boundaries per `CLAUDE.md` (service owns the txn; repo
      takes a `Db`).
- [ ] Tests: `PreferencesService` unit (fakes — defaults-on-empty, replace, bad
      blob → 400), `PreferencesRepository` integration against `:memory:` SQLite,
      controller spec for the authed/unauthed split.

---

## Theme C — Web sync layer — **M**

Hydrate on login, write through on change; degrade to local-only when signed out.

- [ ] A `usePreferenceSync` provider/hook (mounted app-wide, e.g. alongside the
      existing settings/live-data providers): on mount, **if authenticated**, `GET
      /users/me/preferences` and hydrate the local settings store from it (server
      wins on load); **if the server row is empty, seed it from the current
      localStorage** so an existing setup is never lost on first sync.
- [ ] Write-through: when a synced preference changes, debounce a `PUT
      /users/me/preferences` with the full blob (last-write-wins by `updatedAt`).
      Failures are non-fatal — the local store + cache stay authoritative for the
      session; log + retry on next change.
- [ ] When **unauthenticated**, the hook is inert — behaviour is identical to today
      (localStorage-only). `localStorage` remains the cache/fallback in both modes
      (no flash of default theme on load).
- [ ] Settings UI: no shape change; optionally surface a subtle "Synced to your
      account" / "Sign in to sync" affordance in Settings → Appearance.
- [ ] Tests: RTL for the hook in both states (authed → hydrate + write-through;
      anon → inert), and a Playwright e2e (sign in, change a pref, reload → it
      persists from the server; assert the `PUT` fired).

---

## Files this phase touches (map)

- **New:** [`packages/shared/src/preferences.ts`](../packages/shared/src/preferences.ts) — the `UserPreferences` contract + defaults + wire schemas
- **Edit:** [`packages/shared/src/index.ts`](../packages/shared/src/index.ts) — export the new contract
- **Edit:** [`packages/shared/src/api.ts`](../packages/shared/src/api.ts) — `getPreferences` / `putPreferences` client methods
- **New:** `packages/gateway/src/preferences/` — `preferences.repository.ts`, `preferences.service.ts` (+ routes on [`users.controller.ts`](../packages/gateway/src/users/users.controller.ts) or a thin `preferences.controller.ts` / `preferences.module.ts`)
- **Edit:** [`packages/gateway/src/db/schema.ts`](../packages/gateway/src/db/schema.ts) — `user_preferences` table (+ a new forward-only migration under [`db/migrations/`](../packages/gateway/src/db/migrations/))
- **New:** `packages/web/components/preference-sync.tsx` (or a hook under [`packages/web/hooks/`](../packages/web/hooks/)) — the sync provider
- **Edit:** [`packages/web/lib/app-settings.ts`](../packages/web/lib/app-settings.ts) — reference the shared synced-subset schema; keep device-only bits local
- **No change to** what any individual preference controls — only its persistence.

---

## Verification

- [ ] `UserPreferencesSchema` parses full + partial blobs, applies defaults, and drops unknown keys; defaults round-trip.
- [ ] `GET /users/me/preferences` returns defaults for a user with no row, and the stored blob otherwise; both return 401 when unauthenticated.
- [ ] `PUT /users/me/preferences` validates against the shared schema (400 on a bad blob), replaces the full object, and stamps `updatedAt`.
- [ ] Signed in: changing an appearance/theme/nav/feature/timer preference issues a debounced `PUT`; reloading (or opening a second session) restores it from the server.
- [ ] First sync on a device with existing localStorage prefs **seeds** the empty server row (nothing lost); thereafter the server wins on load.
- [ ] Signed out / single-user gateway: behaviour is unchanged (localStorage-only); no failed network calls, no flash of default theme.
- [ ] Recent-items and operational config (agent-pool size, heartbeat) are **not** synced.
- [ ] Package boundaries hold (web imports the contract from `shared`, never gateway internals); the migration is forward-only.
- [ ] `moon run :typecheck` · `moon run :lint` · `moon run :test` green across the graph.

---

## Decisions / open questions

1. **Storage shape** *(settled: dedicated `user_preferences` table).* A `userId`-PK
   table holding a JSON `data` blob + `updatedAt`, rather than a column on `users`
   or normalized key-value rows. Keeps the blob off the auth row, gives clean
   last-write-wins, and is trivial to extend as the synced set grows.
2. **Synced set** *(settled: appearance + theme + nav + features + timers).*
   Personal UI preferences sync. **Recent items stay device-local** (high-churn,
   device-flavoured) and **operational config** (agent-pool size, heartbeat cadence)
   stays gateway/`midnite.json` territory — neither belongs in a per-user prefs blob.
3. **Live cross-device propagation** *(settled: deferred).* v1 is load-on-login +
   debounced write-through; a second open device picks changes up on its next
   load/refresh, not instantly. A `preferences.updated` WS event is a clean future
   stretch (mirrors the existing task/workflow gateways) but isn't needed for the
   core win and would push the phase toward **L**.
4. **First-run seeding / conflict** *(recommended: seed-when-empty, else server wins).*
   On first authenticated load, if the server has no row, seed it from the current
   localStorage so an existing setup survives. If a row exists, the server is the
   source of truth on load (then refreshes the local cache). Last-write-wins by
   `updatedAt` settles concurrent edits across devices.
5. **PUT semantics** *(recommended: full-object replace).* The client always holds
   the complete prefs blob, so a full `PUT` (validated against the shared schema) is
   simpler than a partial-merge `PATCH` and makes LWW unambiguous.
6. **localStorage keys** *(recommended: keep as-is).* `midnite.settings` /
   `midnite.theme` stay as the local cache (no rename) so there's zero migration on
   the client and no theme flash on load.
