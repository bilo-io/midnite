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
- [x] Add `@next/bundle-analyzer` as a `devDependency` in [`packages/web/package.json`](../packages/web/package.json).
- [x] Wrap [`packages/web/next.config.mjs`](../packages/web/next.config.mjs) with `withBundleAnalyzer({ enabled: process.env.ANALYZE === 'true', openAnalyzer: false })`. Keep the existing `output: 'export'` and `transpilePackages` config intact — the analyzer works with static-export mode.
- [x] Add a `bundle-report` task in [`packages/web/moon.yml`](../packages/web/moon.yml): `ANALYZE=true next build`. This writes the HTML treemap to `.next/analyze/`.

### A2. Generate + document the baseline — **S**
- [x] Run `moon run web:bundle-report` (2026-06-24). Top-10 uncompressed JS chunks:
  1. `6676e8bd.js` — 1.1 MB (lazy: DashboardGrid / recharts / react-grid-layout)
  2. `1292.js` — 436 kB
  3. `2f6c9bbc.js` — 280 kB (lazy: @xyflow/react workflow editor)
  4. `framework-....js` — 188 kB (React framework, always loaded)
  5. `a0f49a59.js` — 172 kB (shared vendor, gzip: 54 kB)
  6. `1106.js` — 172 kB (shared vendor, gzip: 47 kB)
  7. `8220.js` — 144 kB
  8. `8095.js` — 136 kB
  9. `main.js` — 128 kB (Next.js runtime)
  10. `polyfills.js` — 112 kB (always loaded)
- [x] Baseline recorded:
  - **First-load JS (shared, gzipped):** 104 kB
  - **Largest lazy chunk:** 1.1 MB uncompressed (dashboard, recharts — already deferred)
  - **Typical page add:** 1.8–21 kB + 104 kB shared

---

## Theme B — `optimizePackageImports` quick wins

Next.js 14+ can apply extra barrel-import optimisation for known large packages. One config change, no code edits.

