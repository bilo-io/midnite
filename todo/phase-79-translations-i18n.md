# Phase 79 — Translations & Internationalization (i18n)

> Greenfield **i18n for `packages/web`** — the app has **zero** localization infrastructure today (every string is hardcoded JSX; the only locale reference is an incidental `Intl.NumberFormat('en-GB')` for currency). This phase adopts **[next-intl](https://next-intl.dev)** in **preference-based client mode**: the active locale comes from the **Phase 43 synced user preference** ([`UserPreferencesSchema`](../packages/shared/src/preferences.ts)), driven through `NextIntlClientProvider`, **not** middleware/URL-segment routing. That's a deliberate fit for this app — `web` defaults to **Next static export** (`output: 'export'`, gated by `MIDNITE_WEB_TARGET` in [`lib/web-target.mjs`](../packages/web/lib/web-target.mjs)) for the desktop bundle + GitHub Pages, so **there is no server and no `middleware.ts`** to run `/de-DE/…` routing. Locales: **en-GB (canonical), de-DE, fr-FR, es-ES**.

> **Scope guardrails (CLAUDE.md).** The **`Locale` type + the prefs `locale` field are the contract → they live in [`@midnite/shared`](../packages/shared/src/preferences.ts)**; the next-intl **message catalogs are web-UI copy coupled to next-intl → they live in `packages/web/messages/`** (never in `shared`). The locale **provider** mounts in the shared [`shell-providers.tsx`](../packages/shell/src/providers/shell-providers.tsx) (so `admin` inherits it cheaply), alongside the existing Phase 39/68 appearance runtime — `shell` may depend on `{shared, ui}` only, and `next-intl`/`react` stay peers, so the boundary test still passes. **Not** a full externalization of all ~560 web `.tsx` files: this phase stands up the stack, fully translates the **high-traffic surfaces**, seeds all four locales, and adds an **ESLint gate** so the long tail converts incrementally without regressions. **Out of scope:** URL/segment locale routing (`/de-DE/…`); RTL languages; gateway/CLI-emitted strings (emails, webhook payloads, CLI output); translating the `admin` console beyond what it inherits free from the shell provider; translating docs/marketing site copy.

> Effort tags: **S** small · **M** medium · **L** large. Natural order: **A** (shared contract) then **B** (runtime + provider) are the foundation; **C** (the switcher — sidenav + Settings) makes it user-driven; **D** (priority-surface translation) is the bulk of the visible payoff; **E** (seed + tooling + lint gate) makes the four locales real and stops regressions; **F** (locale-aware formatting) completes the "feels localized" story. A+B+C is "you can switch language and the chrome follows"; +D+E+F is "the app is genuinely localized and stays that way".

---

## Current state (what exists to build on)

- **No i18n anywhere** — confirmed greenfield: no `next-intl`/`react-intl`/`i18next`/`@formatjs`/`lingui` in any `package.json`, no `messages/`/`locales/` dirs, no `middleware.ts`, no `app/[locale]` tree. The web app tree is `app/(main)`, `app/(auth)`, `app/auth`, `app/api`. ~**116** `.tsx` in [`packages/web/app`](../packages/web/app) + ~**448** in [`packages/web/components`](../packages/web/components) — all strings inline.
- **Static export is the default build** — [`packages/web/next.config.mjs`](../packages/web/next.config.mjs) reads `output` from `resolveWebOutput()` in [`lib/web-target.mjs`](../packages/web/lib/web-target.mjs): unset/`static` → `output: 'export'` (desktop + GH Pages); `MIDNITE_WEB_TARGET=server` → default server mode (only used for the `/api/auth/*` SSO BFF route handlers). **No middleware in either mode.** ⟹ i18n **must be client/provider-based**, not middleware locale routing.
- **Preferences contract (Phase 43)** — [`packages/shared/src/preferences.ts`](../packages/shared/src/preferences.ts): `UserPreferencesSchema` (`theme`, `navMode`, `accent`, `density`, `motion`, `uiFont`, `effects`, …) + `DEFAULT_USER_PREFERENCES` + wire schemas (`PutPreferencesRequestSchema`, `PreferencesResponseSchema`). **No `locale` field today** — this is exactly where `LocaleSchema` + `locale` are added. Web reads/writes via `getPreferences()`/`putPreferences()` in [`lib/api.ts`](../packages/web/lib/api.ts); sync + 800ms debounce in [`preference-sync.tsx`](../packages/web/components/preference-sync.tsx) (has a hand-written `prefsKey()` field list — `locale` must be added there); local mirror + `applyPreferences` mapping in [`lib/app-settings.ts`](../packages/web/lib/app-settings.ts).
- **Shared shell + appearance runtime** — [`packages/shell/src/providers/shell-providers.tsx`](../packages/shell/src/providers/shell-providers.tsx) is the frame-level provider stack (`ThemeProvider` + `QueryClientProvider`) — the natural slot for a `LocaleProvider`. The Phase 39/68 appearance runtime lives in [`packages/shell/src/appearance/`](../packages/shell/src/appearance/) and exports `appearanceInitScript` (a **pre-paint head script** used by both [`web/app/layout.tsx`](../packages/web/app/layout.tsx) and [`admin/app/layout.tsx`](../packages/admin/app/layout.tsx)) — the exact pattern a locale-init script follows to avoid a flash-of-wrong-language. *(Note: web's `app/layout.tsx` composes its own `ThemeProvider`/`AuthProvider` today and doesn't route through `ShellProviders`; the provider must be threaded so both web and admin pick it up — see Decision 5.)*
- **The sidenav rail + footer cluster** — [`packages/shell/src/app-frame.tsx`](../packages/shell/src/app-frame.tsx) `<AppFrame>` renders a **`footer` slot** documented as the "presence/**theme**/settings/lock/connection" cluster. Web builds that cluster's contents in [`components/app-shell-client.tsx`](../packages/web/components/app-shell-client.tsx) / [`lib/nav-config.tsx`](../packages/web/lib/nav-config.tsx). **The Settings entry lives here — so the language switcher slots into the footer cluster just above Settings**, mirroring how the theme switcher used to sit there (user request).
- **Settings → Appearance** — [`packages/web/app/(main)/settings/appearance-section.tsx`](../packages/web/app/(main)/settings/appearance-section.tsx) already hosts theme toggle, accent builder, background, density, motion, UI font, effects, PWA install — a **language picker** slots in alongside; sidebar in [`settings-sidebar.tsx`](../packages/web/app/(main)/settings/settings-sidebar.tsx).
- **Hardcoded currency to fix** — [`packages/web/components/finances-widget.tsx`](../packages/web/components/finances-widget.tsx) uses `Intl.NumberFormat('en-GB', …)`; it should follow the active locale (Theme F).
- **Admin** — [`packages/admin`](../packages/admin) (~11 `.tsx`) mounts the shell appearance runtime and shares `SETTINGS_STORAGE_KEY`; a deliberately minimal English-only ops console. It **inherits** the shell locale provider for free but is **not** a primary translation target this phase.

---

## Theme A — Locale contract in `shared` — **S**

The single source of truth for "which languages exist" + the synced preference field.

- [ ] **`LocaleSchema` + `Locale` type** in a new [`packages/shared/src/i18n.ts`](../packages/shared/src/i18n.ts) (exported from the package index): `z.enum(['en-GB', 'de-DE', 'fr-FR', 'es-ES'])`, a `DEFAULT_LOCALE = 'en-GB'`, and a `SUPPORTED_LOCALES` list with display metadata (`{ code, label, nativeLabel }`) the switcher renders.
- [ ] **`locale` field on `UserPreferencesSchema`** ([`preferences.ts`](../packages/shared/src/preferences.ts)) — `locale: LocaleSchema.default(DEFAULT_LOCALE)`; add to `DEFAULT_USER_PREFERENCES`. Ensure legacy rows (no `locale`) hydrate to the default (the schema `.default()` covers this — mirror the [read-coercion pattern](removing-persisted-union-member-needs-read-coercion.md) so an old stored prefs blob parses).
- [ ] **Wire `locale` through the web sync path** — add it to the `prefsKey()` serializer in [`preference-sync.tsx`](../packages/web/components/preference-sync.tsx) and the `AppSettings`↔prefs mapping in [`lib/app-settings.ts`](../packages/web/lib/app-settings.ts) so a change round-trips to the gateway like `theme`/`accent` do.
- [ ] **Tests** ([`shared:test`](../packages/shared)) — `LocaleSchema` accepts the four codes + rejects others; `UserPreferencesSchema` defaults `locale` to `en-GB`; a legacy prefs object with no `locale` parses to the default (regression against dropping the field).

## Theme B — next-intl runtime + shell provider — **M**

Stand up next-intl in client/provider mode and mount it once for both apps — no middleware, no route segments.

- [ ] **Add `next-intl`** to `packages/web` (and as a **peer** where `shell` references its provider types); create [`packages/web/i18n/`](../packages/web/i18n) config that loads the message catalog for a given `Locale` (static `import` map over `web/messages/*.json`, so it bundles cleanly under static export — no request-time `getRequestConfig`).
- [ ] **Message catalogs** — [`packages/web/messages/en-GB.json`](../packages/web/messages) (canonical) + `de-DE.json` / `fr-FR.json` / `es-ES.json`, namespaced by surface (`nav`, `settings`, `board`, `auth`, `common`). en-GB authored by hand; the other three seeded in Theme E.
- [ ] **`LocaleProvider` + `NextIntlClientProvider`** added to [`shell-providers.tsx`](../packages/shell/src/providers/shell-providers.tsx) (messages + resolved locale injected by the host so `shell` imports no catalog and stays on `{shared, ui}` — boundary test unaffected).
- [ ] **Pre-paint locale init (no flash)** — a small head script mirroring `appearanceInitScript` that resolves the initial locale **pref → `navigator.language` mapped to nearest supported → `en-GB`**, sets `<html lang>` and a data attribute the provider reads on mount; used in both [`web/app/layout.tsx`](../packages/web/app/layout.tsx) and [`admin/app/layout.tsx`](../packages/admin/app/layout.tsx).
- [ ] **Static-export sanity** — confirm `MIDNITE_WEB_TARGET` unset (`output: 'export'`) still builds and runs with the provider (no server-only next-intl APIs; catalogs statically imported). This is the risky bit — verify explicitly ([`web-static-export-not-in-ci-can-break-main`](web-static-export-not-in-ci-can-break-main.md)).
- [ ] **Tests** — locale resolver picks pref, else nearest browser locale, else `en-GB`; `NextIntlClientProvider` renders a `t()` string per locale; unknown/missing key falls back to en-GB (not a crash).

## Theme C — Language switcher: sidenav footer + Settings — **S**

Two entry points, one behaviour — set the pref, everything re-renders.

- [ ] **Sidenav footer switcher** — a compact language control in the `<AppFrame>` **footer cluster just above Settings**, built in [`app-shell-client.tsx`](../packages/web/components/app-shell-client.tsx) / [`lib/nav-config.tsx`](../packages/web/lib/nav-config.tsx), **mirroring how the theme switcher used to sit in the rail** (user request): collapsed = a globe/flag icon button opening a small popover (portal to body, per [repo convention](web-overflow-menus-use-portal.md)); expanded = the current language label. Respects the collapsed/expanded rail state.
- [ ] **Settings → Appearance picker** — a "Language" row in [`appearance-section.tsx`](../packages/web/app/(main)/settings/appearance-section.tsx) alongside theme/accent, listing `SUPPORTED_LOCALES` with native labels.
- [ ] **Selection = one write path** — both surfaces set `prefs.locale` (Theme A), which persists locally + syncs to the gateway (Phase 43) and re-renders the provider; no separate locale state.
- [ ] **Tests** — selecting a language in the sidenav popover and in Settings both update the active locale and persist; the footer control sits above Settings and works in collapsed + expanded rail; a11y (role/label on the popover trigger).

## Theme D — Priority-surface translation — **L**

Fully externalize the high-traffic surfaces so switching language visibly changes the app. Everything else stays English and converts later behind the Theme E gate.

- [ ] **Shell nav + `<AppFrame>` chrome** — nav section labels, the footer cluster tooltips (theme/settings/lock/connection), mobile-nav tiles → `nav`/`common` namespaces.
- [ ] **Settings (all sections)** — [`settings/`](../packages/web/app/(main)/settings) labels, descriptions, and the sidebar → `settings` namespace (the switcher itself lands here, so it's a natural first full surface).
- [ ] **Board** — column headers, empty states, and card affordances on the main kanban → `board` namespace.
- [ ] **Auth / login** — the login/lock screens (incl. [`components/auth/`](../packages/web/components/auth) and the [`(auth)`](../packages/web/app/(auth)) tree) → `auth` namespace; keep SSO button copy localized ([`sso-buttons-visible-by-default`](sso-buttons-visible-by-default.md)).
- [ ] **Common cross-cutting copy** — [`confirm-dialog.tsx`](../packages/web/components/confirm-dialog.tsx) default labels, toasts, and shared empty/error states → `common` namespace (highest reuse, converts many call-sites cheaply).
- [ ] **Tests** — RTL renders a translated key from each namespace under a non-en locale (de-DE sample) and the en-GB fallback for an untranslated key; no hardcoded literal remains in the converted files (the Theme E lint rule enforces this on the touched set).

## Theme E — MT-seed, catalog tooling & lint gate — **M**

Make all four locales real, keep them in parity in CI, and stop new hardcoded strings from creeping in.

- [ ] **Extraction helper** — `scripts/i18n-extract.mjs` that scans the web tree for `t('ns.key')` usages and reports keys missing from the canonical catalog (drives authoring; ships a sibling `.d.mts` if imported by any TS test, per [importing-untyped-mjs](importing-untyped-mjs-into-ts-breaks-typecheck.md)).
- [ ] **MT-seed de/fr/es** from the en-GB canonical, each entry tagged `needs-review` in a parallel metadata map (or a `_meta` block) so a later human-review pass can find unreviewed strings; en-GB is authoritative.
- [ ] **`moon run web:i18n:validate` task** — fails CI on **key drift**: every non-canonical catalog must have exactly the canonical key set (no missing, no extra). Wired into the web project's tasks so `moon ci` runs it.
- [ ] **ESLint gate** — a `no-literal-jsx-text`-style rule (with a small allowlist for non-copy: icons, class strings, code samples) that **fails on new hardcoded user-facing strings** in `packages/web`, so the untouched long tail converts incrementally without regressions. Scope the rule so it doesn't retroactively fail the ~500 un-migrated files (e.g. warn on legacy, error on touched/new — or an allowlist file).
- [ ] **Tests / CI** — a deliberately drifted catalog fails `i18n:validate`; the ESLint rule flags a planted hardcoded string and passes a `t()` call.

## Theme F — Locale-aware formatting — **S**

Dates, numbers, and currency follow the active locale on the priority surfaces.

- [ ] **next-intl formatters** — use `useFormatter()` for dates/relative-times/numbers on the converted Theme D surfaces (board timestamps, settings, common) instead of ad-hoc `toLocaleString` calls.
- [ ] **Fix hardcoded currency** — [`finances-widget.tsx`](../packages/web/components/finances-widget.tsx): replace `Intl.NumberFormat('en-GB', …)` with the active locale (keep the currency code explicit; only the locale becomes dynamic).
- [ ] **Tests** — a date/number formats differently under de-DE vs en-GB via the formatter; the finances widget's formatting follows the active locale (not pinned to en-GB).

---

## Files this phase touches

| Area | Files |
|------|-------|
| shared · contract | **new** [`src/i18n.ts`](../packages/shared/src/i18n.ts) (`LocaleSchema`/`Locale`/`SUPPORTED_LOCALES`); [`src/preferences.ts`](../packages/shared/src/preferences.ts) (`locale` field + default) |
| web · runtime | **new** [`i18n/`](../packages/web/i18n) (next-intl config + static catalog map); **new** [`messages/{en-GB,de-DE,fr-FR,es-ES}.json`](../packages/web/messages); `package.json` (`next-intl` dep) |
| web · init/layout | [`app/layout.tsx`](../packages/web/app/layout.tsx) (locale init script + `<html lang>`); [`lib/app-settings.ts`](../packages/web/lib/app-settings.ts), [`components/preference-sync.tsx`](../packages/web/components/preference-sync.tsx) (`locale` in mapping + `prefsKey`) |
| shell · provider | [`src/providers/shell-providers.tsx`](../packages/shell/src/providers/shell-providers.tsx) (`LocaleProvider` + `NextIntlClientProvider`); admin [`app/layout.tsx`](../packages/admin/app/layout.tsx) (init script) |
| web · switcher | [`components/app-shell-client.tsx`](../packages/web/components/app-shell-client.tsx) / [`lib/nav-config.tsx`](../packages/web/lib/nav-config.tsx) (sidenav footer control above Settings); [`app/(main)/settings/appearance-section.tsx`](../packages/web/app/(main)/settings/appearance-section.tsx) (language picker) |
| web · translated surfaces | shell/nav chrome, [`settings/`](../packages/web/app/(main)/settings), board, [`(auth)`](../packages/web/app/(auth))/[`components/auth/`](../packages/web/components/auth), [`confirm-dialog.tsx`](../packages/web/components/confirm-dialog.tsx) + shared toasts |
| web · formatting | [`components/finances-widget.tsx`](../packages/web/components/finances-widget.tsx) (locale-driven currency) + Theme-D surfaces |
| tooling | **new** `scripts/i18n-extract.mjs`; web `moon.yml` (`i18n:validate` task); ESLint config (no-hardcoded-string rule + allowlist) |
| tests | shared schema units; resolver/provider/fallback units; switcher RTL (both surfaces); per-namespace translation + fallback RTL; catalog-drift + lint-rule guards; formatter units |

---

## Verification

- [ ] **Switcher works from both places:** a language control sits in the sidenav footer **just above Settings** (collapsed + expanded) and in Settings → Appearance; picking one changes the app language and persists across reload + syncs to the gateway (Phase 43).
- [ ] **Four locales load, en-GB is the fallback:** en-GB/de-DE/fr-FR/es-ES all render the priority surfaces; an untranslated key falls back to en-GB rather than showing the raw key or crashing; first-load with no pref resolves via `navigator.language` → nearest supported → en-GB with no flash-of-wrong-language.
- [ ] **Static export still builds:** `MIDNITE_WEB_TARGET` unset (`output: 'export'`) builds and runs with the provider (no middleware, no server-only next-intl APIs) — verified, not assumed.
- [ ] **Gate + parity hold in CI:** `moon run web:i18n:validate` fails on catalog key drift and passes when the four catalogs match; the ESLint rule flags a new hardcoded user-facing string and accepts a `t()` call.
- [ ] **Formatting follows locale:** dates/numbers on the converted surfaces and the finances widget's currency reformat under de-DE vs en-GB.
- [ ] `moon run web:typecheck && web:test && shared:test && :lint` green; `shell`/`admin`/`ui` boundary tests still pass (provider stays within `{shared, ui}` peers).

---

## Decisions / open questions

1. **Locale strategy** → **Resolved (user): preference-based client i18n, not middleware/URL routing.** Web defaults to Next static export (no server, no `middleware.ts`), so `/de-DE/…` segment routing can't run; the active locale is the Phase 43 synced pref, applied via `NextIntlClientProvider`. Better fit for a desktop-packaged app than URL routing anyway.
2. **Catalog home** → **Resolved (user): `Locale` type in `@midnite/shared`, message catalogs in `packages/web/messages/`.** The type + prefs field are the wire contract (shared is the contract); the catalogs are next-intl-coupled UI copy and stay in web — keeps `shared` free of UI strings.
3. **Externalization scope** → **Resolved (user): foundation + priority surfaces + lint gate.** Full stack + fully-translated high-traffic surfaces now; an ESLint gate carries the ~500-file long tail incrementally. Full externalization of every file was set aside as an XL, hard-to-review change likely to spill past one phase.
4. **Seeding de/fr/es** → **Resolved (user): MT-seed + `needs-review`.** en-GB canonical; the other three machine-seeded and flagged for later human review, so all four locales are live immediately. CI enforces key parity regardless of translation quality.
5. **Provider placement + init** → **Resolved (user): shell provider, resolve pref → browser → en-GB, pre-paint.** Provider mounts in `ShellProviders` so `admin` inherits it; a pre-paint init script (like `appearanceInitScript`) avoids a flash-of-wrong-language. *Implementation note:* web's `app/layout.tsx` doesn't route through `ShellProviders` today, so the provider/messages must be threaded into web's own stack while shell owns the component — resolve during Theme B without breaking the shell boundary test.
6. **Locale-aware formatting** → **Resolved (user): in scope.** next-intl formatters for dates/numbers on priority surfaces + fix the hardcoded `Intl.NumberFormat('en-GB')` in the finances widget.
7. **ESLint gate calibration** → **Recommendation: error on new/touched files, don't retroactively fail the ~500 un-migrated ones** (warn-on-legacy or an allowlist), so the gate stops regressions without a big-bang conversion. *(Confirm the exact rule mechanism during Theme E.)*
8. **Admin console** → **Recommendation: inherit the shell provider for free, don't target it for translation this phase.** It's a minimal English-only ops tool; localizing it fully is a cheap later extension once the pattern is proven in web.
