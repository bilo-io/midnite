# @midnite/desktop

Packages midnite as a downloadable **macOS desktop app** (Electron): the Electron
main process boots the Nest gateway locally as a child process and renders the
Next.js web UI against it. No servers to run by hand.

## How it works

```
Electron main (dist/main/index.js)
  ├─ resolvePaths()         → db/uploads/knowledge under ~/Library/Application Support/midnite
  ├─ findFreePort()         → dynamic loopback port (avoids 7777 clashes)
  ├─ startGatewayProcess()  → spawn gateway via Electron's node (ELECTRON_RUN_AS_NODE),
  │                           paths + port passed as MIDNITE_* env
  ├─ waitForHealth()        → poll GET /health before showing the window
  ├─ BrowserWindow          → preload injects window.__NEXT_PUBLIC_GATEWAY_URL
  └─ renderer URL:
        dev  → http://localhost:3000 (next dev) or $MIDNITE_WEB_URL
        prod → serveStatic(web/) over a second loopback port  (NOT file://)
```

The gateway honours `MIDNITE_GATEWAY_PORT / _DB_PATH / _UPLOADS_DIR`,
`MIDNITE_KNOWLEDGE_DIR`, `MIDNITE_CONFIG_PATH` (added in `gateway/src/lib/load-config.ts`).

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
moon run desktop:rebuild           # electron-rebuild better-sqlite3 + node-pty for Electron's ABI
```

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
