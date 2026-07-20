# @midnite/desktop

Packages midnite as a downloadable **macOS desktop app** (Electron): the Electron
main process boots the Nest gateway locally as a child process and renders the
Next.js web UI against it. No servers to run by hand.

## How it works

```
Electron main (dist/main/index.js)
  ├─ resolvePaths()         → shared home ~/.midnite: db/uploads + config/operator/.env
  │                           discovery (migrates a legacy app-private db once)
  ├─ findFreePort()         → dynamic loopback port (avoids 7777 clashes)
  ├─ startGatewayProcess()  → spawn gateway via Electron's node (ELECTRON_RUN_AS_NODE);
  │                           MIDNITE_* paths + config/operator paths + ~/.midnite/.env
  │                           secrets + MIDNITE_WEB_DIR (gateway serves the web itself)
  ├─ waitForHealth()        → poll GET /health before showing the window
  ├─ writeGatewayEndpoint() → advertise the URL in ~/.midnite/gateway.json for the CLI
  ├─ BrowserWindow          → preload injects window.__NEXT_PUBLIC_GATEWAY_URL
  └─ renderer URL:
        dev  → http://localhost:3000 (next dev) or $MIDNITE_WEB_URL
        prod → serveStatic(web/) over a second loopback port  (NOT file://)
```

### Shared `~/.midnite` home (one midnite per machine)

A downloaded app must behave like the user's own gateway — same config, same SSO, same
board data — so the embedded gateway reads a **shared machine-wide home** (`~/.midnite`),
not an app-private sandbox:

| File | Effect |
|------|--------|
| `~/.midnite/midnite.json`  | user config → `MIDNITE_CONFIG_PATH` |
| `~/.midnite/operator.json` | SSO/JWT (operator) config → `MIDNITE_OPERATOR_CONFIG` |
| `~/.midnite/.env`          | secrets (JWT signing secret, SSO client secrets) merged into the gateway child env |
| `~/.midnite/midnite.db`, `uploads/` | shared data (a legacy app-private db is migrated in once) |
| `~/.midnite/gateway.json`  | written on boot so the bundled CLI finds the running gateway |

A fresh machine with no `~/.midnite/*` boots on schema defaults (auth off, local mode).
Drop a `midnite.json` / `operator.json` / `.env` there and SSO + settings light up on
the next launch — exactly as `gateway:dev` behaves.

### Auth / SSO in the desktop app

The web is a **static export** (no Next server), so the `/api/auth/*` BFF route handlers
don't exist here. Auth talks to the embedded gateway's `/auth/*` endpoints **directly**
(`lib/auth-transport.ts`), keeping the refresh token in `localStorage` (acceptable on a
single-user loopback machine). Because the gateway serves the web itself (single origin),
the SSO OAuth round-trip — `/auth/sso/:provider/start` → provider → gateway callback →
`/auth/sso/callback` page → `/auth/sso/exchange` — all resolves on one origin, exactly
like `midnite serve`. SSO requires the provider's redirect URI to allow the gateway's
loopback origin (loopback redirect URIs are permitted for native apps per RFC 8252).

### Bundled CLI

The app ships the `midnite` CLI (`Contents/Resources/cli/dist/index.mjs`) as an
**esbuild single-file bundle** (~3MB — vs. ~220MB if `pnpm deploy` dragged the whole
gateway closure in twice), run via the `bin/midnite` shim under the app's own
Electron-as-Node (no system Node, ABI matches). It discovers the running gateway from
`~/.midnite/gateway.json`, so `midnite list` works against the desktop app with no flags.
`install:local` symlinks it to `/usr/local/bin`; end users can
`ln -s "/Applications/midnite.app/Contents/Resources/bin/midnite" /usr/local/bin/midnite`.
(`midnite serve` is intentionally unavailable from the bundled copy — its
`import('@midnite/gateway/bootstrap')` is kept external; the app IS the gateway.)

