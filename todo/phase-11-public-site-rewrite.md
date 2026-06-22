# Phase 11 — Public site rewrite

> The current marketing site ([`packages/site/`](../packages/site/)) is a dark-only, single-scroll Next.js App Router page with an R3F particle backdrop ([`components/scene/`](../packages/site/components/scene/)), a hero, a few feature sections, and a download page. **Phase 11 is a complete rewrite of the public site** into a modern, Apple-grade experience: one **persistent preview panel** that travels and resizes between sections, a **cursor-following 3D particle field** that restyles per section, **typed** section titles, an **epic hero**, a restyled **download page**, and **legal pages** with their own sidebar sub-layout. Same multi-theme support as the web app.

> **Scope:** `packages/site/` only. This is a marketing/static site — it never imports gateway internals; the only cross-package reuse is **`@midnite/shared`** types (if any) and **copied static assets** (favicons/logo) from the web app. Keep the package boundaries clean (CLAUDE.md): no reaching into `@midnite/web` internals — duplicate or copy the small bits the site needs (theme tokens, favicon files).

> Effort tags: **S** small · **M** medium · **L** large. Themes are largely independent and individually shippable; suggested order in Decisions §1.

> **Design north star.** Apple-product-page polish: lots of calm negative space, **subtle** 3D (depth/parallax, never gaudy), everything eased and transitioned, content that reveals as you scroll. The hero is the one place we go *epic*; the rest is clean and confident. Motion must **degrade gracefully** under `prefers-reduced-motion` (no typing animation, no particle drift, instant panel placement).

---

## The core mechanic (read first)

The page is a **scrollytelling** layout built from three persistent, always-mounted layers that the page content drives:

1. **Particle field** (Theme B) — a fixed, full-viewport WebGL layer behind everything; loosely follows the cursor; its *style* (palette, density, motion) lerps as the active section changes.
2. **The preview panel** (Theme C) — a **single** Mac-window-styled panel (red/yellow/green dots) that **persists across the whole page**. Each section declares a target **rect (x/y/width/height)** and a **content module**; as you scroll, the panel **animates its position and size** to the active section's rect (smooth FLIP/shared-layout transition) and **cross-fades** its inner content. The hero's target is *centred, ~grid-card sized*.
3. **Section text** (Theme D) — the per-section copy that lives *outside* the panel: a **title + subtitle that type out quickly** on entry, then any remaining elements **fade in** after the typing finishes.

A scroll/section controller (Theme D) is the single source of truth for "which section is active," and all three layers subscribe to it. One `IntersectionObserver` + a progress ref (reuse [`use-scroll-progress.ts`](../packages/site/components/scene/use-scroll-progress.ts)); no per-scroll React re-renders on the hot path.

---

## Theme A — Foundations (themes, shell, fonts, favicon) — ✅ DONE (PR #44, 2026-06-21)

### A1. Multi-theme support (parity with the web app) — **M**
- [x] Port the web app's theme system to the site: the **HSL CSS-variable tokens** + `.dark` block from [`packages/web/app/globals.css`](../packages/web/app/globals.css), a **`ThemeProvider`** (light / dark / **system** / **time**) modelled on [`packages/web/app/theme/theme-context.tsx`](../packages/web/app/theme/theme-context.tsx), and a no-flash inline **theme script** (cf. `theme-script.ts`). Use the **same `localStorage` key** so a visitor's choice is consistent with the app.
- [x] Replace the hardcoded `dark` class on `<html>` in [`app/layout.tsx`](../packages/site/app/layout.tsx) with the provider; add a **theme toggle** to the nav (port/adapt [`theme-toggle.tsx`](../packages/web/components/theme-toggle.tsx)).
- [x] Every new surface (panel, particles, text, download, legal) reads from tokens so both themes look intentional — not just an inverted dark page.

### A2. Favicon & brand assets — **S**
- [x] Use the **same favicon as the web app** — copy `favicon.ico`, `favicon-16x16.png`, `favicon-32x32.png`, `apple-touch-icon.png` (and `logo.PNG`) from [`packages/web/public/`](../packages/web/public/) into a new `packages/site/public/`, and wire `metadata.icons` in [`app/layout.tsx`](../packages/site/app/layout.tsx) exactly like the web layout. (Static copy, not a cross-package import — keeps the boundary clean; note the source of truth in a comment so they stay in sync.)
- [x] Keep the existing `cyberwar.ttf` brand font; confirm OG/Twitter metadata still reads well.

### A3. Layout shell & nav — **S–M**
- [x] App Router shell: a sticky, translucent **nav** (wordmark + links: Features / Download / GitHub + theme toggle) and a refined **footer** (add legal links — Theme H). Both restyled to the new look; reuse the existing nav/footer as a starting point.

---

