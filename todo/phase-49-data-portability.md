# Phase 49 — Data Portability (backup, restore, portable archives)

> midnite can **export a single entity** — a task, a project, a council run — as Markdown/PDF
> (Phase 18). What it can't do is get your **whole store** out, or back in. Phase 49 adds
> **full-fidelity backup & restore**: snapshot every portable domain (tasks, projects, workflows,
> councils, memories, notes, routines, ideas, media, teams, users…) into a single portable
> **archive**, and **restore** it — onto the same instance (disaster recovery) or a fresh one
> (migration). Secrets are **excluded by default** and opt-in re-encrypted under a passphrase.
> This makes midnite a system you can back up, move, and get out of — table stakes for anything
> holding real work. Import is **greenfield**; the per-entity export seam stays as-is.

> **Scope guardrails (CLAUDE.md).** New gateway feature module `portability/` following
> **controller → service → repository** (a read-across-domains *orchestrator* service, composing
> existing domain **services**, never reaching into other modules' repositories). Every archive
> contract — the manifest, each per-domain payload envelope — is a **zod schema in
> [`shared`](../packages/shared/src/)**; the archive is versioned and validated on both ends,
> never untyped JSON. Restore is **atomic**: one `db.transaction()` in a dedicated restore
> repository, inserts ordered by app-layer references (no hard cross-domain FKs exist, so order +
> validation are enforced in the service). Secrets ride the existing
> [`CryptoService`](../packages/gateway/src/crypto/crypto.service.ts) (AES-256-GCM,
> per-instance `MIDNITE_SECRET_KEY`) — because the key is **per-instance**, raw encrypted blobs
> **cannot** move across instances, so any exported secret is re-wrapped under a passphrase-derived
> key. Export/import are **admin-gated** (Phase 35 RBAC). Forward-only Drizzle migrations. Web +
> CLI stay pure clients of the gateway over the typed API client.

> Effort tags: **S** small · **M** medium · **L** large. **A** (archive contract + version stamp)
> is the foundation; **B** (bulk export) gets data *out*; **C** (atomic import) is the hard,
> greenfield heart; **D**/**E** are the CLI + web surfaces; **F** (scheduled auto-backup) is the
> operational payoff. A→B→C is the critical path (C depends on B's format); D/E/F build on the
> B/C endpoints.

---

## Current state (what exists to build on)

- **Per-entity export (Phase 18)** — domain modules own `…/export` routes + pure serializers
  ([`tasks/lib/task-report.ts`](../packages/gateway/src/tasks/lib/task-report.ts),
  `projects/lib/project-report.ts`, `councils/lib/council-report.ts`); shared contract in
  [`shared/src/report.ts`](../packages/shared/src/report.ts) (`REPORT_FORMATS = ['md','pdf']`).
  **Markdown/PDF only — no structured bulk export, no import.** This phase does **not** touch it.
- **The full store** — [`db/schema.ts`](../packages/gateway/src/db/schema.ts) has ~48 tables.
  **Portable** (user data): `tasks` (+ `task_events`/`task_attachments`/`task_links`/
  `task_dependencies`/`task_check_runs`), `projects` (+ `project_sources`), `repos`, `memories`
  (+ `memory_sources`), `workflows` (+ `workflow_runs`/`node_runs`/`workflow_storage`/
  `workflow_templates`), `councils` (+ members/runs), `llm_settings`/`llm_usage`, `users`
  (+ `user_preferences`), `teams` (+ `team_memberships`), `notifications`, `notes`, `routines`
  (+ groups/items/progress), `media`, `ideas` (+ `idea_messages`), `approvals` (+ rules/settings/log),
  `primary_agent`/`subagents`/`heartbeat_runs`, `audit_log`. **Secret-bearing** (special handling):
  `workflow_credentials.data`, `webhooks.secret`, `llm_providers.apiKey` (encrypted);
  `users.passwordHash` (bcrypt), `refresh_tokens`/`service_tokens`/`hook_secrets` (session/hashes),
  `team_invites.token`. **Derived/volatile** (skip + rebuild): `search_index` (FTS5), `pr_status`,
  `market_cache`.
- **CryptoService** — [`crypto/crypto.service.ts`](../packages/gateway/src/crypto/crypto.service.ts):
  AES-256-GCM, `v1:<base64(iv|tag|ct)>`, key from `MIDNITE_SECRET_KEY`, **per-instance**, fail-closed.
  Encrypted blobs are **not** portable as-is — they must be decrypted then re-encrypted under the
  export passphrase (and again under the target key on import).
- **Atomic multi-table writes** — the `db.transaction((tx) => { … })` pattern
  ([`projects.repository.ts`](../packages/gateway/src/projects/projects.repository.ts) `deleteProject`
  is the template): pass `tx` in place of `this.db`; all statements commit atomically. Restore uses
  **one** such transaction.
- **CLI client seam** — [`cli/src/client.ts`](../packages/cli/src/client.ts) `GatewayClient` interface
  + thin commander commands in [`cli/src/index.ts`](../packages/cli/src/index.ts) (`task export <id>`
  is the pattern: spinner → typed client → stdout/`--output`).
- **Migration journal** — [`drizzle/meta/_journal.json`](../packages/gateway/drizzle/meta/_journal.json)
  (highest idx = current schema shape, idx 60 as of Phase 44); migrations applied on boot in
  [`db/db.module.ts`](../packages/gateway/src/db/db.module.ts). **No runtime "schema version" query
  exists** — Theme A adds one.
- **Config** — [`shared/src/config/`](../packages/shared/src/config/) zod schema + `loadConfig()`;
  every consumer takes `MidniteConfig`. Auto-backup settings extend this schema.

---

## Theme A — Archive contract + schema-version stamp — **S-M** — ✅ DONE (PR #282, 2026-07-03)

Define the portable archive once, and give import something to validate against.

- [x] **shared:** [`shared/src/portability.ts`](../packages/shared/src/portability.ts) — `ArchiveManifestSchema`
      (`schemaVersion`/`appVersion`/`createdAt`/`domains`/`secretsMode` `excluded`|`passphrase`), a
      `domainPayloadSchema<T>()` envelope factory (per-domain records validated on both ends),
      `ExportOptionsSchema` (`includeSecrets`, `passphrase?`), `ImportPreviewSchema` (per-domain counts +
      conflicts + `compat` verdict + `importable`), `ImportOptionsSchema` (`mode: 'replace'|'merge'`, `dryRun`,
      `passphrase?`), plus a **pure `compareSchemaVersion`** (`ok`/`older-archive`/`newer-archive`) +
      `isImportable`. Re-exported from `index.ts`.
- [x] **gateway:** a runtime **schema version** — a `schema_meta` singleton table stamped on boot (in
      `DbFactory`, after `migrate`) to the drizzle journal's highest applied migration idx via
      `db/schema-version.ts` (`readJournalVersion`/`stampSchemaVersion`/`getSchemaVersion`), fail-soft (`-1`
      when the journal is unreadable). Migration `0066_schema_meta`. **Internal helper only** — Theme B/C's
      export/import consume it (no public endpoint this slice, per Stage-2.5).
- [x] **Container (decided):** a **zip** with `manifest.json` at the root + one JSON file per domain
      (`domains/tasks.json`, `domains/workflows.json`, …) — inspectable, streamable. Documented in the
      `portability.ts` header; B produces it, C reads it.

---

## Theme B — Bulk export service — **M-L**

Get the whole store out, as a portable archive.

- [ ] `portability/portability.module.ts` + `portability.service.ts` — a read-across orchestrator
      that pulls each **portable** domain via its existing service/repository (read-only; no domain
      code changes), assembles the archive, and stamps the manifest (schema version, app version,
      timestamp, included domains, secrets mode). **Derived/volatile tables are skipped** (rebuilt on
      import). Explicit `@Inject` tokens (gateway runs under `tsx`).
- [ ] `portability.controller.ts` — `GET /portability/export` (`RequiresRole('admin')`), **streams**
      the archive (never buffers the whole store in memory). `ExportOptions` from query/body.
- [ ] **Secrets, opt-in:** default **excludes** all secret-bearing columns (integrations export
      disabled-pending-config). With `includeSecrets` + a `passphrase`, decrypt each secret via
      `CryptoService` and **re-encrypt under a scrypt-derived key** from the passphrase, written into
      the archive as `v1p:<…>` (a distinct, passphrase-wrapped marker). The passphrase is never stored.

---

## Theme C — Atomic import service — **L**

The greenfield heart: restore an archive safely, all-or-nothing.

- [ ] **Version gate:** parse the manifest, compare `schemaVersion` to the running instance's:
      **equal** → restore directly; **archive older** → offer *migrate-then-restore* (apply pending
      migrations first); **archive newer** → **refuse** (can't downgrade schema). Malformed/oversized
      archives rejected up front.
- [ ] **Dry-run preview:** `POST /portability/import/preview` (`ImportPreview`) — per-domain counts,
      id conflicts against existing data, secret-mode + passphrase check, version verdict — **without
      writing**. The web + CLI show this before any commit.
- [ ] **Atomic restore:** `POST /portability/import` (`RequiresRole('admin')`) — validate app-layer
      referential integrity, then a **single `db.transaction()`** inserting in dependency order
      (`users` → `teams` → `team_memberships` → `user_preferences` → `repos` → `projects` → `tasks` →
      `task_events`/links/deps → `workflows` → runs → `councils` → … → `ideas`/`media`/`notes`/
      `routines`/`approvals`). **`mode: 'replace'`** (wipe-then-restore — the primary backup/restore
      path); `merge` (upsert, skip existing ids) is a secondary mode.
- [ ] **Post-restore:** rebuild the FTS5 index via the existing `POST /search/reindex` path (the
      `search_index` is **not** carried in the archive). Secrets: if the archive carries
      passphrase-wrapped secrets and a passphrase is supplied, decrypt + **re-encrypt under the target
      instance's key**; otherwise integrations import disabled until reconfigured.
- [ ] **Users & sessions:** restore `users` **including `passwordHash`** (bcrypt is instance-independent,
      so logins survive a move); **skip** `refresh_tokens`/`hook_secrets`/`service_tokens` (session/
      per-instance — re-login / re-issue).

---

## Theme D — CLI export/import commands — **S-M**

Backup/restore from a shell — the natural home for scripting + cron.

- [ ] Extend `GatewayClient` ([`cli/src/client.ts`](../packages/cli/src/client.ts)) with
      `exportArchive(opts)` (streams to a file) + `importArchive(file, opts)` / `previewImport(file, opts)`.
- [ ] `midnite export` — `--output <file>` (default timestamped name), `--include-secrets`,
      `--passphrase <p>`; writes the archive, prints a per-domain summary (respects global `--json`).
- [ ] `midnite import <file>` — `--mode replace|merge`, `--dry-run` (prints the preview and exits),
      `--passphrase <p>`, `--yes` (skip the destructive-restore confirm). A **replace** without
      `--yes` requires interactive confirmation.

---

## Theme E — Web Settings → Data page — **M**

Point-and-click backup/restore with a safety net.

- [ ] A **Settings → Data** page (admin-gated): **Download backup** (a secrets toggle → passphrase
      prompt when enabled) hitting `GET /portability/export`; a per-domain summary of what's included.
- [ ] **Restore**: upload an archive → **dry-run preview** (per-domain counts, conflicts, version
      verdict, replace-vs-merge choice, passphrase field when the archive carries secrets) → an explicit
      **confirm** for `replace` → progress feedback → success/failure summary. Typed client methods in
      [`web/lib/api.ts`](../packages/web/lib/api.ts).

---

## Theme F — Scheduled auto-backup — **M**

Backups that happen without anyone remembering to run them.

- [ ] Extend the [`config`](../packages/shared/src/config/) zod schema with an optional `backup`
      block (`enabled`, `intervalHours`, `destinationDir`, `retention` count, `includeSecrets` +
      `passphrase` source). Documented in the README + `midnite.json` schema.
- [ ] A scheduled job (on the gateway scheduler / recurring-task seam) writes a **timestamped archive**
      to `destinationDir` on the interval, then **prunes** to the retention count. Failures are logged
      (`warn`) and surfaced as a notification — never crash the tick.
- [ ] The Data page shows the auto-backup status (last run, next run, recent archives) when configured.

---

## Files this phase touches (map)

- **New (shared):** [`shared/src/portability.ts`](../packages/shared/src/) — manifest, per-domain
  payload envelope, export/import options, preview schemas; backup block added to
  [`config`](../packages/shared/src/config/); re-export from [`index.ts`](../packages/shared/src/index.ts);
  client methods in [`web/lib/api.ts`](../packages/web/lib/api.ts) + [`cli/src/client.ts`](../packages/cli/src/client.ts)
- **New (gateway):** `gateway/src/portability/` — `portability.module.ts`, `portability.controller.ts`,
  `portability.service.ts` (export orchestration), `import.service.ts` (validate + version-gate + preview),
  `portability.repository.ts` (the single-transaction restore), `lib/archive.ts` (zip pack/unpack),
  `lib/passphrase-crypto.ts` (scrypt-derived re-wrap)
- **New (gateway):** `schema_meta` singleton table in [`db/schema.ts`](../packages/gateway/src/db/schema.ts)
  + a forward-only [`drizzle/`](../packages/gateway/drizzle/) migration; version read wired in
  [`db/db.module.ts`](../packages/gateway/src/db/db.module.ts)
- **Edit (gateway):** register `PortabilityModule` in [`app.module.ts`](../packages/gateway/src/app.module.ts);
  the auto-backup job on the scheduler seam
- **New (cli):** `midnite export` / `midnite import` commands in [`cli/src/index.ts`](../packages/cli/src/index.ts)
- **New (web):** a Settings → Data page under [`app/(main)/settings/`](../packages/web/app/(main)/settings/)
  + an upload/preview/restore flow component
- **Reuse:** `CryptoService`, the existing domain services (read), `db.transaction`, `POST /search/reindex`,
  RBAC guards, `loadConfig` — no changes to their contracts.

---

## Verification

- [ ] `GET /portability/export` (admin) streams a valid archive: a `manifest.json` (schema version,
      app version, timestamp, domains, `secretsMode`) + one JSON payload per portable domain; derived
      tables (`search_index`, `pr_status`, `market_cache`) are **absent**.
- [ ] **Round-trip on a fresh instance:** export from instance A, `import --mode replace` into an empty
      instance B → tasks, projects, workflows, councils, memories, notes, routines, ideas, media, teams,
      users all match A; the board, workflow editor, and search (after reindex) work; **users can log in**
      (bcrypt hashes restored).
- [ ] **Secrets default-excluded:** a default export contains **no** decryptable credential/webhook/API-key
      material; integrations import disabled-pending-config. With `--include-secrets --passphrase`, a
      matching-passphrase import restores them re-encrypted under B's key; a **wrong passphrase** fails
      cleanly (no partial write).
- [ ] **Version gate:** an archive from a **newer** schema is **refused**; an **older** archive offers
      migrate-then-restore; an **equal** archive restores directly. A malformed/truncated archive is rejected.
- [ ] **Atomicity:** a mid-restore failure (bad ref, constraint) rolls back the **entire** transaction —
      the instance is left untouched, never half-restored.
- [ ] **Dry-run** preview (web + CLI `--dry-run`) reports per-domain counts, id conflicts, and the version
      verdict **without writing**; a `replace` restore requires explicit confirmation (`--yes` / a UI confirm).
- [ ] **Scheduled auto-backup** (when configured) writes timestamped archives to `destinationDir` on the
      interval and prunes to the retention count; a failure logs + notifies, never crashes the tick.
- [ ] `moon run :typecheck` · `moon run :lint` · `moon run :test` green (shared schema units; gateway
      export/import service tests incl. version gate + atomic rollback + secret re-wrap on `:memory:` DBs;
      a round-trip integration test; CLI snapshot; web RTL for the Data page).

---

## Decisions / open questions

1. **Goal: backup & restore (not selective/cherry-pick)** *(settled).* A full-store, full-fidelity
   snapshot for disaster recovery + migration. Cherry-picking individual entities across instances is a
   future extension.
2. **Secrets excluded by default, opt-in passphrase re-encryption** *(settled).* Default export carries no
   decryptable secrets. `--include-secrets` + a passphrase re-wraps them under a scrypt-derived key
   (decrypt with the instance key → re-encrypt with the passphrase key), reversed on import. The passphrase
   is never persisted; a wrong passphrase fails the whole import.
3. **Archive = zip (manifest + per-domain JSON)** *(recommend).* A single inspectable, streamable container:
   `manifest.json` + `domains/<domain>.json`. Streamed on export, parsed lazily on import.
4. **Schema version via a `schema_meta` singleton** *(recommend).* The journal is a build artifact; a
   singleton row set on boot to the journal's max idx gives a reliable **runtime** version for the manifest +
   import gate. Refuse newer-than-us; offer migrate-then-restore for older.
5. **Replace is the primary import mode; merge is secondary** *(settled).* `replace` (wipe-then-restore)
   matches the backup/restore goal; `merge` (upsert, skip existing ids) is offered but secondary — a full
   merge-conflict resolution UI is out of scope.
6. **Users restore with `passwordHash`; sessions do not** *(recommend).* bcrypt hashes are instance-independent,
   so restoring them preserves logins across a move; `refresh_tokens`/`hook_secrets`/`service_tokens` are
   session/per-instance and are re-issued, not restored.
7. **Derived data rebuilt, not carried** *(recommend).* `search_index` is rebuilt via `POST /search/reindex`
   after restore; caches (`pr_status`, `market_cache`) are skipped and repopulate naturally.
8. **All four surfaces this phase** *(settled).* Gateway API (foundation) + CLI + web Data page +
   scheduled auto-backup all land. Cloud storage destinations (S3/GCS) and incremental/differential backups
   are **out of scope** — this phase targets a local/configured destination and full snapshots.
9. **Admin-gated** *(recommend).* Export and import both require instance/team-admin (Phase 35 RBAC) — a
   full-store archive is sensitive even without secrets.
