# Native Modules & ABI

The gateway ships two native (C++) modules: **better-sqlite3** and **node-pty**.
A native `.node` binary is compiled against exactly one ABI, and this repo needs
the same packages built for **two different ABIs**:

| Runtime | ABI (`process.versions.modules`) | Who needs it |
| --- | --- | --- |
| Node 22 (pinned in `.prototools`) | **127** | gateway dev/test, CLI, everything local |
| Electron 33 (the desktop app) | **130** | the packaged desktop build only |
| Node 23 / Node 24 | 131 / 137 | *nobody — see below* |

> **The classic crash:** `...better_sqlite3.node was compiled against a
> different Node.js version ... NODE_MODULE_VERSION 130 ... requires 127`.
> ABI 130 is **Electron 33, not Node 23/24** — the workspace copy was clobbered
> by an Electron build. It is *not* a wrong-Node-version problem.

## How the two ABIs are kept apart

- The workspace `node_modules` always holds the **Node** build (what
  `prebuild-install` fetches for the running Node).
- The desktop packaging flow (`packages/desktop/scripts/stage-gateway.mjs`)
  stages a separate tree under `packages/desktop/build-staging/gateway/` with
  `pnpm deploy`, then `electron-rebuild`s **only that tree** for Electron's ABI.
  "Only that tree" is not free — it takes both defences in §4 below. Passing
  electron-rebuild `-m <staged tree>` does **not** achieve it.

## Why it used to break anyway (July 2026 post-mortem)

pnpm's **side-effects cache** stores native build output in the global
content-addressable store (`~/Library/pnpm/store/v3`) and materialises it into
every checkout via hardlinks. Electron-rebuild artifacts leaked into the cache
entry keyed `darwin-arm64-node-v22-…` (the tell: `build/Release/.forge-meta`, a
file only `@electron/rebuild` writes, sitting inside a *node* cache entry). A
poisoned entry re-infected **every checkout and worktree on the machine** on
each fresh `pnpm install`, so `pnpm rebuild` only ever fixed it until the next
desktop package run.

## Why it broke anyway, again (August 2026 post-mortem)

The `.npmrc` fix closed the *store* channel, but a second one stayed open for
months — visible on every desktop build as an `ERR_DLOPEN_FAILED` stack trace and
a `⚠ native module ABI mismatch` banner that the `ensure-native` guard then
self-healed. Two compounding causes, both in `@electron/rebuild`'s module walk:

1. **`-m` does not scope anything.** It sets where the walk *starts*; the bound is
   `projectRootPath`, which the **CLI** derives by climbing to the nearest lockfile
   (`cli.js`: `getProjectRootPath(process.cwd())`) — i.e. the **repo root**. The walk
   therefore collected every `node_modules` between the staged tree and the repo
   root, recursed into pnpm's hidden `.pnpm/node_modules` hoist dir, found the
   workspace `better-sqlite3`/`node-pty`, and rebuilt them for ABI 130. The CLI has
   no flag for `projectRootPath`; only the programmatic API can set it.
2. **A bound is not enough on its own.** The walk resolves realpaths and recurses
   into `<realpath>/node_modules`, so a single symlink out of the staged tree leads
   it straight back to the workspace. `pnpm deploy` leaves exactly one:
   `.pnpm/node_modules/@midnite/gateway` → the source package.

Tells: `.forge-meta` in the workspace store entry (as in the 2026-07 post-mortem),
and `electron-rebuild` reporting **four** modules (`better-sqlite3, node-pty,
better-sqlite3, node-pty`) where the staged tree only has two — it was rebuilding
each module twice, once in staging and once in the workspace.

## The defences (all must stay in place)

1. **Root `.npmrc`** — `side-effects-cache=false` (native build output is never
   shared through the global store) and `package-import-method=clone-or-copy`
   (`node_modules` files never share inodes with the store, so in-place writes
   can't propagate). Install cost: `prebuild-install` re-runs per fresh install
   (~seconds, it's a prebuild download).
2. **`gateway:ensure-native`** (`packages/gateway/scripts/ensure-native-abi.mjs`)
   — a preflight that `gateway:dev` and `gateway:test` depend on. It loads both
   modules in a child process and, on an ABI mismatch, self-heals with
   `pnpm rebuild -r better-sqlite3 node-pty` (once), failing loud otherwise.
3. **Stage-time guard** — `stage-gateway.mjs` runs the same script against the
   workspace right after its `electron-rebuild` step, so any new contamination
   channel fails the desktop stage immediately instead of crashing an unrelated
   gateway session days later.
4. **A bounded, closed-graph rebuild** (`packages/desktop/scripts/rebuild-native.mjs`)
   — the two halves of the August 2026 fix, and they only work together:
   - `rebuild()` is called through the **programmatic API** with
     `projectRootPath: <staged tree>`, so the ancestor walk stops at the staged tree
     instead of climbing to the repo root. **Never** go back to
     `pnpm exec electron-rebuild` here: the CLI cannot set this, and `-o/--only`
     is not a substitute (the walker matches by module *basename*, which is
     identical for the workspace and staged copies).
   - `pruneEscapingSymlinks()` deletes any symlink under the staged tree whose
     realpath falls outside it, so the walk cannot be led back out. These links are
     dead weight in a shipped app anyway — they point into the build machine's home
     directory.

   It also asserts (via the `module-found` lifecycle event) that both modules were
   actually found: bounding the walk turns "rebuilt the wrong tree" into the quieter
   failure "rebuilt nothing", which would silently ship Node-ABI binaries.

## Manual fix (if you ever see the crash anyway)

```bash
pnpm rebuild -r better-sqlite3 node-pty   # from the affected checkout's root
```

Then check `node_modules/.pnpm/better-sqlite3@*/node_modules/better-sqlite3/build/Release/`
— a `.forge-meta` file there means an Electron rebuild touched the workspace
copy; figure out what wrote it before moving on.
