# Phase 25 — `@midnite/ui`: reusable component library & design system

> midnite's UI primitives live **inside the web app** — [`packages/web/components/ui/`](../packages/web/components/ui/) holds `button · card · input · select · styled-select · switch · tabs · textarea · accordion · collapse`, and the design tokens (shadcn-style HSL CSS vars + a `.dark` block + an [`app/theme/`](../packages/web/app/theme/) provider/script) sit in [`globals.css`](../packages/web/app/globals.css). They're solid and storied (Phase 10), but they're **trapped in `web`** — nothing else can consume them, and there's no single home for "the design system." **Phase 25 extracts a standalone, Vite-built [`@midnite/ui`](../packages/) component library** that owns the primitives **and** the design tokens, catalogues them in its own Storybook (with placeholder docs for the parts of the system not yet formalized), and is structured so the web app consumes it today and a **future `docs` app** consumes it later. This is **extraction + structure**, not a redesign — the components and tokens are the ones already in use; we give them a reusable home.

> **Scope guardrails (CLAUDE.md — this phase changes the dependency graph).** `@midnite/ui` is a **new leaf package that depends on nothing else in the repo** (Decision §1): React (peer) + its own styling, no `@midnite/shared`, no gateway/web internals. The one-way graph gains a branch:
> ```
> shared ◀── gateway · cli · web
> ui     ◀── web   (later: docs, possibly site)
> ```
> Only **domain-agnostic primitives + tokens** migrate; anything coupled to domain types (`TaskCard`, `asset-search-select`, the board/office) **stays in web**. The library is built with **Vite library mode** (a deliberate divergence from the repo's `tsc -b` convention — Vite bundles JSX/CSS/assets that tsc won't; typecheck still runs via tsc). New wire/types are **not** introduced — this is a presentation layer. **CLAUDE.md's "Package Boundaries" + dependency graph + the Web styling note get updated** to record `ui` as the design-system source of truth.

> Effort tags: **S** small · **M** medium · **L** large. Themes are ordered **A → B → C → D** (the package + token foundation gate the migration + catalogue). Every box starts unchecked — this is net-new work.

---

## Current state (baseline to build on)

