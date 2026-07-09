# Phase 60 Theme L — Docs site, public site & `@midnite/ui` test gap

**Date:** 2026-07-09 · **Scope:** `@midnite/docs` staleness + a product-led IA proposal, the Phase-11 public site (`packages/site`) accuracy/links, and the `@midnite/ui` unit-test hole (+ the `web/components/ui` re-export boundary). · **Method:** static source read + HTTP liveness probe of every external site link (curl, follow-redirects) cross-checked against in-page anchors + `git` repo existence, and **fixes applied**: behavioral `play`-fn coverage for the untested primitives (this run added 8 tests, `ui:test` 46→54).

> **Deviation from analysis-only (approved upfront):** this slice **wrote the missing `@midnite/ui` behavioral tests** (not just enumerated them) and was cleared to fix trivial dead links inline. The docs-authoring itself + the substantive site refresh stay follow-ups. The link "probe" used HTTP liveness + anchor cross-check rather than a Playwright click-through — `packages/site` has no e2e harness and an HTTP probe found the one real dead link (DOCS-1) directly; standing up Playwright for a single link-check was disproportionate (noted, not hidden).

## Summary

| # | Area | Severity | Status |
|---|------|----------|--------|
| UI-1 | `@midnite/ui` primitives had **0 unit/behavioral tests** (render-only stories) | P2 | ✅ **Fixed** (8 play-fns added) |
| DOCS-1 | Public site "Docs" nav link (`DOCS_URL`) **404s** | P2 | 📋 Documented (correct deploy URL unknown) |
| DOCS-2 | No **user-facing product docs** — `@midnite/docs` is design-system + *developer* markdown only | P2 | 📋 Documented (+ IA proposal below) |
| DOCS-3 | 5 of 10 ui primitives have **no MDX doc page** (accordion, collapse, select, styled-select, textarea) | P3 | 📋 Documented |
| DOCS-4 | `getting-started.mdx` covers only the UI-library on-ramp, not the product | P3 | 📋 Documented |
| SITE-1 | Public-site feature list advertises the Phase 1–3 MVP; omits workflows/office/slides/ideas/guardrails/cockpits/search/teams (product is at Phase 64) | P3 | 📋 Documented |
| BND-1 | `web/components/ui/*` re-export shims — **verified pure pass-throughs, no drift** | — | ✅ Verified clean |

