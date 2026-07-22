# Phase 82 — Full i18n Coverage Sweep (en-GB + fr-FR)

> **Builds on [Phase 79](phase-79-translations-i18n.md)**, which stood up the whole i18n stack — next-intl in preference-based client mode, [`LocaleSchema`](../packages/shared/src/i18n.ts) in `shared`, the shell [`LocaleProvider`](../packages/shell/src/i18n/locale-provider.tsx), catalogs in [`packages/web/messages/`](../packages/web/messages), the [`i18n-extract`](../scripts/i18n-extract.mjs)/[`i18n-validate`](../scripts/i18n-validate.mjs) scripts, and an ESLint `no-literal-string` gate — but only migrated ~16 files (~39 keys). This phase is the **blanket**: every user-facing string in `packages/web` + `packages/shell` + desktop chrome goes through the gate, in **en-GB (canonical) and fr-FR only**. No new infrastructure concepts — the phase is coverage, plus the tooling changes coverage at this scale demands (gate flip, per-namespace catalog split).

> **Scope guardrails (CLAUDE.md).** `packages/ui` **stays a translation-agnostic leaf** — primitives take display strings via props; where a primitive ships a hardcoded default label, propify it and translate at the web call site (never add next-intl to `ui`). `shell` stays on `{shared, ui}` peers — it consumes messages injected by the host, imports no catalog. **Out of scope:** the `admin` console's own pages (it keeps inheriting shell-chrome translations for free); **Phaser canvas text** in the office scenes (DOM UI only — canvas strings are a documented gap); **de-DE / es-ES authoring** (still deferred from Phase 79 — catalogs stay stub + fallback); URL/segment locale routing; RTL; gateway/CLI-emitted strings; docs/marketing site copy.

> Effort tags: **S** small · **M** medium · **L** large. Natural order: **A** (gate flip + catalog split) runs **first** — it turns the exception list into the phase's live progress meter and stops new files being born unmigrated; **B**–**E** are the sweep, sliceable in any order and in parallel (per-namespace catalogs mean parallel worktrees don't collide); **F** closes out, absorbing Phase 79's outstanding verification. **Every migration item ships its fr-FR keys in the same PR** (meta sidecar `needsReview`), so fr-FR can never drift behind en-GB.

---

## Current state (what exists to build on)