- **packages:** `cli · desktop · gateway · shared · site · web` — **no `ui` package**. [`pnpm-workspace.yaml`](../pnpm-workspace.yaml) and [`.moon/workspace.yml`](../.moon/workspace.yml) both glob `packages/*`, so a new `packages/ui` **auto-registers** in pnpm + moon.
- **primitives (the migration targets):** [`packages/web/components/ui/`](../packages/web/components/ui/) — `button · card · input · select · styled-select · switch · tabs · textarea · accordion · collapse` (generic) plus `asset-search-select` (**domain-coupled — stays in web**).
- **tokens & theme:** shadcn-style HSL CSS vars in [`globals.css`](../packages/web/app/globals.css) (`--background/--foreground/--card/--primary/--secondary/--muted/--accent/--destructive…`, light + `.dark`) + [`app/theme/`](../packages/web/app/theme/) (`theme-context.tsx`, `theme-script.ts`) + [`theme-toggle.tsx`](../packages/web/components/theme-toggle.tsx). Currently owned by `web`.
- **Storybook:** `@storybook/nextjs-vite` in web, `stories: ['../components/**/*.stories.tsx']`, addons `@storybook/addon-vitest` + `@storybook/addon-a11y` (Phase 10 C). **19 stories**; the addon-vitest run executes them as browser tests (Phase 10 C1/C3) — coverage that must survive the migration.
- **build convention:** library packages build with `tsc -b` (e.g. [`shared`](../packages/shared/) — ESM, `"type":"module"`, an `exports` map with subpaths, `dist/`). No Vite-library package exists yet.
- **styling:** the primitives use utility classes via a `cn()` helper (Tailwind appears wired now — CLAUDE.md's "Tailwind not yet" note is likely stale; this phase confirms + records it).

---

## Theme A — Package scaffold & Vite library build — **M** — ✅ DONE (PR #50, 2026-06-21)

Stand up the package and its build before moving anything into it. **Landed — see [done.md](done.md).**

- [x] **`packages/ui` (`@midnite/ui`)** — `package.json` with `"type":"module"`, **React/React-DOM as `peerDependencies`** (not bundled), and an `exports` map mirroring [`shared`](../packages/shared/)'s subpath pattern (`.` for components, `./styles` for the token CSS, `./theme` for the provider).
- [x] **Vite library mode** — `vite.config.ts` with `build.lib` (ESM output) + `vite-plugin-dts` for `.d.ts`; externalizes every declared + peer dep. Decision §4 settled: the lib **ships compiled CSS + the token CSS entry** (framework-agnostic), documented in the package README.
- [x] **`moon.yml`** with `build` (vite build), `typecheck`, `lint`, `test` (vitest); leaf position (no `dependsOn`); `moon ci` picks it up via `packages/*`. (`storybook`/`build-storybook` deferred to Theme D, where Storybook is installed.)
- [x] **Boundary check:** `src/boundary.test.ts` fails if `@midnite/ui` imports any in-repo package (`shared`/`web`/`gateway`/…) — enforces the leaf in CI.

---

## Theme B — Tokens & theming as the design-system foundation — **M** — ✅ DONE (PR #57, 2026-06-21)

The library owns the design system's source of truth (Decision §1 — tokens move, not just components). **Landed — see [done.md](done.md).**

- [x] **Move the token set** — HSL CSS vars + `.dark` block now in `@midnite/ui/styles` (`tokens.css`, framework-agnostic) + a typed token map in `src/tokens`; web imports the lib's token CSS and keeps only app-specific globals (`--nav-offset`).
- [x] **Move the theme runtime** — `ThemeProvider` / `useTheme` / theme-context + the no-flash script now in `@midnite/ui/theme` (the Vite build preserves `'use client'` for RSC); web re-exports via shims. (`theme-toggle` deferred to Theme C — it composes the `Button` primitive that moves there.)
- [x] **Scaffold the full DS taxonomy with placeholders** — `color` + `radius` filled; `spacing`/`typography`/`shadow`/`zIndex`/`motion` present as clearly-marked placeholders.

---

## Theme C — Migrate the primitives + their stories — **M–L** — ✅ DONE (PR #65, 2026-06-21)

Move the generic primitives in, keep web working with zero churn (Decision §2 — re-export shim first). **Landed — see [done.md](done.md).**

- [x] **Move** the 10 generic primitives (button, card, input, select, styled-select, switch, tabs, textarea, accordion, collapse) into `@midnite/ui/src/components` — logic-identical, only the `cn` import rewritten. `styled-select` moved (generic, wraps react-select); `asset-search-select` stays in web (domain-coupled).
- [x] **Re-export shim** — `web/components/ui/*` are now thin re-exports of `@midnite/ui`; every import site compiles unchanged. Import-rewrite codemod deferred (Decision §2).
- [◐] **Preserve Phase 10 coverage** — the primitive `*.stories.tsx` **stay in web** for now (still running in web's Storybook, consuming the shims → no regression); they migrate to the lib's own Storybook in **Theme D**.

---

## Theme D — Storybook catalog + docs-app seam — **S–M** — ✅ DONE (PR #69, 2026-06-21)

The library's Storybook is the component catalog and v1 design-system docs (Decision §3). **Landed — see [done.md](done.md). Phase 25 is complete.**

- [x] **Storybook in `@midnite/ui`** — `@storybook/react-vite` + `addon-a11y` + `addon-vitest` (+ `addon-docs` for MDX), pinned to Phase 10's versions. Primitive stories authored fresh (the primitives had none); `moon run ui:test` runs them as chromium browser tests (Phase 10 C1 parity) alongside the node unit tests.
- [x] **Design-system docs (MDX)** — `Design System/*` pages: colour-token palette, typography specimen, radius scale + clearly-marked placeholders for spacing/shadow/z-index/motion, and a getting-started on-ramp.
- [x] **Docs-app seam** — the lib is cleanly consumable (working `exports`, token CSS, peer React); Storybook is the v1 docs surface. `packages/docs` (Phase 26) can now import it.

---

## Out of scope (named, not built here)

- **Domain components** — `TaskCard`, `SessionCard`, `asset-search-select`, the kanban board, the office, dashboard widgets, modals tied to domain shapes: these depend on `@midnite/shared` types and **stay in `web`**. The lib is primitives + tokens.
- **A standalone `docs` app** — deferred to a future phase; this phase only makes the lib consumable by one (Theme D).
- **A visual redesign / restyle** — extraction preserves current appearance; changing the look is a separate effort.
- **Migrating `site` (Phase 11) onto the lib** — [Phase 11](phase-11-public-site-rewrite.md) is mid-flight (PR #44) and is porting web's theme system; once both settle, the site can adopt `@midnite/ui` tokens as the shared source — **coordinate later, don't entangle** this phase with the in-flight site work.
- **The import-rewrite codemod** — the shim ships now; the sweep that removes it is a follow-on (Decision §2).
- **Publishing to a registry** — `@midnite/ui` is a workspace package (`workspace:*`), not an npm-published artifact, this phase.

---

## Files this phase touches (map)

- **new `packages/ui/` (`@midnite/ui`):** `package.json` (peer React, `exports`), `vite.config.ts` (lib mode + dts), `tsconfig.json`, `moon.yml`, `src/` (migrated primitives + their stories), `src/styles/tokens.css` + typed token map, `src/theme/` (provider + script + `useTheme` + `theme-toggle`), `.storybook/` (`react-vite` + a11y + vitest) and MDX DS docs.
- **web:** [`components/ui/`](../packages/web/components/ui/) primitives become **re-export shims** of `@midnite/ui`; [`globals.css`](../packages/web/app/globals.css) imports the lib's token CSS (drop the duplicated token block, keep app-specific globals); [`app/theme/`](../packages/web/app/theme/) re-exports the lib's theme runtime; [`package.json`](../packages/web/package.json) adds `"@midnite/ui": "workspace:*"`. web's Storybook keeps domain stories; primitive stories move to the lib.
- **No gateway/shared/cli changes.**
- **Docs:** update [`CLAUDE.md`](../CLAUDE.md) — add `ui` to the **Package Boundaries** graph + the leaf rule, and refresh the **Web › Styling** note (design tokens + primitives now live in `@midnite/ui`; Tailwind status); README; append to [`done.md`](done.md) as slices land.

---

## Verification

- [ ] `moon run ui:build` produces an ESM bundle + `.d.ts`; `moon run ui:storybook` shows every migrated primitive; `moon ci` includes the new package.
- [ ] `@midnite/ui` imports **nothing** from `@midnite/shared`/`web`/`gateway` (boundary guard passes).
- [ ] `import { Button, Card, Select } from '@midnite/ui'` works in `web`; the app renders identically (extraction is behaviour-preserving), and existing `web/components/ui/*` import sites compile unchanged via the shim.
- [ ] The token CSS from the lib drives the app's theme; light/dark/system/time all work via the lib's `ThemeProvider`; no visual regression and no token duplication left in web.
- [ ] The lib's Storybook runs the migrated stories as browser tests with **a11y + interaction** checks (Phase 10 parity); web's Storybook still covers its domain components; total story coverage is not reduced.
- [ ] The DS docs show a token palette + typography/spacing specimens with clearly-marked placeholders for unfinished parts.
- [ ] A throwaway check (or the eventual docs app) can `import '@midnite/ui'` + its token CSS from outside `web` — proving the consumable seam.
- [ ] `moon run :typecheck` · `moon run :lint` · `moon run :test` green across the graph; `moon ci` green. (Run web tests from the **primary checkout**, not a `.git` worktree.)

---

## Decisions / open questions

1. **What migrates / boundary** *(settled in brainstorm).* **Generic primitives + design tokens only.** `@midnite/ui` depends on nothing else in-repo (no `@midnite/shared`); domain-coupled components stay in `web`. Cleanest leaf.
2. **Web migration strategy** *(settled in brainstorm).* **Re-export shim first** — `web/components/ui/*` re-export `@midnite/ui` so existing imports keep working; the import-rewrite **codemod is a later sweep**.
3. **Docs app** *(settled in brainstorm).* **Structure the lib for it; Storybook is the v1 docs.** The separate `packages/docs` app is a future phase (your "later" note), not built now.
4. **Styling system in the lib** *(open).* Ship the lib's **compiled CSS + token CSS** (consumers import a stylesheet; framework-agnostic) **vs.** a **shared Tailwind preset/config** the lib + consumers extend (since web uses utility classes). Recommend shipping compiled CSS + the token CSS so the lib works for any consumer (incl. a non-Tailwind docs app); confirm in the A PR — and confirm whether Tailwind is in fact wired so CLAUDE.md's note can be corrected.
5. **Export granularity** *(open).* A single `.` entry exporting all primitives vs **per-component subpath exports** (`@midnite/ui/button`) for tree-shaking. Recommend a single ESM entry (Vite tree-shakes named exports) + the `./styles`/`./theme` subpaths; revisit if bundle size demands per-component paths.
6. **Storybook split** *(open).* Primitive stories live in the **lib's** Storybook; web keeps domain-component stories. Confirm there's no value in a single aggregated Storybook (e.g. via composition) — likely defer composition until the docs app exists.
7. **Vite-lib divergence from `tsc -b`** *(recommend: accept).* The lib is the one package built with Vite (JSX/CSS/asset bundling); every other package keeps `tsc -b`. Document the why so it isn't seen as inconsistency.
