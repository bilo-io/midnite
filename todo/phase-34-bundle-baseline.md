# Phase 34 — Bundle baseline & web performance

> Phase 33 (multi-user & teams) is the next functional milestone — Phase 34 runs alongside it as a **pure tooling + performance track**. Nothing here changes behaviour or the API contract; it only makes the web app cheaper to download and the build state easier to reason about.

> **Scope guardrails:** This phase is web-only (`packages/web`) except for Theme D's disk-accounting documentation. It does not touch the gateway, CLI, shared, or ui packages. No new user-facing features. No CI bundle-size gate (that comes after baseline is established — see Decisions §3).

> Effort tags: **S** small · **M** medium · **L** large.

---

## Why now?

`packages/web/.next/` weighs ~1.8 GB on disk — almost entirely the local build cache (1.6 GB `cache/`) plus ~147 MB of uncompressed JS/CSS chunks in `static/`. The cache is ephemeral; the static chunks are what users actually download. Before optimising anything, the team needs a **baseline**: a treemap of what's in those chunks and where the weight is.

Separately, Mac's Storage app shows the repo at 80 GB — a misleading figure caused by pnpm hardlinks + APFS local snapshots. A short dev-docs note will save the next person from a fruitless investigation.

---

## Theme A — Bundle analyzer setup + baseline report

No analyzer exists today; there is no baseline. This theme installs the tooling and captures the first measurement.

