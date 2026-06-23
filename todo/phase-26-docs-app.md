# Phase 26 — Docs app (`packages/docs`) on `@midnite/ui`

> [Phase 25](phase-25-ui-library.md) extracts a reusable `@midnite/ui` component library + design tokens and catalogues them in Storybook. **Phase 26 builds the consumer that proves it:** a standalone **Vite + React docs app** (`packages/docs`) whose entire shell is built from `@midnite/ui` — the real-world proof that the library is genuinely consumable outside `web`, and a single home for **both** the design-system documentation and the project's developer docs. Today the docs that exist ([`docs/ARCHITECTURE.md`](../docs/ARCHITECTURE.md), [`docs/INITIAL_PLAN.md`](../docs/INITIAL_PLAN.md), [`docs/TESTING_PLAN.md`](../docs/TESTING_PLAN.md), the README) are raw markdown with no browsable surface, and the design system will only live in Storybook (an interactive playground, not curated narrative). Phase 26 gives both a polished, navigable site — authored in **MDX** so prose and **live component examples** sit side by side.

> **This is the `docs` app you flagged when scoping Phase 25** ("later create a docs app that uses the ui lib as well"). It's deliberately a **hand-rolled Vite app that imports `@midnite/ui`**, *not* a docs framework (VitePress/Nextra/Astro) — a framework would ship its own components and defeat the point of dogfooding the library.