The gateway honours `MIDNITE_GATEWAY_PORT / _DB_PATH / _UPLOADS_DIR`, `MIDNITE_KNOWLEDGE_DIR`,
`MIDNITE_CONFIG_PATH`, `MIDNITE_OPERATOR_CONFIG`, and `MIDNITE_WEB_DIR`
(see `gateway/src/lib/load-config.ts` + `bootstrap.ts`).

## Native notifications (Phase 21 Theme D)

The web app already raises notifications (in-app toasts + a notification center,
and the browser `Notification` API when the window is backgrounded). Inside the
desktop shell those are upgraded to **native OS notifications** fired from the
**main process** — reliable even when the renderer is hidden and throttled, where
its own `Notification` API is not.

```
renderer (web NotificationsProvider)
  └─ window.midniteDesktop.notify(n)        ← preload bridge (contextBridge)
       └─ ipcRenderer.send('midnite:notify')
            └─ main: new Notification(...).show()   (main/notifications.ts)
                 └─ on click → focus window + webContents.send('midnite:navigate', route)
                      └─ renderer router.push(route)
```

The preload exposes `window.midniteDesktop` (`notify` + `onNavigate`), whose shape
the web mirrors in `packages/web/lib/desktop-bridge.ts`. The renderer feature-detects
the bridge: present → native path, absent (plain browser) → web `Notification` API.
The opt-in (`notifyTaskUpdates`) + "only while the window is away" gate are shared by
both paths; the OS owns the native permission, so the native path has no web-permission
gate.

## Prerequisites (must run on a real macOS machine — not the CI sandbox)

Native modules (`better-sqlite3`, `node-pty`) and the Electron binary cannot be
built/downloaded in the restricted sandbox. On a Mac:

```bash
# from the repo root
pnpm install                       # downloads the Electron binary
moon run gateway:build             # gateway/dist (+ copies hook .cjs)
moon run desktop:build             # desktop/dist (main + preload)
```

Dev needs **no** `electron-rebuild`: `desktop:start` spawns the gateway child under
plain **Node** (see `src/main/gateway-process.ts`), so it uses the workspace's shared
`better-sqlite3`/`node-pty` at their Node ABI (127) — the same copy `gateway:dev` and
the tests use. `moon run desktop:rebuild` is a **packaging-only** step: it is scoped to
the staged prod tree (`build-staging/gateway`, produced by `desktop:stage`) and
electron-rebuilds *that* isolated copy for Electron's ABI — it never touches the shared
hoisted binaries.

## Dev run (against the Next dev server)

```bash
moon run web:dev        # terminal 1 — next dev on :3000
moon run desktop:start  # terminal 2 — Electron boots the gateway child + loads :3000
```

This exercises the full path (gateway spawn → /health gate → window → live
terminal over the loopback origin) without needing the static export.

## Packaging (.dmg)

The production renderer is served from the web app's **static export**
(`next.config.mjs` → `output: 'export'`, `trailingSlash: true`,
`images.unoptimized`), written to `packages/web/out` by `moon run web:build`.

electron-builder 25.x rejects any `extraResources` `from:` path outside the app
dir (`packages/desktop/`), so both the gateway and the web export are **staged
into `packages/desktop/build-staging/`** first — that whole dir is a build
artifact and is git-ignored. `pnpm run stage` (`scripts/stage-gateway.mjs`) does
the staging: `pnpm deploy` for a flat, symlink-free gateway prod `node_modules`,
`electron-rebuild` of its native deps (better-sqlite3, node-pty) for this arch,
and a copy of `web/out` → `build-staging/web`.

```bash
# 1. build the gateway (dist + hook .cjs) and the web static export (web/out)
moon run gateway:build web:build
# 2. stage gateway prod deps (deploy + electron-rebuild per arch) + the web export
pnpm --filter @midnite/desktop run stage
# 3. package the dmgs
moon run desktop:package        # → packages/desktop/build/midnite-*-{arm64,x64}.dmg
```

