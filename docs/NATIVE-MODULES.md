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

## Why it used to break anyway (July 2026 post-mortem)

pnpm's **side-effects cache** stores native build output in the global
content-addressable store (`~/Library/pnpm/store/v3`) and materialises it into
every checkout via hardlinks. Electron-rebuild artifacts leaked into the cache
entry keyed `darwin-arm64-node-v22-…` (the tell: `build/Release/.forge-meta`, a
file only `@electron/rebuild` writes, sitting inside a *node* cache entry). A
poisoned entry re-infected **every checkout and worktree on the machine** on
each fresh `pnpm install`, so `pnpm rebuild` only ever fixed it until the next
desktop package run.

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

## Manual fix (if you ever see the crash anyway)

```bash
pnpm rebuild -r better-sqlite3 node-pty   # from the affected checkout's root
```

Then check `node_modules/.pnpm/better-sqlite3@*/node_modules/better-sqlite3/build/Release/`
— a `.forge-meta` file there means an Electron rebuild touched the workspace
copy; figure out what wrote it before moving on.