- **Stack is done, coverage isn't** — Phase 79 landed next-intl ^4.3.9 (web dep, shell peer), the pre-paint locale init, the sidenav + Settings switcher, `useLocaleFormat()`, and CI validation. But only **~16 files** call `useTranslations` and the en-GB catalog holds **~39 keys** across 5 namespaces (`common`, `nav`, `auth`, `board`, `settings`).
- **The long tail is big** — ~**585** `.tsx` in `packages/web` (116 in [`app/`](../packages/web/app), 457 in [`components/`](../packages/web/components), 18 in `hooks/`+`lib/`), **10** in [`packages/shell/src`](../packages/shell/src), **38** in [`packages/ui/src`](../packages/ui/src) (props-only — audit, don't translate in place). Feature-area spread in `components/`: office 20 + office3d 13, projects 17, ui 15, memory 14, pr-review 11, assistant 10, header 8, update 8, auth 8, guide 7, slides 4, safety 4, roadmap 3, task-graph 3, nodes 1 — plus ~250 top-level component files (board cards/dialogs, dashboard widgets, council, workflows, search).
- **The gate is an allowlist today** — `I18N_ENFORCED` in [`eslint.config.mjs`](../eslint.config.mjs) lists the migrated files; the other ~550 are unenforced, so new hardcoded strings creep in freely. At blanket scale the list must invert (Theme A).
- **Catalogs are one file per locale** — [`messages/en-GB.json`](../packages/web/messages/en-GB.json) etc. Fine at 39 keys; at 1,000+ keys every parallel migration PR would collide in one file. Split per namespace (Theme A).
- **fr-FR is `complete`, de/es are stubs** — [`messages/meta/`](../packages/web/messages/meta) sidecars mark fr-FR complete (validator enforces its parity with en-GB already); de-DE/es-ES fall back to en-GB and stay that way this phase.
- **Phase 79's Verification checklist (6 items) is still unchecked** — absorbed into Theme F here (user decision), which closes 79 out.

---

## Theme A — Gate flip & catalog machinery — **M**

Invert the enforcement model and restructure the catalogs so the sweep can run wide and in parallel. Runs first.

- [ ] **Split catalogs per namespace** — `messages/<locale>/<namespace>.json` (e.g. `messages/en-GB/board.json`), merged into one message tree at load in [`packages/web/i18n/`](../packages/web/i18n)'s static import map (still static-export-safe — plain `import` per file, no dynamic `require`). Migrate the existing 5 namespaces; meta sidecars become `messages/meta/<locale>/<namespace>.json` (or a keyed single file — keep whichever diff-reviews smaller).
- [ ] **Update the tooling for the split layout** — [`i18n-extract.mjs`](../scripts/i18n-extract.mjs) + [`i18n-validate.mjs`](../scripts/i18n-validate.mjs) walk the per-namespace files; parity/orphan/missing rules unchanged; `moon run web:i18n-validate` inputs updated (remember moon caches on inputs — [importing-untyped-mjs gotcha](importing-untyped-mjs-into-ts-breaks-typecheck.md) if a TS test imports the script).
- [ ] **Flip the ESLint gate to default-on** — replace `I18N_ENFORCED` (allowlist) with `I18N_EXEMPT` (exception list): `i18next/no-literal-string` (`jsx-text-only`) errors on **all** of `packages/web/**/*.tsx` + `packages/shell/src/**/*.tsx` **except** the generated exception list, seeded from today's unmigrated set. New files are born enforced. Each migration PR deletes its files from the list.
- [ ] **fr-FR hard parity in CI** — the validator already fails a `complete` locale missing keys; assert fr-FR stays marked `complete` and add a guard test so nobody "fixes" a red CI by demoting fr-FR to incomplete.
- [ ] **Progress meter** — `i18n-extract` (or the validator) prints the exception-list count + per-namespace key totals, so `/exec` slices and humans can watch the number fall to zero.
- [ ] **Tests** — loader merges namespaces correctly (spot-check a key per namespace per locale); validator units cover the split layout; an ESLint config guard pins the exempt-list mechanism (rule enabled, list bounded, no allowlist resurrection).

## Theme B — Board & tasks — **M**

The core product surface: everything a user reads while running tasks.

- [ ] **Task cards** — status/priority chips, "blocked by N" chip, relative timestamps (via `useLocaleFormat`), card context menus → `board` namespace.
- [ ] **Task detail** — tabs, action buttons (resume/reply/stop/retry), failure panes, session/terminal chrome labels → `board` (or a `task` namespace if it outgrows it).
- [ ] **Dialogs & bulk bar** — create/edit task dialogs, bulk-select bar actions, move/abandon confirms, toasts fired from board flows → `board` + `common`.
- [ ] **fr-FR keys + tests** — every key authored in fr-FR same PR (meta `needsReview`); RTL renders a representative component per group under fr-FR; migrated files leave `I18N_EXEMPT`.

## Theme C — Auth & Settings sweep — **M**

Finishes what Phase 79's Theme D started at the "primary copy" level.

- [ ] **Remaining auth pages** — register, forgot-password, invite/accept flows in [`app/(auth)`](../packages/web/app/(auth)) + [`components/auth/`](../packages/web/components/auth), including zod-driven validation/error strings surfaced in the UI → `auth`.
- [ ] **Every Settings subpage** — the deep field copy Phase 79 deferred: account, appearance internals, integrations, tokens, teams/members, safety/autonomy, data portability, etc. under [`app/(main)/settings/`](../packages/web/app/(main)/settings) → `settings` (sub-namespaced per page if large).
- [ ] **Cross-cutting error/empty states** — shared error boundaries, empty states, retry prompts used by these pages → `common`.
- [ ] **fr-FR keys + tests** — as Theme B's closing item.

## Theme D — Feature areas — **L**

The 457-file bulk. Each bullet is an independently landable slice (own namespace, own PR); parallel worktrees won't collide thanks to Theme A's split catalogs.

- [ ] **Council / assistant** ([`components/assistant/`](../packages/web/components/assistant) + council surfaces) → `assistant`.
- [ ] **Workflows** (editor, runs, triggers, template marketplace surfaces) → `workflows`.
- [ ] **Memory workspace** ([`components/memory/`](../packages/web/components/memory)) → `memory`.
- [ ] **Projects** ([`components/projects/`](../packages/web/components/projects) + detail page) → `projects`.
- [ ] **PR review / diff** ([`components/pr-review/`](../packages/web/components/pr-review)) → `prReview`.
- [ ] **Search + command palette** (global search UI, palette actions/labels) → `search`.
- [ ] **Dashboard widgets** (clock/date/calendar/digest/finances/market + widget chrome) → `dashboard`.
- [ ] **Guide / onboarding** ([`components/guide/`](../packages/web/components/guide)) → `guide`.
- [ ] **Roadmap, task-graph, slides, safety** (smaller clusters, one slice) → `roadmap` / `slides` / `safety`.
- [ ] **Ideas / chat-to-board / remaining top-level components** — the residue after the named areas; drain `I18N_EXEMPT` to zero for `packages/web`.
- [ ] **fr-FR keys + tests per slice** — same-PR French + a representative fr-FR RTL render per area.

## Theme E — Chrome, desktop & office DOM — **M**

The frame around the app, plus the office's React layer.

- [ ] **Header & shell residue** ([`components/header/`](../packages/web/components/header), any `packages/shell` strings not covered by Phase 79's `nav` pass) → `nav` / `common`.
- [ ] **Update banners + lock screen** ([`components/update/`](../packages/web/components/update); the shell `<LockScreen>` strings via injected labels, keeping shell catalog-free) → `common`.
- [ ] **Desktop title bar & window chrome residue** — remaining Phase 81 strings (menu labels, tray tooltips where web-rendered) → `nav`.
- [ ] **Office DOM UI** ([`components/office/`](../packages/web/components/office) + [`office3d/`](../packages/web/components/office3d) React panels/menus/tooltips) → `office`. **Phaser canvas text stays English** — add a short "known gap" note in `messages/README.md`.
- [ ] **`packages/ui` default-label audit** — grep the 38 primitives for hardcoded user-facing defaults; propify each (default moves to the web call site as a `t()` value); `ui` boundary test untouched.
- [ ] **fr-FR keys + tests** — as above.

## Theme F — Close-out & Phase 79 absorption — **S**

- [ ] **Absorb Phase 79's verification** — run its 6 unchecked checks (switcher both entry points, fallback behaviour, static export, gate + parity CI, locale formatting, boundary tests) as part of this phase's verification below; tick them there with a pointer here, and mark Phase 79 closed in [`_INDEX.md`](_INDEX.md).
- [ ] **Full fr-FR walkthrough** — flip to fr-FR and click through every major surface (board, task detail, settings, auth, each Theme D area, office DOM); screenshot set for the record; fix stragglers (watch the [e2e login-redirect gotcha](e2e-screenshots-blocked-by-login-redirect.md)).
- [ ] **Exception list at (or near) zero** — `I18N_EXEMPT` empty for `web`/`shell`, or every remaining entry annotated with why (e.g. dev-only pages); progress meter reads 100%.

---

## Files this phase touches

| Area | Files |
|------|-------|
| catalogs | [`packages/web/messages/`](../packages/web/messages) → restructured `messages/<locale>/<namespace>.json` + per-namespace meta; en-GB + fr-FR authored, de/es stubs carried along |
| i18n runtime | [`packages/web/i18n/`](../packages/web/i18n) (static import map merges namespaces) |
| tooling | [`scripts/i18n-extract.mjs`](../scripts/i18n-extract.mjs), [`scripts/i18n-validate.mjs`](../scripts/i18n-validate.mjs) (split layout + progress meter); [`eslint.config.mjs`](../eslint.config.mjs) (`I18N_ENFORCED` → `I18N_EXEMPT` flip); [`packages/web/moon.yml`](../packages/web/moon.yml) (task inputs) |
| web · sweep | ~550 `.tsx` across [`app/`](../packages/web/app) + [`components/`](../packages/web/components) (Themes B–E), migrated slice-by-slice |
| shell | residual strings via injected labels (stays catalog-free, `{shared, ui}` peers only) |
| ui | propified default labels (audit only — no i18n dep) |
| docs | [`packages/web/messages/README.md`](../packages/web/messages/README.md) (split layout, exempt-list workflow, Phaser gap note) |
| tests | loader/validator/gate-guard units (Theme A); per-slice fr-FR RTL renders; boundary tests unchanged |

---

## Verification

- [ ] **Gate is default-on:** a brand-new `.tsx` with a hardcoded JSX string fails `moon run :lint` without any config edit; files in `I18N_EXEMPT` are the only exceptions and the list only shrinks in the phase's PRs.
- [ ] **fr-FR parity is enforced:** `moon run web:i18n-validate` fails when any en-GB key lacks a fr-FR entry; fr-FR remains marked `complete`; de-DE/es-ES still fall back to en-GB without warnings.
- [ ] **Full walkthrough in fr-FR:** every major surface renders French (board, task detail, dialogs, auth, all settings subpages, each feature area, chrome, office DOM UI) — no raw keys, no stray English outside documented gaps.
- [ ] **Static export still builds** with the split catalogs (`MIDNITE_WEB_TARGET` unset → `output: 'export'`) — verified, not assumed ([known silent-break risk](web-static-export-not-in-ci-can-break-main.md)).
- [ ] **Phase 79's absorbed checks pass** (switcher, fallback chain, formatting under fr-FR vs en-GB) and Phase 79 is marked closed in the index.
- [ ] `moon run :typecheck && :lint && :test` green; `ui`/`shell`/`admin` boundary tests untouched and passing.

---

## Decisions / open questions

1. **Direction** → **Resolved (user): full web-app blanket**, not a journeys-only sweep — everything in `web` + `shell` + desktop chrome goes through the gate this phase.
2. **Admin console** → **Resolved (user): out of scope.** Admin keeps inheriting shell-chrome translations; its own 32 `.tsx` stay English (cheap later extension).
3. **Office depth** → **Resolved (user): DOM UI only.** Phaser canvas text stays English as a documented gap — piping locale into scenes is fiddly, lint-invisible plumbing that isn't worth this phase's risk budget.
4. **Gate strategy** → **Resolved (user): flip first, then shrink.** Theme A inverts the allowlist to a generated exception list before the sweep starts; the list is the live progress meter and new files are born enforced.
5. **fr-FR authoring flow** → **Resolved (user): French in every PR.** Each slice ships en-GB keys + Claude-authored fr-FR (meta `needsReview`) together; CI blocks drift. No end-of-phase translation crunch.
6. **Catalog shape** → **Resolved (user): split per namespace** (`messages/<locale>/<namespace>.json`, merged at load) — small diffs, no merge hotspot for parallel `/exec` slices.
7. **Phase 79 leftovers** → **Resolved (user): absorb.** 79's unchecked verification runs inside Theme F / this phase's Verification; de/es MT-seed stays deferred untouched.
8. **Namespace granularity for Theme D** → **Recommendation:** one namespace per feature area (as listed), sub-namespace only when a file exceeds ~150 keys — keeps `useTranslations('workflows')` call sites obvious without a taxonomy debate per PR. *(Settle per-slice during implementation.)*
9. **String-heavy non-JSX code** (toast messages, zod error maps, aria-labels built in `lib/`) → **Recommendation:** in scope where user-visible — the `jsx-text-only` lint mode won't catch them, so Theme F's fr-FR walkthrough is the backstop; don't widen the lint mode this phase (attribute/expression linting is noisy).