(`pnpm --filter @midnite/desktop run dist` chains `stage` + `electron-builder` in
one step once the builds in step 1 exist.)

## Build & replace the local install (one command)

For the local iterate-on-desktop loop, `install:local` does the whole
build→package→install in one shot — the fast way to see a change running in the
actual installed app rather than the dev shell:

```bash
pnpm --filter @midnite/desktop run install:local
# then:
open /Applications/midnite.app
```

macOS + Apple Silicon only (matches the release matrix). Your data is safe across
reinstalls: the DB, uploads, and knowledge live in
`~/Library/Application Support/midnite/` (outside the bundle), so replacing the
`.app` never touches your tasks/projects.

### What it does

The script is [`scripts/install-local.mjs`](scripts/install-local.mjs). It runs
the same pipeline as the manual "Packaging" steps above, then installs:

1. **Build** — gateway `dist` + Electron main/preload (moon), then the web static
   export (`web/out`).
2. **Stage** — `pnpm run stage`: a flat, symlink-free gateway prod `node_modules`
   (`pnpm deploy` + `electron-rebuild` of the native deps for this arch) plus the
   web export, into `build-staging/`.
3. **Package** — electron-builder emits `build/mac-arm64/midnite.app` (and the
   dmg/zip).
4. **Install** — quit any running instance, replace `/Applications/midnite.app`
   with the fresh build, and strip the quarantine bit so the unsigned build
   launches.

### Notes / gotchas it handles

These are non-obvious and each one is a silent failure if you script it by hand —
the reasons are commented at the relevant lines in the script:

- **The `.app` is copied with `ditto`, never `cp -R`.** The bundle embeds signed
  frameworks that use `Versions/Current` symlinks; a plain recursive copy breaks
  the code seal, and macOS then **SIGKILLs the app on launch with no output or
  logs**. If a locally-installed build won't open, check
  `codesign -vv /Applications/midnite.app` — "unsealed contents … embedded
  framework" is this bug.
- **`@midnite/web` must stay a _dev_ dependency of this package** (see
  [`moon.yml`](moon.yml): the `web` edge is scoped `development`). The web UI ships
  as the prebuilt static export via `extraResources` — it's never imported as a
  module — so if it lands in prod `dependencies`, electron-builder walks the
  workspace symlink into `packages/web` + its `@midnite/*` deps and dies on a
  sibling path (`packages/shared/dist/.tsbuildinfo`).
- **The web build tolerates a moon flake.** On a cache miss, `web:build` can error
  with `task_runner::missing_outputs` on Next's `output: export` `out/` even
  though the export was written correctly; the script continues as long as
  `web/out/index.html` exists (a real `next build` failure never produces it). It
  also packages by calling electron-builder directly rather than
  `moon run desktop:package`, which would re-trigger that same flaky web build.

Build the arm64 dmg on Apple Silicon and the x64 dmg on (or cross from) Intel —
native modules are arch-specific; a universal binary is fragile for these and is
intentionally avoided.

### afterPack note

