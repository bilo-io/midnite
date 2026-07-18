# Phase 71 — App update banner & per-platform update

> [Phase 24 C](phase-24-responsive-mobile-pwa.md) shipped PWA installability — a registered service worker ([`public/sw.js`](../packages/web/public/sw.js) + [`pwa-register.tsx`](../packages/web/components/pwa-register.tsx)) that is **network-first for same-origin code** and precaches a shell. But it calls `self.skipWaiting()` on install and takes over immediately, so a new build lands **silently on the next load** — there's no "a new version is ready" moment, and no way for a user to *choose* when to take it. [Phase 29](phase-29-releases-versioning-changelog.md) gave us lockstep `MAJOR.MINOR` versioning + per-package `PATCH` ([`shared/src/version.ts`](../packages/shared/src/version.ts)) and a two-step tag flow (`/release-prep` → `/release-complete`), but nothing publishes the "latest version" for a running client to compare against, and [`packages/desktop`](../packages/desktop) has `electron-updater` only as a **doc stub** ([`electron-builder.yml`](../packages/desktop/electron-builder.yml), [`README.md`](../packages/desktop/README.md)). **Phase 71 closes the loop:** a build-emitted `version.json` published on every tag, a client that polls + folds in the SW signal to detect a newer build, a prominent-but-subtle **top banner** that lets the user take the update **when they choose** — the web force-refreshes from server, the desktop app runs a full `electron-updater` download → restart-to-install — plus release-notes on the version, a stable/beta channel, a force-update floor, and a CLI out-of-date notice. This is the golive-readiness phase: everyone about to test needs a first-class "you're behind, update now" path.
>
> **Scope guardrails (CLAUDE.md).** `version.json` is a **contract** — its shape (current/latest version, channel, min-supported) gets a zod schema in [`shared`](../packages/shared); web/desktop/CLI read only the typed shape, never an ad-hoc `fetch().json()`. Version-checking is **domain logic → lives in `web`**, not the leaf [`@midnite/ui`](../packages/ui) (the banner and its collapse/inverted-surface animation are web components; no `ui` change). The banner **never blindly auto-updates** — detection may be automatic, *applying* is always a user click. The Electron main-process updater code stays in [`packages/desktop`](../packages/desktop); the shared React banner drives it via the existing preload/IPC bridge. The release flow is the single writer of `version.json` — no other code path bumps it.
>
> Effort tags: **S** small · **M** medium · **L** large. Critical path is **A → B → C → D** (contract → detect → banner → web-apply); **E** (Electron) rides on A/C and is the largest slice; **F/G/H** layer on top. A+B+C+D is the user-visible web core; E is the desktop core.

---

## Current state (what exists to build on)