**Applied this run:** UI-1 — real browser-mode `play`-fn tests for button (click / disabled-swallows-click), switch (toggle + Space), select (open/pick/Escape + disabled-doesn't-open), styled-select (open/pick), input & textarea (typing→value+onChange). `moon run ui:test` 46→**54** green with the (Phase 60 I) axe gate at `error`.

---

## `@midnite/ui` test gap — UI-1 ✅ FIXED

Before this run, [`packages/ui/src/components/`](../../packages/ui/src/components/) had **stories but zero behavioral tests** — the `unit` vitest project ([`vitest.config.ts`](../../packages/ui/vitest.config.ts)) is node-env (no DOM) and covered only `cn`/`tokens`/`theme-script`/`boundary`; the primitives were only smoke-mounted by render-only stories. (Phase 60 I had since added `play`-fns to accordion/tabs + promoted the axe gate.) This run closes the rest via the package's established test layer — **Storybook `play` fns run as Vitest browser tests** (no new jsdom/RTL dep in the leaf package):

- **button** — `ClickBehavior` (fires `onClick`), `DisabledDoesNotFire` (disabled `<button>` swallows a forced click).
- **switch** — click flips `aria-checked`; Space toggles (keyboard-reachable `role=switch`).
- **select** — `OpenPickClose` (portalled listbox, option-per-value, pick updates label + closes, Escape closes) + `Disabled` doesn't open.
- **styled-select** — `OpenPick` (react-select menu, pick updates value).
- **input** / **textarea** — `Typing` (value updates + `onChange` fires).

Remaining coverage worth a follow-up (documented, not blocking): card is static (render-smoke is adequate); `ModelComboSelect` (creatable) has no interaction test; `select` keyboard arrow-nav (the lightweight Select has no arrow-key model — a separate a11y item, cf. Theme I).

## `web/components/ui` boundary — BND-1 ✅ VERIFIED CLEAN

All 10 wrappers in [`packages/web/components/ui/`](../../packages/web/components/ui/) are **pure re-export shims** (`export { X } from '@midnite/ui'`) — no `className` overrides, no wrapping, so they can't drift from or re-skin the library. (`asset-search-select.tsx` + `virtual-list.tsx` are genuinely web-specific, not shims.) The only debt is cosmetic: the shims are a Phase-25 migration seam a codemod could eventually delete so `web` imports `@midnite/ui` directly.

---

## Docs site — DOCS-1..4

### DOCS-1 — the public site's "Docs" link 404s — 📋 (P2)

[`packages/site/lib/site.ts:10`](../../packages/site/lib/site.ts) `DOCS_URL = https://midnite-docs-vision-studios-projects.vercel.app` returns **404** (probed; the GitHub, releases, and web-app URLs on the same page all 200). The nav "Docs" entry ([`nav.tsx:15`](../../packages/site/components/nav.tsx)) + any footer reference therefore dead-end. Not fixed inline: the *correct* docs deploy URL is unknown (the docs site may not be publicly deployed yet) — guessing a replacement would just move the 404. **Fix:** point `DOCS_URL` at the real docs deployment once it exists, or hide the nav entry until then.

### DOCS-2 — no user-facing product docs — 📋 (P2)

`@midnite/docs` is **not** empty of product content the way the grounding assumed — [`content/product-docs.tsx`](../../packages/docs/src/content/product-docs.tsx) already surfaces the repo's own markdown (README / INITIAL_PLAN / ARCHITECTURE / TESTING_PLAN / RELEASING) under Guides/Architecture/Reference (Phase 26 D). **But those are developer/contributor docs** — there is still **no user-facing product documentation**: nothing explains how to *use* sessions, workflows, guardrails, the office, slides, ideas, cockpits (51/55), search, teams, or the CLI as a product. The design-system docs (foundations + components) are the only authored, purpose-written pages.

### DOCS-3 — half the primitives are undocumented — 📋 (P3)

Component MDX exists for **button, card, input, switch, tabs** ([`content/components/`](../../packages/docs/src/content/components/)) — but **accordion, collapse, select, styled-select, textarea** have **no doc page** despite being shipped primitives (and now, post-I, having keyboard semantics worth documenting).

### DOCS-4 — getting-started is UI-library-only — 📋 (P3)

[`getting-started.mdx`](../../packages/docs/src/content/getting-started.mdx) is the `@midnite/ui` on-ramp; there's no product "getting started" (install → run the gateway → add a task → watch an agent).

### Docs IA proposal (Decision §3 — settled with the user)

**Extend `@midnite/docs` with a product section, and make product docs the *primary, public-facing* focus** (design-system docs become secondary) — not a separate surface. Reuses the existing MDX + `@midnite/ui` + search pipeline; one site to deploy and link from the public site (fixing DOCS-1's target). Proposed IA:

1. **Product (primary, landing):** Getting started · Concepts (gateway/agent-pool/tasks lifecycle) · Board & office · Workflows · Guardrails & autonomy · Sessions & cockpits · Slides · Ideas · Search · Teams · CLI reference.
2. **Design system (secondary):** the current Foundations + Components (with the 5 missing pages added, DOCS-3).
3. **Developer (kept):** the imported repo markdown (Architecture / Testing / Releasing).

`SECTION_ORDER` in [`nav.ts`](../../packages/docs/src/content/nav.ts) would lead with the Product sections. **Authoring the product docs is a follow-up phase** — Theme L only proposes the structure.

---

## Public site accuracy — SITE-1

[`packages/site/components/features.tsx`](../../packages/site/components/features.tsx) advertises 5 features — live kanban, agent pool, CLI+browser, live terminals, PRs — all **accurate** but they describe the Phase 1–3 MVP. The shipped product (Phase 64) has a large surface the site never mentions: **workflows, the 3D office + presence, slides, ideas pipeline, autonomy guardrails, session/project cockpits, global search, multi-user teams**. Not *wrong*, but the site substantially undersells what's shipped. Copy, anchors (`#how`/`#features`/`#cli`/`#top`), `/download`, `/legal/{privacy,eula}`, and the external GitHub/releases/web-app links were all **verified live** (only DOCS-1 dead). **Recommendation:** a site content refresh (new feature tiles + panels) — a follow-up, paired with the docs authoring.

---

## Verification

- `moon run ui:test` green (54 tests; +8 behavioral play-fns) with the axe gate at `error`.
- External site links probed via HTTP (200 for GitHub/releases/web-app; **404 for `DOCS_URL`**); in-page anchors cross-checked against section ids.
- `web/components/ui/*` confirmed pure re-export shims by source read.
- `moon run :typecheck` · `:lint` · `:test` green; no runtime behavior changed (tests + a findings doc only).

## Recommended follow-up remediation phase(s)

1. **Product docs authoring** — build the product-led IA above in `@midnite/docs` (DOCS-2/3/4) and fix `DOCS_URL` (DOCS-1).
2. **Public-site refresh** — feature tiles + panels covering the shipped surface (SITE-1).
3. **ui coverage top-up** — `ModelComboSelect` + lightweight-Select keyboard model (small remainder of UI-1).