> **Scope guardrails (CLAUDE.md).** `docs` is a **new leaf app, a pure consumer of `@midnite/ui`** — it extends the graph with `ui ◀── docs` (joining `ui ◀── web`). It does **not** talk to the gateway (the docs site is **fully static** — no live data, no API client), does **not** import `@midnite/shared`/`web`/`gateway` internals, and does **not** duplicate the design tokens (it consumes the lib's token CSS). It reuses the lib's `ThemeProvider` for light/dark. New package auto-registers via `packages/*` (pnpm + moon). **Depends on [Phase 25](phase-25-ui-library.md)** — sequence after it.

> Effort tags: **S** small · **M** medium · **L** large. Themes ordered **A → B/C → D** (scaffold gates the content; B and C are independent). Every box starts unchecked — this is net-new work.

---

## Current state (baseline to build on)

- **packages:** `cli · desktop · gateway · shared · site · web` — and `ui` (incoming, Phase 25). **No `docs` app, no doc-site tooling** (no VitePress/Nextra/Astro/Docusaurus anywhere). `packages/*` auto-registers in [`pnpm-workspace.yaml`](../pnpm-workspace.yaml) + [`.moon/workspace.yml`](../.moon/workspace.yml).
- **content that exists:** [`docs/ARCHITECTURE.md`](../docs/ARCHITECTURE.md), [`docs/INITIAL_PLAN.md`](../docs/INITIAL_PLAN.md), [`docs/TESTING_PLAN.md`](../docs/TESTING_PLAN.md), [`README.md`](../README.md), [`CLAUDE.md`](../CLAUDE.md), and 30 `todo/phase-*.md` plans — all raw markdown, **no browsable surface**.
- **markdown stack already in repo:** `react-markdown` + `remark-gfm` (used by [`markdown-preview.tsx`](../packages/web/components/markdown-preview.tsx)) — reusable for rendering repo markdown.
- **the marketing site is separate:** [`packages/site`](../packages/site/) is **Next 15 + R3F** (the Phase 11 scrollytelling marketing rewrite) — a different package, stack, and audience. `docs` is the **developer / design-system** surface, not marketing; no overlap.
- **design system source (incoming):** Phase 25's `@midnite/ui` will expose primitives, a token CSS entry, and a `ThemeProvider` — the things this app consumes.

---

## Theme A — Docs app scaffold (Vite + `@midnite/ui`) — **M** — ✅ DONE (PR #123, 2026-06-23 — see [done.md](done.md))

Stand up the app as a clean consumer of the library.

- [x] **`packages/docs`** (`@midnite/docs`) — a Vite + React app: `package.json` (`"@midnite/ui": "workspace:*"` + React), `vite.config.ts` (MDX via `@mdx-js/rollup` + `remark-gfm`/frontmatter), `tsconfig.json`, Tailwind/PostCSS, `moon.yml` (`dev` / `build` / `preview` / `typecheck` / `test` / `lint`). Auto-registers in pnpm + moon.
- [x] **Shell from the lib** — header, grouped sidebar, content well + a theme switcher built from the lib's `Tabs` + `useTheme`; wrapped in the lib's `ThemeProvider`, token CSS from `@midnite/ui/styles`. No app-local primitives — the proof-of-consumption holds (no Phase 25 gap surfaced).
- [x] **Routing** (Decision §1, resolved → **hash router**) — any deep link works on a static host with no server rewrites; the route table **and** sidebar nav are both derived from the MDX content glob (`content/registry.ts`), so adding a page = adding a file (frontmatter sets `title`/`section`/`order`).
- [x] **Boundary check** (`src/boundary.test.ts`) — fails if `docs` imports anything in-repo other than `@midnite/ui`; enforces the `ui ◀── docs` leaf edge in CI.

---

## Theme B — Design-system documentation (MDX) — **M–L** — ✅ DONE (PR #123, 2026-06-23 — see [done.md](done.md))

Curated narrative docs for the library, complementing (not duplicating) Storybook (Decision §2).

- [x] **MDX authoring** (Decision §3) — `@mdx-js/rollup` so a page is markdown prose **with inline live JSX examples** rendered by the real `@midnite/ui` components; prose elements are themed via an MDXProvider mapping (`mdx-components.tsx`).
- [x] **A page per primitive** — Button / Card / Input / Switch / Tabs: usage guidance, canonical **live** examples (stateful ones interactive), props/variants, do/don't, and a "run the playground" pointer to Storybook (it stays the interactive/a11y source of truth — Decision §2; no controls re-implemented).
- [x] **Foundations pages** — colour palette (live `hsl(var(--token))` swatches + canonical light/dark HSL values), typography specimen, radius scale + a reserved-scales table — all driven from `@midnite/ui`'s **typed token map**, so they can't drift. Theming via the lib's `ThemeProvider` (light/dark/system/time).
- [x] **Getting-started** — install, import the token CSS, generate the utilities, wrap in `ThemeProvider`, use the primitives — the on-ramp a new consumer (incl. this docs app) follows.

---

## Theme C — Product / developer docs — **M** — ◐ PARTIAL (PR #127, 2026-06-23 — see [done.md](done.md); config reference deferred)

Make the project's existing markdown browsable, from one source of truth.

- [x] ◐ **Render the real repo markdown** (Decision §4 — **import, don't duplicate**): README + [`docs/ARCHITECTURE.md`](../docs/ARCHITECTURE.md) + [`docs/INITIAL_PLAN.md`](../docs/INITIAL_PLAN.md) + [`docs/TESTING_PLAN.md`](../docs/TESTING_PLAN.md) + [`docs/RELEASING.md`](../docs/RELEASING.md) are imported via `?raw` ([`content/product-docs.tsx`](../packages/docs/src/content/product-docs.tsx)) and rendered with `react-markdown` + `remark-gfm` (not the MDX pipeline — repo docs are full of bare `<…>`/`{…}` MDX would parse as JSX). ⏳ **config reference deferred**: there's no existing markdown to import (`midnite.json` is a zod schema in `shared`, which `docs` can't import under the leaf rule) — needs a hand-author-vs-schema-extract decision.
- [x] **Sidebar nav + GFM rendering** — product pages share the route table + sidebar with the DS docs, grouped under new **Guides · Architecture · Reference** sections (`SECTION_ORDER` extended); `remark-gfm` renders tables/task-lists/code.
- [x] **Keep prose styling in the lib's tokens** — `MarkdownPage` reuses the `mdx-components` prose mapping (the lib's type/spacing tokens), so product docs and DS docs read as one site.

---

## Theme D — Navigation, search & build seam — **S–M** — ◐ PARTIAL (PR #137, 2026-06-23 — see [done.md](done.md); on-page TOC + deploy deferred)

- [x] ◐ **Navigation** — below `md` the sidebar collapses behind a hamburger into a slide-in drawer (closed on navigation); pins as a column on `md+`. Active-route highlighting (NavLink) as before. ⏳ **on-page nav (TOC) deferred** — not required by the verification line; a follow-on.
- [x] **Client-side search** — a static index ([`content/search-index.ts`](../packages/docs/src/content/search-index.ts)) over page titles + markdown headings, filtered by the pure [`search.ts`](../packages/docs/src/content/search.ts); a header `DocSearch` shows ranked hits (title ≫ heading ≫ section) that navigate to the page. No server — the index ships in the bundle. (Product docs get full heading search; the `.mdx` DS pages are indexed by title/section — the MDX plugin strips the `?raw` query, so their source isn't readable without compiling.)
- [x] **Static build + deploy seam** — `moon run docs:build` emits a static site and `moon ci` builds it (landed with the Theme A scaffold, PR #123). The **deploy story** (GitHub Pages / static host) stays **deferred to a follow-on** (Decision §6).

---

## Out of scope (named, not built here)

- **The marketing `site`** ([Phase 11](phase-11-public-site-rewrite.md)) — separate package/stack/audience; `docs` doesn't touch it. (If the site later wants `@midnite/ui`, that's a separate coordination, not this phase.)
- **Live / gateway-connected content** — `docs` is **static**: no API client, no live board/usage data. Documenting the REST/WS API is prose, not a live console.
- **Replacing Storybook** — Storybook stays the interactive component playground + the a11y/interaction test runner (Phase 25 D); `docs` complements it.
- **Hosting / CD** — the deploy pipeline (GH Pages action, custom domain) is a deferred follow-on; this phase makes the app build.
- **Auto-generated API/prop docs from types** — hand-authored MDX this phase; a typedoc/react-docgen pipeline is a possible later upgrade.
- **Versioned docs** — single "latest" version only.

---

## Files this phase touches (map)

- **new `packages/docs/`:** `package.json` (`@midnite/ui` + React + router + MDX), `vite.config.ts` (MDX plugin), `tsconfig.json`, `moon.yml`, `index.html`, `src/` (app shell from `@midnite/ui`, router, nav/sidebar/search), `src/content/**` (MDX pages: DS components + foundations + guides), and build-time imports of the repo's [`docs/*.md`](../docs/) + README for the product-docs section.
- **`@midnite/ui` (Phase 25):** consumed as-is; if the docs shell needs a primitive the lib lacks, add it **in Phase 25's** lib (don't build app-specific primitives in `docs`).
- **No gateway/shared/web/cli changes.**
- **Docs/config:** update [`CLAUDE.md`](../CLAUDE.md) (add `docs` to the package list + the `ui ◀ docs` graph edge) + README (how to run the docs app); append to [`done.md`](../todo/done.md) as slices land.

---

## Verification

- [ ] `moon run docs:dev` serves the site; its entire shell renders via `@midnite/ui` primitives + tokens, with working light/dark/system theming from the lib's `ThemeProvider`.
- [ ] An MDX component page shows **live** `@midnite/ui` examples inline next to prose; the foundations pages render the real token palette/type/spacing scales; a "see it interactively" link goes to Storybook.
- [ ] The product-docs section renders the **actual** [`docs/ARCHITECTURE.md`](../docs/ARCHITECTURE.md) / [`docs/INITIAL_PLAN.md`](../docs/INITIAL_PLAN.md) / [`docs/TESTING_PLAN.md`](../docs/TESTING_PLAN.md) (imported, not copied — editing the source file updates the page).
- [ ] Sidebar nav groups DS vs product docs; client-side search filters pages; the site is responsive; **no network/gateway calls** (fully static).
- [ ] `docs` imports only `@midnite/ui` (boundary guard passes — nothing from `shared`/`web`/`gateway`).
- [ ] `moon run docs:build` produces a static site; `moon ci` builds it; `moon run :typecheck` · `:lint` · `:test` green across the graph. (Run web tests from the **primary checkout**, not a `.git` worktree.)

---

## Decisions / open questions

1. **Routing** *(open).* `react-router` (explicit route table) vs file-based MDX routing (a Vite plugin maps `src/content/**` to routes). Recommend file-based MDX routing so adding a doc = adding a file; confirm in the A PR.
2. **Storybook relationship** *(settled in brainstorm).* **Complement.** Storybook stays the interactive playground + test/a11y runner (Phase 25 D); `docs` is curated narrative + canonical live examples + foundations, linking to Storybook for the full prop matrix. No duplication.
3. **Authoring format** *(settled in brainstorm).* **MDX** — prose with inline live JSX examples, the natural fit for design-system docs. One format for explanation + demo.
4. **Repo markdown: import vs duplicate** *(recommend: import).* Render the **actual** `docs/*.md` + README at build time (MDX import or `?raw`) so docs can't drift from the repo's source of truth, rather than copying content into `packages/docs`.
5. **Content scope** *(settled in brainstorm).* **Design-system docs + core developer docs** (getting-started, architecture, config) — the full docs site, not DS-only. The 30 `todo/` phase plans are **not** rendered this phase (a "living roadmap" view is a possible follow-on).
6. **Deploy** *(open / deferred).* Where the static build is hosted (GitHub Pages action, a static host) is a follow-on; this phase ships a buildable app. Confirm the target when hosting is wanted.
7. **Dependency on Phase 25** *(sequencing).* Phase 26 consumes `@midnite/ui`; it can't start meaningfully until Phase 25's lib + token CSS + `ThemeProvider` exist. Plan accordingly.