- **Service worker** — [`public/sw.js`](../packages/web/public/sw.js): `CACHE = 'midnite-shell-v1'`, network-first for same-origin app code + navigations, precached static shell. Registered production-only by [`pwa-register.tsx`](../packages/web/components/pwa-register.tsx) (skipped in `next dev`). It `skipWaiting()`s + `clients.claim()`s on activate, so updates apply **silently** — the detection lifecycle (`updatefound` / waiting worker / `controllerchange`) exists but is bypassed rather than surfaced. Test: [`pwa-register.test.tsx`](../packages/web/components/pwa-register.test.tsx). It **never touches the gateway origin** (live data stays fresh) — keep that invariant.
- **Versioning** — [`shared/src/version.ts`](../packages/shared/src/version.ts): lockstep `MAJOR.MINOR` + per-package `PATCH`, `root:version-check` invariant in CI. [`docs/RELEASING.md`](../docs/RELEASING.md) + the `/release-prep` → `/release-complete` skills own the tag/branch scheme and `package.json` bumps. Nothing emits a runtime-readable manifest today — **no `version.json` exists anywhere**.
- **Desktop** — [`packages/desktop`](../packages/desktop) is Electron ([`electron-builder.yml`](../packages/desktop/electron-builder.yml)), wrapping the web app. `autoUpdater`/`electron-updater` appears **only** as future-work notes ([`electron-builder.yml:111`](../packages/desktop/electron-builder.yml#L111), [`README.md:131`](../packages/desktop/README.md#L131)): "the `zip` target + a `publish:` block (GitHub provider) is all electron-updater needs; add `autoUpdater.checkForUpdatesAndNotify()` in main." No `publish:` block, no updater code, no preload bridge for it yet.
- **Notifications / guides** — [Phase 21](phase-21-notifications.md) toast + notification center and [Phase 67](phase-67-guides-everywhere.md) product-guide surfaces exist to (optionally) echo an available update; the banner is the primary surface, these are reuse opportunities not requirements.
- **Theme tokens** — HSL design tokens + `.dark` block in [`globals.css`](../packages/web/app/globals.css); "inverted to current theme" means the banner reads as the *opposite* surface (dark chrome in light mode, light chrome in dark mode) for contrast. [`cn()`](../packages/web/lib/utils.ts) + Tailwind for composition; `useMediaQuery`/`useIsMobile` ([`hooks/use-media-query.ts`](../packages/web/hooks/use-media-query.ts)) for any JS branch.
- **CLI** — thin commander client ([`packages/cli`](../packages/cli)); a `--json`-aware presentation layer (Phase 47) is the natural home for a startup "out of date" notice.

---

## Theme A — Version manifest & semver compare (contract) — **S**

The shared shape both a running client and the release flow agree on, plus the "what am I?" constant baked into each build.

- [ ] `shared`: `VersionManifestSchema` in `shared/src/version.ts` (or a new `shared/src/update/`): `{ version: string (semver), channel: 'stable' | 'beta', minSupported?: string, releasedAt?: string, notesUrl?: string }`, validated against the existing semver rules; export an `isUpdateAvailable(current, latest)` + `isBelowFloor(current, minSupported)` pure helper (reuse `version.ts` compare, don't hand-roll).
- [ ] A build-time **current-version constant** for each app: `web` exposes it via `NEXT_PUBLIC_APP_VERSION` (read from `package.json` at build), `desktop` from `app.getVersion()`; a single `getCurrentVersion()` accessor in `web` so the banner never guesses.
- [ ] Typed access only: a `fetchVersionManifest(url)` helper (in `web`) that fetches + `VersionManifestSchema.parse`es — no raw `.json()` consumers. Unit tests for the compare/floor helpers (equal, patch-ahead, minor-behind, malformed, channel mismatch).

## Theme B — Detection: poll + focus + SW signal (web) — **M**

Belt-and-suspenders freshness: the version manifest is the source of truth, the SW waiting-worker is a corroborating signal, neither blindly reloads.

- [ ] `useUpdateAvailable()` hook: polls `fetchVersionManifest()` on mount + on an interval (`~5min`, config const) + on `window` focus + on route navigation; compares against `getCurrentVersion()`; exposes `{ available, latest, belowFloor, source }`. Guarded against overlapping fetches + offline (fail-soft, no error toast).
- [ ] Fold in the **SW signal**: rework [`pwa-register.tsx`](../packages/web/components/pwa-register.tsx) so a `waiting` worker (via `updatefound` → `installed` while controlled) also flips `available` — detection only; it must **stop auto-`skipWaiting`ing** on install so the waiting worker survives for the user to trigger (Theme D applies it on click). Preserve the "never touch gateway origin" invariant + production-only activation.
- [ ] Manifest hosting: web polls its **own origin** `/version.json` (static, from Theme G). Document the cache-busting (`cache: 'no-store'` + query nonce) so a CDN can't pin a stale manifest.
- [ ] Tests: hook units (available on minor bump, no-op when equal, focus/interval re-check, offline fail-soft), SW-signal unit (waiting worker → available), updated `pwa-register.test.tsx` for the no-longer-silent lifecycle.

## Theme C — The `UpdateBanner` (web) — **M**

The whole point: a top banner that is impossible to miss but doesn't shout, and **pushes the app down** rather than floating over it.

- [ ] `UpdateBanner` component (in `web`, e.g. `components/update/`): mounted at the **top of the root layout** ([`layout.tsx`](../packages/web/app/layout.tsx)), rendered only when `useUpdateAvailable().available`. **Theme-inverted** surface (dark chrome in light mode / light chrome in dark mode via tokens) for contrast; prominent yet subtle (one line of copy, the version as a link/button, the update action, a right-aligned `×`).
- [ ] **Layout push-down, not overlay:** the banner occupies real flow height so the entire app shifts down and nothing is occluded (a CSS custom property / layout slot the app chrome respects — verify against the fixed sidenav/header). Works at both mobile (`< md`) and desktop widths; copy + controls reflow (icon-only actions on narrow screens).
- [ ] **Ease-in-out show/hide:** appearing and disappearing animate height + opacity with an ease-in-out curve (respect `prefers-reduced-motion` → instant). No layout jank — reserve/animate the slot so the push-down is smooth.
- [ ] **Dismiss semantics:** the `×` hides the banner **for the current view only** — it is *not* persisted; any reload or navigation re-surfaces it while an update is still available (ephemeral in-memory state, never localStorage). Once the update is applied (version matches), it stops appearing.
- [ ] Platform-aware action label: web → "Update" (force refresh); desktop → "Update" that downloads then becomes "Restart to install" (Theme E drives the state). The action + label come from a platform detector so one component serves both.
- [ ] Tests + stories: `update-banner.stories.tsx` (light/dark inverted, mobile/desktop, downloading/ready-to-restart states) with `play` for dismiss + click; RTL for dismiss-reappears-on-remount and applied → hidden.

## Theme D — Web apply: SW handoff → force refresh — **S**

Take the waiting worker live and hard-refresh from server, exactly once, on the user's click.

- [ ] On "Update" (web): post `skipWaiting` to the waiting SW, listen for `controllerchange`, then `location.reload()` (force server fetch). Idempotent + guarded (no double-reload); fall back to a plain hard reload if there's no waiting worker (version-only detection case).
- [ ] Verify the reload actually lands the new build (post-reload `getCurrentVersion()` matches `latest`) — otherwise keep the banner up rather than declaring success.
- [ ] Tests: the skipWaiting → controllerchange → reload sequence (mocked SW), and the no-waiting-worker fallback path.

## Theme E — Electron auto-update + code-signing (desktop) — **L**

The desktop half: a real in-app `electron-updater` pipeline the banner drives — download on click, restart-to-install when the user is ready. Never `checkForUpdatesAndNotify` (that auto-nags/auto-restarts); this is user-timed.

- [ ] `electron-builder.yml`: add the `publish:` block (GitHub provider) + keep the `zip`/target `electron-updater` needs; generate the update feed (`latest*.yml`) on release.
- [ ] Main process: wire `electron-updater` `autoUpdater` — `checkForUpdates()` (no auto-download), then `downloadUpdate()` on request, `quitAndInstall()` on request; emit `checking` / `available` / `download-progress` / `downloaded` / `error` over IPC. Feed the renderer the same `available` signal so the banner shows for desktop too (independent of the web `version.json` poll, or reconciled with it).
- [ ] Preload bridge: expose a minimal typed `window.midnite.updates` API (`onState`, `download`, `restartToInstall`) so the shared `UpdateBanner` can call into the updater without Node access; the platform detector routes desktop clicks here.
- [ ] Banner desktop states: "Update" → progress (percent from `download-progress`) → "Restart to install" → `quitAndInstall`. Errors fail-soft (banner offers retry, never blocks the app).
- [ ] **Code-signing / notarization:** configure signing (macOS notarization + Windows signing) so `electron-updater` accepts the downloaded artifact — this is a real prerequisite for updates to install, done here (with the certs/secrets sourced from env/CI, documented in [`desktop/README.md`](../packages/desktop/README.md)).
- [ ] Tests: main-process updater state machine (mocked `autoUpdater`), preload bridge contract, banner desktop-state rendering; document the manual "build two versions, update across them" smoke (not runnable in the unit harness).

## Theme F — Release notes on the version (web + desktop) — **S**

The version is a link, not just a label — clicking it tells you *what's* new.

- [ ] The version string in the banner links/opens the **release notes**: a lightweight popover (or route) rendering the tag's [`CHANGELOG.md`](../CHANGELOG.md) section for `latest` (fetched alongside the manifest, or `notesUrl` from Theme A). Markdown-rendered, dismissable, keyboard-accessible.
- [ ] Fail-soft: if notes can't be fetched, the version still links to the GitHub release page; the update action is never blocked on notes.
- [ ] Optional echo into the [Phase 21](phase-21-notifications.md) notification center ("vX.Y.Z available") so a dismissed banner still leaves a trail — reuse, not a new channel.
- [ ] Tests: notes popover renders the changelog section, fallback-to-release-page path, a11y (focus/escape).

## Theme G — Release-flow wiring: emit `version.json` on tag — **M**

Make "bumps on every tag" real end-to-end — the release flow is the single writer.

- [ ] A build/release step writes [`packages/web/public/version.json`](../packages/web/public/version.json) (served at web-origin `/version.json`) conforming to `VersionManifestSchema`, stamped with the released version + channel + `minSupported` + `notesUrl`. Also emit/copy the manifest into the Electron resource so desktop has a bundled baseline.
- [ ] Wire it into the [`/release-complete`](../.claude/skills/release-complete) skill (and/or a `moon` task) so cutting a tag updates the manifest atomically with the version bump — not a manual step. Update [`docs/RELEASING.md`](../docs/RELEASING.md) to document the manifest as part of the release contract.
- [ ] Guard: `root:version-check` (or a sibling) asserts `version.json` matches the `package.json` version so a tag can't ship a stale manifest.
- [ ] Tests: the emit step produces a schema-valid manifest matching the bumped version; the version-check guard fails on a mismatch.

## Theme H — Channels, force-update floor & CLI notice — **M**

The golive extras: a beta/stable channel, a hard floor that forces the update, and a CLI heads-up.

- [ ] **Channel:** `channel: 'stable' | 'beta'` in the manifest + a user/preference toggle (reuse [Phase 43](phase-43-server-side-preference-sync.md) preference sync) so testers can opt into `beta`; the web poll + Electron feed both respect it. Default `stable`.
- [ ] **Force-update floor:** when `getCurrentVersion() < minSupported`, the banner becomes **non-dismissable** (no `×`, blocking overlay copy) — the user can still read release notes but must update to proceed. Applies to web + desktop; drives home "you're too far behind to test against."
- [ ] **CLI out-of-date notice:** on `midnite` startup, fetch the manifest (fail-soft, cached, `--json`-aware, suppressible via env/flag) and print a one-line "midnite CLI vX is behind vY — update" using the Phase 47 chrome; a hard notice if below `minSupported`.
- [ ] Tests: channel selection (beta sees a newer manifest, stable doesn't), floor makes the banner non-dismissable, CLI notice prints/suppresses correctly + fails soft when the manifest is unreachable.

---

## Files this phase touches

| Area | Files |
|------|-------|
| shared | [`src/version.ts`](../packages/shared/src/version.ts) (compare/floor helpers) + a new `src/update/` (`VersionManifestSchema`, `isUpdateAvailable`, `isBelowFloor`) |
| web · detect | [`components/pwa-register.tsx`](../packages/web/components/pwa-register.tsx) (+ test), [`public/sw.js`](../packages/web/public/sw.js) (stop silent skipWaiting), a new `hooks/use-update-available.ts`, `lib/version.ts` (`getCurrentVersion` / `fetchVersionManifest`) |
| web · banner | new `components/update/` (`UpdateBanner`, release-notes popover, platform detector), [`app/layout.tsx`](../packages/web/app/layout.tsx) (mount + push-down slot), [`app/globals.css`](../packages/web/app/globals.css) (inverted surface + ease-in-out), stories + RTL |
| desktop | [`electron-builder.yml`](../packages/desktop/electron-builder.yml) (`publish:` block), main-process updater, preload `window.midnite.updates` bridge, [`README.md`](../packages/desktop/README.md) (signing/notarization docs) |
| web · manifest | **new** [`public/version.json`](../packages/web/public/version.json) (emitted, not hand-edited) |
| release | [`docs/RELEASING.md`](../docs/RELEASING.md), the `/release-complete` skill + a `moon` emit task, `root:version-check` sibling guard |
| cli | startup out-of-date notice (in [`cli/src`](../packages/cli/src), Phase 47 chrome) |
| tests | shared compare/floor units, web hook + SW + banner units/stories, desktop updater state-machine + preload units, release emit/guard test, CLI notice test |

---

## Verification

- [ ] **Web, no reload-loop:** with a `version.json` bumped ahead of the running build, the banner appears at the top, pushes the app down (nothing occluded, sidenav/header intact), animates in with an ease-in-out curve, and reflows on mobile + desktop. `×` hides it; a reload/navigation brings it back; clicking "Update" force-refreshes and the banner is gone (version now matches). Playwright drives this against a seeded manifest.
- [ ] **Inverted contrast:** banner reads as the opposite surface in both light and dark; screenshot proof (light + dark, mobile + desktop) via the stories.
- [ ] **Reduced motion:** banner appears/disappears instantly (no animation) under `prefers-reduced-motion`.
- [ ] **Desktop update (manual, environment-gated):** build vX, publish a vY release, launch vX — banner appears, "Update" downloads (progress shown), "Restart to install" relaunches into vY; the downloaded artifact passes signature verification. Documented as a manual smoke (two real builds; not runnable in the unit harness), with the updater state machine + preload bridge unit-covered.
- [ ] **Release wiring:** cutting a tag via `/release-complete` writes a schema-valid `version.json` matching the new version; `version-check` fails a deliberately-mismatched manifest.
- [ ] **Release notes:** the version link opens the tag's CHANGELOG section; unreachable-notes falls back to the release page without blocking the update.
- [ ] **Channel + floor:** a `beta`-opted client sees a newer beta manifest a `stable` client doesn't; a build below `minSupported` gets a **non-dismissable** banner (web + desktop).
- [ ] **CLI notice:** `midnite` startup prints the one-line out-of-date notice (respecting `--json`/suppress), a hard notice below the floor, and stays silent + fast when the manifest is unreachable.
- [ ] `moon run :typecheck && :lint && :test` green; each layer carries its new specs. Boundary tests still pass (`ui` untouched; web never imports gateway internals).

---

## Decisions / open questions

1. **Version source** → **Resolved: static `/version.json` in `web/public`**, written by the release flow (Theme G). Web polls its own origin; no gateway endpoint (keeps the "SW never touches gateway origin" invariant clean and avoids a new gateway surface). A dynamic `GET /version` is deferred to a future release-channel phase if ops need staged rollout %.
2. **Electron scope** → **Resolved: full in-app `electron-updater`** (publish/feed/download/restart) *including* code-signing, not an "open the download page" shortcut. It's the golive path; a manual-install fallback isn't good enough for testers.
3. **Banner home** → **Resolved: all in `web`.** Version-checking is domain logic; the inverted-surface + collapse animation are web components. No `@midnite/ui` change (keeps the leaf pure). Revisit only if a second consumer needs the banner primitive.
4. **Detection strategy** → **Resolved: poll + focus + SW signal.** The `version.json` poll is the source of truth (platform-uniform, matches desktop); the SW waiting-worker corroborates and gives the exact reload handoff. Requires dropping the SW's silent `skipWaiting`-on-install.
5. **Dismiss persistence** → **Resolved: ephemeral, never persisted.** `×` hides for the current view; any reload/navigation re-surfaces while an update is available. (User-specified.) The force-update floor (Theme H) removes the `×` entirely.
6. **Blind auto-update?** → **Resolved: no.** Detection is automatic; *applying* is always a user click (web reload / desktop download+restart). The only exception is the force-update floor, which still requires the user to click "Update" — it just can't be dismissed.
7. **Nothing out of scope** → **Resolved (user, for golive):** channels, force-update floor, code-signing, and the CLI notice are all **in** (Themes E + H). The only future-deferred items are a *dynamic* gateway `/version` endpoint and staged-rollout-% telemetry (a later "release channel" phase) — not needed for a user-timed update banner.
8. **SW skipWaiting change risk** — dropping the silent takeover is a behavior change to a Phase 24 invariant. Recommendation: keep the network-first + gateway-origin-untouched guarantees exactly, change *only* the waiting-worker activation timing (user-triggered), and pin it with the updated `pwa-register.test.tsx`. *(Recommended; confirm in review.)*