### B1. Enable `experimental.optimizePackageImports` — **S**
- [x] Add to `next.config.mjs`:
  ```js
  experimental: {
    optimizePackageImports: ['lucide-react', 'recharts', '@midnite/ui'],
  }
  ```
  `lucide-react` is the primary target (39 MB installed; named imports like `{ Check, X }` are already correct, but Next.js's extra pass improves tree-shaking further). `recharts` and `@midnite/ui` are secondary.
- [x] Confirmed: `optimizePackageImports` active for `lucide-react`, `recharts`, `@midnite/ui`. Baseline first-load JS shared: 104 kB gzipped (good). Lucide-react icons tree-shaken into page-specific chunks; no large stand-alone lucide chunk in top-10.

---

## Theme C — Dynamic imports for view-heavy libraries

Several non-trivial libraries are currently bundled into the initial JS payload. They're all view-specific — the board/reports/workflow/audio views — so they can be deferred with `dynamic()` without affecting First Contentful Paint on the main kanban.

### C1. Audit + lazify `recharts` — **M**
- [x] `grep -r "recharts" packages/web --include="*.tsx" -l` → single import site: `components/market-asset-widget.tsx`.
- [x] Already deferred: `MarketAssetWidget` is only rendered inside `DashboardGrid`, which is itself `dynamic()`-imported in `app/(main)/dashboard/page.tsx` (C4). No extra wrapping needed — recharts is not in the initial bundle.
- [x] Confirm: no recharts imports outside the dashboard-grid tree (stories + tests excluded).

### C2. Audit + lazify `wavesurfer.js` — **S**
- [x] `grep -r "wavesurfer" packages/web --include="*.tsx" -l` → `components/wavesurfer-player.tsx` (the implementation) + `app/(main)/media/[id]/media-detail-view.tsx` (the consumer).
- [x] Already deferred: `media-detail-view.tsx` already uses `dynamic(() => import('./wavesurfer-player')..., { ssr: false })`. wavesurfer.js is not in the initial bundle.

### C3. Audit `@xyflow/react` (workflow canvas) — **S**
- [x] `grep -r "@xyflow/react" packages/web --include="*.tsx" -l`.
- [x] `WorkflowEditor` in `app/(main)/workflows/edit/page.tsx` dynamically imported with `{ ssr: false }`.

### C4. Audit `react-grid-layout` — **S**
- [x] `DashboardGrid` in `app/(main)/dashboard/page.tsx` dynamically imported with `{ ssr: false }`.
- [x] Confirm grid-dependent resize behaviour still works after deferral.

---

## Theme D — Build hygiene + disk-accounting documentation

### D1. `.gitignore` audit — **S**
- [x] Added to [`packages/web/.gitignore`](../packages/web/.gitignore): `.next/`, `out/`, `*.tsbuildinfo`, `.turbo/`.

### D2. `clean` moon task — **S**
- [x] Added `web:clean` task (`rm -rf .next out`) to [`packages/web/moon.yml`](../packages/web/moon.yml).
- [x] Added aggregate `root:clean` to [`moon.yml`](../moon.yml) that fans out to `web:clean`.

### D3. Disk-size documentation — **S**
- [x] Write [`docs/DISK_SIZE.md`](../docs/DISK_SIZE.md) explaining the three sources of inflated reported sizes:
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

- [x] `moon run web:bundle-report` completes without error; `.next/analyze/client.html` and `.next/analyze/server.html` open in a browser and show a readable treemap.
- [x] After Theme B, re-run the report (2026-06-24) and confirmed `lucide-react` is **absent from the shared first-load bundle**: the 104 kB shared payload is just `1106` (46.7 kB) + `a0f49a59` (54.2 kB) + 3.2 kB other — neither shared chunk contains lucide. With `optimizePackageImports` active, lucide icons are tree-shaken into per-route chunks (≤23 kB in any single chunk; 359 kB total spread across all routes), so no single page pays for icons it doesn't render.
- [x] After Theme C, `DashboardGrid` and `WorkflowEditor` are dynamically imported; heavy libs deferred.
- [x] `moon run web:clean` runs without error (task confirmed in moon.yml).
- [x] `moon run :typecheck` (shared/gateway/cli/web/ui), `moon run :test` — 906 gateway + 505 web tests pass.
- [x] `docs/DISK_SIZE.md` renders correctly in GitHub / a markdown viewer.

---

## Decisions / open questions

1. **`output: 'export'` + analyzer** — `next.config.mjs` uses static-export mode for the Electron desktop app. Bundle-analyzer works with static exports (the chunks are still in `.next/static/chunks/` pre-copy). If the HTML report is blank, temporarily comment out `output: 'export'`, run the report, then restore it. _Recommend: try with it on first._

2. **`packages/desktop` not in CLAUDE.md** — there is a `packages/desktop` package (Electron wrapper over the web static export) that explains the 708 MB `electron` install. It is not documented in `CLAUDE.md`. _Recommend: add a short entry to the repo-layout section of CLAUDE.md describing the desktop package and its relationship to `packages/web`._

3. **CI bundle-size gate (deferred)** — a `bundlewatch` or custom moon task that fails CI on regression is the right follow-up, but requires a baseline first. _Recommend: add the CI gate as Phase 35 Theme A once Theme A2 produces real numbers._

4. **Baseline numbers** — recorded from `web:bundle-report` (2026-06-24, post-B1 config):
   - First-load JS total: **104 kB gzipped** (shared by all routes: `1106` 46.7 kB + `a0f49a59` 54.2 kB + 3.2 kB other)
   - Largest chunk: **1.16 MB parsed** (name: `6676e8bd.js` — dashboard / recharts / react-grid-layout, lazy-loaded, not in first-load)
   - `lucide-react` share pre-B1: **not A/B-measured** — measuring it would require temporarily reverting `optimizePackageImports` (out of scope for this verification slice; the post-B1 distribution below already confirms the goal — no lucide in the shared bundle)
   - `lucide-react` share post-B1: **0 kB in the shared first-load bundle** (absent). 359 kB total tree-shaken across per-route chunks (max ≤23 kB in any single chunk), so each page loads only the icons it renders.

5. **Phaser chunk** — Phaser is already loaded via `dynamic(() => import('./office-view-impl'), { ssr: false })` in `office-view.tsx`. Confirm via the analyzer that it lands in its own chunk (not the main bundle). If it's bleeding in, add a further split at the scene-module level. No code change planned unless the baseline reveals a problem.