## Theme B — Persistent cursor-following particle field — ⏳ REMOVED for now (PR #68, 2026-06-21)

> **Update (PR #68):** the WebGL/R3F particle field was **removed for now** — `components/scene/` and the `@react-three/*`/`three` deps are gone, replaced by a static CSS `AmbientBackdrop` (soft brand-tinted blurs). It originally shipped in PR #59 (per-section + theme-aware field); parked, not deleted from history. Revisit if/when we want the 3D back.

> Evolve the existing [`scene/`](../packages/site/components/scene/) (R3F + custom shader, already cursor-aware via `usePointer`) rather than starting over.

### B1. Cursor-follow & always-on field — **M**
- [x] The particle field **loosely follows the cursor** (eased lerp toward pointer, not a hard lock) and remains a fixed, `pointer-events-none`, full-viewport backdrop across **all** sections (it currently exists; make it the persistent base layer). Single `<Canvas>` for the whole page.
- [x] Drive colours from the **active theme tokens** so the field recolours on theme switch (light vs dark palettes), not a fixed dark-only ramp.

### B2. Per-section particle styles (transitioned) — **M**
- [x] Each section defines a **particle style** — palette accent, density/size, motion character (e.g. calm drift → faster swirl → grid-snap). On section change, **lerp the shader uniforms** between styles so the look shifts *slightly* and *smoothly* (no hard cut). Subtle is the goal.
- [x] Tie the style set to the section registry (Theme D) so adding a section = adding a style entry.

### B3. Performance & reduced motion — **S**
- [x] Cap DPR, pause the rAF loop when the canvas is offscreen/tab hidden, and **disable drift + cursor-follow** under `prefers-reduced-motion` (render a static field). Keep 60fps on a mid laptop.

---

## Theme C — The persistent preview panel — ✅ DONE (PR #59, 2026-06-21)

> The signature element: one Mac-window panel that lives for the whole page and morphs between sections.

> **Refinement (PR #68):** the panel now carries the brand `gradient-border` — subtle at rest, becoming a pronounced rotating conic gradient + breathing glow pulse on hover/focus (`.panel-glow`); degrades under reduced motion.

### C1. Panel chrome & persistence — **M**
- [x] A single **`<PreviewPanel>`** rendered once at the page root (not per section), styled as a **macOS window**: rounded corners, subtle shadow/depth (the "subtle 3D"), translucent token-driven surface, and the **three red/yellow/green traffic-light dots** in the top-left, **always** present.
- [x] The panel is **shared across sections** — implement with a shared-layout/FLIP technique (Framer Motion `layoutId`, or a measured FLIP) so it's the *same* element morphing, not a swap.

### C2. Position & size transitions — **M**
- [x] Each section declares the panel's **target rect** (x, y, width, height) — e.g. hero = centred & grid-card-sized; a feature section = larger and offset to one side. On active-section change the panel **animates position *and* size** with a smooth spring/ease. Width and height both transition (not just translate).
- [x] Layout is **responsive**: rects are expressed relatively (vw/vh or a layout grid) and recompute on resize; on narrow viewports sections may stack the panel above/below the text instead of beside it.

### C3. Dynamic content swap — **M**
- [x] The panel's **inner content fills the frame** and is **swapped per section** with a cross-fade (+ slight scale/blur) timed against the panel's move, so content settles as the panel arrives. Content modules come from Theme F via the section registry.
- [x] Reduced motion: instant placement + instant content swap (no morph, no fade).

---

## Theme D — Scroll-driven sections, typed titles & reveal — ✅ DONE (PR #44, 2026-06-21)

### D1. Section controller & registry — **M**
- [x] A typed **section registry** — each entry: `{ id, title, subtitle, panelRect, panelContent, particleStyle, bodyContent? }`. The page renders from this list; Themes B/C read their per-section config from it. One place to add/reorder sections.
- [x] A controller tracks the **active section** (IntersectionObserver) and exposes it to the panel, particles, and text layers without re-rendering on every scroll frame (refs + a light context/store).

### D2. Typed title/subtitle + fade-in — **M**
- [x] A reusable **`useTypewriter`** hook (or `<Typed>` component): on a section becoming active, **types out the title then subtitle quickly**, cursor caret while typing. After typing completes, **fade in** any other elements in the section (body copy, CTAs, badges) with a short stagger.
- [x] Re-running on re-entry is configurable (type once vs. retype on scroll-back — Decisions §4). SSR-safe; under reduced motion, render full text immediately and skip the fade.

---

## Theme E — Hero (epic but clean) — ✅ DONE (PR #59, 2026-06-21)

### E1. Epic hero composition — **M–L**
- [x] A standout hero: prominent **app icon + "midnite" logo/wordmark**, big calm headline, the particle field at its densest/most dynamic here, generous space. Epic, but uncluttered — one focal centrepiece.
- [x] The **persistent panel sits centred** in the hero at roughly **grid-card size** (small), establishing the element that will grow/travel as the user scrolls into later sections.

### E2. Cycling typed titles — **S–M**
- [x] The hero headline **cycles through 3 title/subtitle pairs**, each **typed out**, held briefly, cleared, then the next — looping. (e.g. "Multitask Claude Code", "Your agents, in parallel", "One board, every task" — final copy TBD, Decisions §5.) Built on the `useTypewriter` hook (D2).
- [x] Pauses on reduced motion (show the first pair statically) and is legible against the busy hero backdrop (scrim/backdrop-blur behind the text).

---

## Theme F — Panel content modules — ✅ DONE (PR #59, 2026-06-21)

> The interchangeable things shown *inside* the panel (C3). All token-themed, all degrade under reduced motion.

### F1. Terminal-typing module — **M**
- [x] A **terminal mockup** inside the panel that **types out a command** (and a plausible faux response), monospaced, with a blinking caret — used for "install / run" style sections. Reuse the `useTypewriter` engine (D2). Mac dots already come from the panel chrome (C1).

### F2. Webapp-mockup modules — **M–L**
- [x] **Simplified mockups inspired by the actual web app** to communicate features — e.g. a stylised **kanban board** (a few task cards moving across columns), a **session/agent card**, a **dashboard widget**, or an **office** vignette. These are *evocations*, not the real components — lightweight, token-themed, lightly animated. One module per feature section.
- [x] Each module fills the panel frame and has an idle micro-animation (a card sliding, a value ticking) so the panel feels alive, not a screenshot.

---

## Theme G — Download page restyle — ✅ DONE (PR #44, 2026-06-21)

> Keep the **function** of today's [`download/page.tsx`](../packages/site/app/download/page.tsx) + [`lib/downloads.ts`](../packages/site/lib/downloads.ts) (platform detection, per-arch macOS builds, GitHub release deep links, "coming soon" disabled states) — restyle the **presentation**.

### G1. Elegant download layout — **M**
- [x] Rebuild the download UI in the new look & feel: detected-platform **primary CTA** up top, an elegant grid/list of **all platforms** (macOS arm64/x64, Windows, Linux) below, version + release-notes link, consistent panel/particle treatment and theming. Reuse `downloads.ts` data and `platform.ts` detection **as-is** — no behavioural change.
- [x] Carry the persistent particle field + theming onto this route so it feels part of the same site (the panel mechanic is landing-page-specific; the download page just shares the visual language).

---

## Theme H — Legal pages (sub-layout + markdown) — ✅ DONE (PR #44, 2026-06-21)

### H1. Legal sub-layout — **M**
- [x] A nested App Router layout at `app/legal/layout.tsx` with a **sidebar** listing **all legal docs** (active-link highlighting) beside a **content area** that renders **pretty-printed markdown**. Responsive: sidebar collapses to a top selector on mobile.
- [x] Render markdown with **`react-markdown` + `remark-gfm`** (the web app's stack) styled to the site (typography, code blocks, tables) — mirror the [`markdown-preview.tsx`](../packages/web/components/markdown-preview.tsx) treatment. Docs authored as markdown/MDX files so adding a doc = adding a file + a sidebar entry.

### H2. Placeholder docs — **S**
- [x] Create **Privacy Policy** (`app/legal/privacy/`) and **EULA** (`app/legal/eula/`) as **placeholder** content (clear "draft / placeholder — not legal advice" note, standard section scaffolding). Wire both into the sidebar and the footer.

---

## Libraries & tooling to consider

- **Keep:** Next.js App Router, **`@react-three/fiber` + `three` + `@react-three/drei` + `@react-three/postprocessing`** (already deps — power the particle field), **Tailwind**, the `cyberwar` brand font.
- **Add — layout/shared-element animation:** **Framer Motion (`motion`)** for the panel's position+size morph (`layoutId`/`layout`) and content cross-fades — the cleanest path to smooth FLIP transitions. _Alternative:_ hand-rolled FLIP (measure → `transform`/`width`/`height` transition) to avoid the dep, or the View Transitions API (Decisions §2).
- **Add — markdown:** **`react-markdown` + `remark-gfm`** (match the web app) for legal pages (H1).
- **Typing effect:** a small in-repo **`useTypewriter`** hook — no library needed; keeps reduced-motion handling first-class.
- **Theme:** ported from the web app (no new dep) — tokens + provider + no-flash script.
- **Testing:** Vitest + Testing Library for the controller/typewriter/registry logic; if Phase 10's Playwright + screenshot pipeline has landed, add the site's hero/sections/download to the screenshot set.

---

## Files this phase touches (map)

- **Shell/theme:** [`app/layout.tsx`](../packages/site/app/layout.tsx), [`app/globals.css`](../packages/site/app/globals.css), new `app/theme/` (provider + script + toggle), new `packages/site/public/` (favicons + logo copied from web).
- **Core layers:** evolve [`components/scene/`](../packages/site/components/scene/) (particles per-section styles + cursor follow), new `components/panel/` (PreviewPanel + chrome + FLIP), new `components/sections/` (registry + controller + Typewriter), new `components/panel-content/` (terminal + webapp mockups).
- **Pages:** rewrite [`app/page.tsx`](../packages/site/app/page.tsx) (landing) + section components; restyle [`app/download/page.tsx`](../packages/site/app/download/page.tsx) (reuse [`lib/downloads.ts`](../packages/site/lib/downloads.ts)/[`lib/platform.ts`](../packages/site/lib/platform.ts)); new `app/legal/{layout,privacy,eula}`.
- **Config:** [`packages/site/moon.yml`](../packages/site/moon.yml) (add `lint`/`test` inputs if needed), `package.json` (new deps: `motion`, `react-markdown`, `remark-gfm`).
- **Docs:** append to [`done.md`](done.md) as items land.

## Verification

- `moon run site:dev`, open the site:
  - [ ] One **persistent panel** travels and **resizes** (width *and* height) smoothly between sections; it always shows the **three Mac dots**; its content swaps per section with a cross-fade.
  - [ ] Hero: app icon + logo present; the centred grid-card-sized panel; the headline **cycles through 3 typed title/subtitle pairs**.
  - [ ] Each section's **title + subtitle type out quickly**, then other elements **fade in**; complementary text sits outside the panel.
  - [x] ❌ SUPERSEDED (PR #68) — the WebGL **particle field** (cursor-follow + per-section style) was **removed** and replaced by a static CSS `AmbientBackdrop`; this acceptance item no longer applies. Revisit if the 3D field is ever restored.
  - [ ] **Theme toggle** works (light/dark/system/time), matches the web app, and persists; no flash on reload.
  - [ ] Some sections show a **typed terminal command**; others show a **web-app-inspired mockup** in the panel.
  - [ ] **Download page**: same platforms/links/behaviour as before, restyled elegantly; theming + particles consistent.
  - [ ] **Legal**: `/legal/privacy` and `/legal/eula` render placeholder markdown with a **sidebar** of all legal docs; footer links to them.
  - [x] **Reduced motion** (PR #98, 2026-06-22): typing (`use-typewriter`) and the panel FLIP morph degrade via [`lib/reduced-motion.ts`](../packages/site/components/../lib/reduced-motion.ts); per-animation `@media (prefers-reduced-motion: reduce)` rules disable the named keyframes (reveal/gradient-border/panel-glow/caret); and a **global catch-all** in `globals.css` floors every transition + any future animation to ~instant and drops smooth-scroll. Particle drift is moot (field removed, PR #68). Verified against `site:dev` under emulated reduced-motion — the at-rest render is pixel-identical to normal, i.e. fully usable.
- `moon run site:typecheck`, `moon run :lint`, `moon run :test` green; `moon run site:build` succeeds (static/SSR build clean).

## Decisions / open questions

1. **Shipping order** — suggested: **A** (foundations: theme + favicon + shell) → **D** (section controller + typewriter) → **C** (panel) → **B** (per-section particles) → **E** (hero) → **F** (panel content modules) → **G** (download) → **H** (legal). C/D/E are the interlocking core; B/F/G/H layer on. Confirm.
2. **Panel transition tech** — **Framer Motion (`motion`)** `layoutId` (smoothest, +~40KB) **vs** hand-rolled FLIP (no dep, more code) **vs** View Transitions API (native, newer/less control). _Recommend Framer Motion_ for the shared-layout morph; revisit if bundle size matters.
3. **Mockup fidelity** — how close should the in-panel web-app mockups look to the real components? _Recommend stylised evocations_ (lightweight, themed, animated) over pixel-faithful clones — cheaper to maintain and they read better at panel size. Confirm.
4. **Typed-text replay** — retype titles every time a section re-enters the viewport, or type once and keep? _Recommend type-on-first-enter, then static_ (less distracting on scroll-back); hero is the exception (it loops its 3 pairs).
5. **Hero copy** — the 3 title/subtitle pairs need final wording (placeholder set proposed in E2). Confirm copy.
6. **Legal content** — placeholders only this phase (Privacy + EULA). Real legal text + any additional docs (Terms, Cookie, Licenses) come later; the sub-layout is built to scale to them.
7. **Light-theme art direction** — the current site is dark-only; the particle field + panel need a deliberate **light-theme** look, not just inverted tokens. Confirm we want full light parity (recommended, since the app supports it) vs. defaulting the site to dark with light as a bonus.