### A1. Install + wire `@next/bundle-analyzer` — **S**
- [ ] Add `@next/bundle-analyzer` as a `devDependency` in [`packages/web/package.json`](../packages/web/package.json).
- [ ] Wrap [`packages/web/next.config.mjs`](../packages/web/next.config.mjs) with `withBundleAnalyzer({ enabled: process.env.ANALYZE === 'true', openAnalyzer: false })`. Keep the existing `output: 'export'` and `transpilePackages` config intact — the analyzer works with static-export mode.
- [ ] Add a `bundle-report` task in [`packages/web/.moon/tasks.yml`](../packages/web/.moon/tasks.yml) (or the root [`moon/tasks.yml`](.moon/tasks.yml) if web doesn't have its own): `ANALYZE=true next build`. This writes the HTML treemap to `.next/analyze/`.

### A2. Generate + document the baseline — **S**
- [ ] Run `moon run web:bundle-report` once, capture the top-10 chunks by size from the generated HTML (open `.next/analyze/client.html` in a browser, screenshot or note the sizes).
- [ ] Record the baseline in this phase doc's **Decisions §4** (real numbers once run; placeholder below):
  - Main JS chunk: _TBD_ kB gzipped
  - Largest vendor chunks: _TBD_
  - Total first-load JS: _TBD_ kB

---

## Theme B — `optimizePackageImports` quick wins

Next.js 14+ can apply extra barrel-import optimisation for known large packages. One config change, no code edits.

### B1. Enable `experimental.optimizePackageImports` — **S**
- [ ] Add to `next.config.mjs`:
  ```js
  experimental: {
    optimizePackageImports: ['lucide-react', 'recharts', '@midnite/ui'],
  }
  ```
  `lucide-react` is the primary target (39 MB installed; named imports like `{ Check, X }` are already correct, but Next.js's extra pass improves tree-shaking further). `recharts` and `@midnite/ui` are secondary.
- [ ] Run `moon run web:build` (or `web:bundle-report`) after the change and compare chunk sizes — confirm `lucide-react` chunk shrinks or merges cleanly into page chunks.

---

## Theme C — Dynamic imports for view-heavy libraries

Several non-trivial libraries are currently bundled into the initial JS payload. They're all view-specific — the board/reports/workflow/audio views — so they can be deferred with `dynamic()` without affecting First Contentful Paint on the main kanban.

### C1. Audit + lazify `recharts` — **M**
- [ ] `grep -r "recharts" packages/web --include="*.tsx" -l` to find all import sites.
- [ ] Wrap each consuming component's import with `dynamic(() => import('./...'), { ssr: false })` — or extract a thin wrapper component that `dynamic`-imports the chart and use that wrapper at call sites.
- [ ] Confirm the reports/analytics view still renders correctly after deferral.

### C2. Audit + lazify `wavesurfer.js` — **S**
- [ ] `grep -r "wavesurfer" packages/web --include="*.tsx" -l` to find the import site.
- [ ] Wrap with `dynamic(() => import('./...'), { ssr: false })`.

### C3. Audit `@xyflow/react` (workflow canvas) — **S**
- [ ] `grep -r "@xyflow/react" packages/web --include="*.tsx" -l`.
- [ ] If not already deferred, wrap the workflow canvas component with `dynamic(() => import('./...'), { ssr: false })`.

### C4. Audit `react-grid-layout` — **S**
- [ ] Same grep + dynamic-import treatment as above.
- [ ] Confirm any grid-dependent resize behaviour still works after deferral.

---

## Theme D — Build hygiene + disk-accounting documentation

### D1. `.gitignore` audit — **S**
- [ ] Confirm all of the following are in [`packages/web/.gitignore`](../packages/web/.gitignore) (or root `.gitignore`):
  - `.next/`
  - `out/` (static export output for Electron)
  - `*.tsbuildinfo`
  - `.turbo/` (if moon/turbo caching ever lands)
- [ ] Add any that are missing. No committed build artefacts.

### D2. `clean` moon task — **S**
- [ ] Add a `clean` task to [`packages/web/.moon/tasks.yml`](../packages/web/.moon/tasks.yml): `rm -rf .next out` (safe to run anytime; both are gitignored build outputs).
- [ ] Add an aggregate `:clean` to the root [`.moon/tasks.yml`](.moon/tasks.yml) that fans out `web:clean` (and any other package-level clean tasks as they're added).

### D3. Disk-size documentation — **S**
- [ ] Write [`docs/DISK_SIZE.md`](../docs/DISK_SIZE.md) explaining the three sources of inflated reported sizes:
  1. **`.next/cache/`** — 1.6 GB of local webpack/SWC transpilation cache. Safe to delete at any time (`moon run web:clean`); regenerated on the next build. Not committed; not shipped to users.
  2. **pnpm hardlinks** — pnpm stores packages once in `~/.pnpm-store` and hardlinks them into every `node_modules`. Finder and `du` count each hardlink as the full file size; the actual unique bytes on disk are a fraction of the reported total. Multiple worktrees multiply the apparent size. Use `pnpm store status` or `pnpm store prune` to manage the store.
  3. **APFS local snapshots** — macOS Time Machine creates local snapshots hourly. System Preferences → Storage counts these against the used-space figure; `du` does not. A repo that `du` reports at 2 GB can appear as 30–80 GB in Storage because of accumulated snapshots. Run `tmutil deletelocalsnapshots /` to reclaim the space (snapshots are re-created automatically).

---

## Files this phase touches

| Area | Files |
|------|-------|
| **Next config** | [`packages/web/next.config.mjs`](../packages/web/next.config.mjs) |
| **Web deps** | [`packages/web/package.json`](../packages/web/package.json) |
| **Moon tasks** | [`packages/web/.moon/tasks.yml`](../packages/web/.moon/tasks.yml) · [`.moon/tasks.yml`](.moon/tasks.yml) |
| **gitignore** | [`packages/web/.gitignore`](../packages/web/.gitignore) (possibly root `.gitignore`) |
| **Dynamic-import sites** | `packages/web` components that import `recharts` / `wavesurfer.js` / `@xyflow/react` / `react-grid-layout` |
| **New docs** | [`docs/DISK_SIZE.md`](../docs/DISK_SIZE.md) |

---

## Verification

- [ ] `moon run web:bundle-report` completes without error; `.next/analyze/client.html` and `.next/analyze/server.html` open in a browser and show a readable treemap.
- [ ] After Theme B, re-run the report and confirm `lucide-react`'s chunk is smaller or absent from the main bundle.
- [ ] After Theme C, navigate to the reports view, workflow canvas, and any audio-player view — all load correctly (no blank screens, no console errors about missing chunks). Network tab confirms the heavy chunks are loaded lazily (after initial paint).
- [ ] `moon run web:clean` runs without error; `.next/` and `out/` are removed; the next `web:dev`/`web:build` regenerates them cleanly.
- [ ] `moon run :typecheck`, `moon run :lint`, `moon run :test` all green. Run web tests from the **primary checkout**, not a `.git` worktree (vite denies `.git/**`).
- [ ] `docs/DISK_SIZE.md` renders correctly in GitHub / a markdown viewer.

---

## Decisions / open questions

1. **`output: 'export'` + analyzer** — `next.config.mjs` uses static-export mode for the Electron desktop app. Bundle-analyzer works with static exports (the chunks are still in `.next/static/chunks/` pre-copy). If the HTML report is blank, temporarily comment out `output: 'export'`, run the report, then restore it. _Recommend: try with it on first._

2. **`packages/desktop` not in CLAUDE.md** — there is a `packages/desktop` package (Electron wrapper over the web static export) that explains the 708 MB `electron` install. It is not documented in `CLAUDE.md`. _Recommend: add a short entry to the repo-layout section of CLAUDE.md describing the desktop package and its relationship to `packages/web`._

3. **CI bundle-size gate (deferred)** — a `bundlewatch` or custom moon task that fails CI on regression is the right follow-up, but requires a baseline first. _Recommend: add the CI gate as Phase 35 Theme A once Theme A2 produces real numbers._

4. **Baseline numbers (fill in after A2)** — record here once `web:bundle-report` runs:
   - First-load JS total: _TBD_ kB gzipped
   - Largest chunk: _TBD_ kB (name: _TBD_)
   - `lucide-react` share pre-B1: _TBD_ kB
   - `lucide-react` share post-B1: _TBD_ kB

5. **Phaser chunk** — Phaser is already loaded via `dynamic(() => import('./office-view-impl'), { ssr: false })` in `office-view.tsx`. Confirm via the analyzer that it lands in its own chunk (not the main bundle). If it's bleeding in, add a further split at the scene-module level. No code change planned unless the baseline reveals a problem.