`node-pty`'s `spawn-helper` can lose its executable bit through packaging
(`scripts/fix-node-pty.cjs` doesn't run on user machines). Add an `afterPack`
hook that `chmod 0o755`s it inside the built `.app` before shipping, or verify
the bit survived.

## Distribution — automated on a version tag

Pushing a `v*` tag runs [`.github/workflows/release.yml`](../../.github/workflows/release.yml):
a per-OS matrix (macOS arm64 + x64, Windows x64, Linux x64) builds and uploads
`midnite-<version>-<arch>.{dmg,exe,AppImage}` to a **draft** GitHub Release.

```bash
# from main, after the release changes have merged:
git tag v0.0.0 && git push origin v0.0.0
# → watch the run, then Publish the draft from the Releases page.
```

The marketing site's download buttons point at `releases/latest/download/...`, so
they go live once the draft is published. `matrix.fail-fast: false` means macOS
still succeeds even if Windows/Linux need a follow-up on the first run.

To build a single OS locally: `pnpm --filter @midnite/desktop run stage`, then
`pnpm --filter @midnite/desktop run package` (or `package:win` / `package:linux`).

Unsigned builds trip Gatekeeper (macOS) and SmartScreen (Windows) — document
right-click → Open, or `xattr -dr com.apple.quarantine /Applications/midnite.app`.

## Code signing & auto-update (Phase 71 Theme E)

In-app updates use **electron-updater**, driven by the shared web `UpdateBanner`
(never auto-nag/auto-restart — the user clicks). The main-process wiring is
[`src/main/updater.ts`](src/main/updater.ts): `checkForUpdates()` on boot (no
auto-download), then `downloadUpdate()` / `quitAndInstall()` on request, with state
emitted over IPC. The renderer reaches it through the preload bridge
[`window.midnite.updates`](src/preload/index.ts) → [`packages/web`'s
`getUpdatesBridge()`](../web/lib/desktop-bridge.ts). Unpackaged (dev) builds have
no feed, so the bridge is a safe no-op and the web service-worker reload path is
used instead.

**Update feed.** [`electron-builder.yml`](electron-builder.yml) has a `publish:`
block (GitHub provider → the public `bilo-io/midnite-app` repo). On a release build
electron-builder emits `latest-mac.yml` / `latest.yml` / `latest-linux.yml`
(+ `*.blockmap`) alongside the installers; the release workflow uploads them so the
running app can poll `releases/latest`. macOS auto-update installs from the `.zip`
target (kept in `mac.target`), not the `.dmg`.

**Signing is env-gated** (real signing is the golive prerequisite — an unsigned
build cannot install an update):

| Env | Effect |
| --- | --- |
| `CSC_LINK` + `CSC_KEY_PASSWORD` | electron-builder signs the macOS `.app` with the Developer ID cert |
| `APPLE_ID` + `APPLE_APP_SPECIFIC_PASSWORD` + `APPLE_TEAM_ID` | the afterSign hook ([`scripts/notarize.cjs`](scripts/notarize.cjs)) notarizes the signed `.app` |
| `WIN_CSC_LINK` (or `CSC_LINK`) + `CSC_KEY_PASSWORD` on the Windows job | signs the NSIS installer |
| none | `CSC_IDENTITY_AUTO_DISCOVERY=false` (set by the release workflow) → a clean **unsigned** build; `afterpack.cjs` ad-hoc signs it so it still launches locally |

Store the cert/creds as repo secrets of the same names (see
[`release.yml`](../../.github/workflows/release.yml)); notarization uses hardened
runtime + [`resources/entitlements.mac.plist`](resources/entitlements.mac.plist).

**Manual smoke (two real builds — not runnable in the unit harness):** build vX,
publish a vY release to `bilo-io/midnite-app`, launch the signed vX → the banner
appears, **Update** downloads (progress shown), **Restart to install** relaunches
into vY, and the downloaded artifact passes signature verification. The pure
event→state mapping is unit-covered in [`src/updates/update-state.test.ts`](src/updates/update-state.test.ts).

## Verification checklist (on a clean Mac)

1. `moon run desktop:package`; inspect the `.app`: `Contents/Resources/gateway/{dist,drizzle,node_modules}`, hook `.cjs` at `gateway/dist/terminal/hooks/`, `web/index.html`, native `.node` + node-pty `spawn-helper` (with +x).
2. Install to /Applications, launch (right-click → Open). Window appears only after `/health`.
3. `~/Library/Logs/midnite/` shows the gateway listening + migrations applied; DB at `~/Library/Application Support/midnite/midnite.db` (NOT in the bundle).
4. Create a task/project (sqlite), upload media (uploads + static), open a terminal session (node-pty + WS over the loopback origin).
5. Launch while a dev gateway holds :7777 → app still boots on its dynamic port.
6. Quit → no orphan gateway/PTY processes (`pgrep -f midnite`); DB closed cleanly.
7. Repeat on both arm64 and x64 dmgs.
