# Phase 80 — Shared reading face & complete legal set

> **What this builds on.** Phase 25 made [`@midnite/ui`](../packages/ui/) the leaf
> design-system package; Phase 26 gave [`@midnite/docs`](../packages/docs/) a polished
> three-column reading face (grouped sidebar + `max-w-3xl` article + a live scroll-spy
> table-of-contents); Phase 11 Theme H scaffolded the marketing site's legal system
> ([`packages/site/lib/legal.ts`](../packages/site/lib/legal.ts) — a data-driven
> `LEGAL_DOCS` registry + a 2-column reading layout). Today docs and site each roll their
> **own** prose-typography map and reading layout — the element styling is near-identical
> but deliberately duplicated, because the `ui ◀ {docs, site}` boundary forbids
> cross-import and nothing shared lives in `ui`. Site legal also has **no on-page TOC and
> no heading ids**, and the legal set is incomplete: only **Privacy + EULA** exist (both
> explicit placeholder), with **Terms of Use and Cookies missing entirely**.

> **Scope guardrails.** Extract the *reading face* (column shell + prose + TOC) into
> `@midnite/ui` as a framework-agnostic leaf, migrate **both** docs and site legal onto
> it, and complete the legal set with real (counsel-review-flagged) prose. **Out of
> scope:** a shared sidebar/nav primitive (each app keeps its own — docs' registry-driven
> accordion and legal's flat list differ too much to abstract cleanly); a cookie-consent
> banner / preferences store / DSAR flow; migrating legal content to MDX (it stays TS
> strings in `lib/legal.ts`); any legal doc beyond the four; and actual legal advice —
> the prose is a **reviewed template**, flagged for counsel before launch.

> **Effort legend:** **S** ≈ an afternoon · **M** ≈ a day or two · **L** ≈ several days.

---

## Current state this builds on

- **`@midnite/ui`** is a strict leaf (React a peer; `src/boundary.test.ts` fails the build
  on any in-repo import). It exports primitives + tokens + `cn`, but **no** prose /
  typography component, MDX provider, `TableOfContents`, or reading-layout — those live
  app-local today.
- **`packages/docs`** (Vite + react-router hash-router + MDX): the reading face is
  [`src/components/layout.tsx`](../packages/docs/src/components/layout.tsx) (3-col grid),
  [`mdx-components.tsx`](../packages/docs/src/components/mdx-components.tsx) (the prose map;
  `h2/h3` carry `scroll-mt-20` + `rehype-slug` ids),
  [`table-of-contents.tsx`](../packages/docs/src/components/table-of-contents.tsx)
  (IntersectionObserver scroll-spy + JS smooth-scroll, hidden < 2 headings), and
  [`doc-page.tsx`](../packages/docs/src/components/doc-page.tsx) (`max-w-3xl` article).
- **`packages/site`** (Next App Router; **not** static export — normal SSG; consumes
  `@midnite/ui`, `dependsOn: ['ui']`): legal is
  [`app/legal/layout.tsx`](../packages/site/app/legal/layout.tsx) (2-col sidebar+article),
  [`components/markdown.tsx`](../packages/site/components/markdown.tsx) (react-markdown +
  gfm + highlight; **no `rehype-slug`**, so no heading ids),
  [`components/legal-sidebar.tsx`](../packages/site/components/legal-sidebar.tsx), and
  [`lib/legal.ts`](../packages/site/lib/legal.ts) (`LEGAL_DOCS` = Privacy + EULA
  placeholders). [`components/footer.tsx`](../packages/site/components/footer.tsx) maps
  over `LEGAL_DOCS`, so it surfaces exactly the docs that exist.

## Theme A — Shared reading primitives in `@midnite/ui` — **L**

- [ ] **`ReadingLayout`** — the framework-agnostic reading-column shell: a responsive grid
      with a left `sidebar` slot, a center `max-w-3xl` article, and an optional right TOC
      rail (rail hidden below `xl`, mirroring docs). Slots supplied via props/children; no
      `next/*` or `react-router` import. Marked `'use client'` where it needs effects.
- [ ] **`Prose`** — the single prose-typography map extracted from docs'
      `mdx-components.tsx` + site's `markdown.tsx` (they're near-twins). Exports **both** a
      `<Prose>` container (scopes typography + spacing) **and** the raw element-component
      map so docs' `MDXProvider components={…}` and site's `react-markdown components={…}`
      consume the *same* map. `h2/h3` **self-slugify** their text children into stable,
      collision-deduped `id`s + `scroll-mt` — so heading ids exist in every app with **no
      per-app `rehype-slug` build config** (Decision 1).
- [ ] **`TableOfContents`** — the scroll-spy rail: scans the rendered article for
      `h2[id]/h3[id]`, IntersectionObserver highlights the active section, click uses
      `scrollIntoView` (router-agnostic — works under docs' hash-router and site alike;
      Decision 3). Hidden when < 2 headings.
- [ ] **`ReadingLayoutProvider`** (+ `useReadingLink`) — a small context that takes each
      app's `Link` component so the primitives never import a router (Decision 4): site
      passes `next/link`, docs passes react-router `NavLink`; `ui` imports neither. Default
      falls back to a plain `<a>`.
- [ ] Export all four from [`packages/ui/src/index.ts`](../packages/ui/src/index.ts);
      confirm [`src/boundary.test.ts`](../packages/ui/src/boundary.test.ts) still passes
      (leaf rule intact — the new code imports nothing in-repo).

## Theme B — Migrate docs onto the primitive — **M**

- [ ] Rebuild [`docs/src/components/layout.tsx`](../packages/docs/src/components/layout.tsx)'s
      center column + TOC rail on `ReadingLayout` + `TableOfContents`; keep docs' own
      grouped sidebar and starfield chrome local.
- [ ] Point docs' `MDXProvider` at the shared `Prose` element map
      ([`mdx-components.tsx`](../packages/docs/src/components/mdx-components.tsx) becomes a
      thin adapter); wrap `react-router` `NavLink` into `ReadingLayoutProvider`. Drop the
      now-redundant local `table-of-contents.tsx`.
- [ ] Since `Prose` self-slugifies, docs' Vite `rehype-slug` is redundant for TOC — leave
      it or remove it, but verify heading anchors + deep-links still resolve.
- [ ] **Visual-parity check** (the risky bit): docs reading pages look/scroll/spy exactly
      as before — TOC highlight, mobile drawer, `max-w-3xl` measure, code blocks.

## Theme C — Rebuild site legal on the primitive — **M**

- [ ] Rebuild [`site/app/legal/layout.tsx`](../packages/site/app/legal/layout.tsx) on
      `ReadingLayout` — gaining the **right-rail TOC** it never had; keep the calm `bg-grid`
      backdrop and the local [`legal-sidebar.tsx`](../packages/site/components/legal-sidebar.tsx).
- [ ] Replace [`site/components/markdown.tsx`](../packages/site/components/markdown.tsx)'s
      hand-rolled element map with the shared `Prose` map (react-markdown keeps gfm +
      highlight); wrap `next/link` into `ReadingLayoutProvider`. Heading ids now come from
      `Prose`, so legal pages get in-page anchors + deep-links.
- [ ] Verify the two thin route wrappers
      ([`privacy/page.tsx`](../packages/site/app/legal/privacy/page.tsx),
      [`eula/page.tsx`](../packages/site/app/legal/eula/page.tsx)) still render unchanged
      through the new path.

## Theme D — Complete legal set + real prose — **M**

- [ ] Add **`terms`** (Terms of Use) and **`cookies`** (Cookie Policy) entries to
      [`LEGAL_DOCS`](../packages/site/lib/legal.ts), plus their route folders
      `app/legal/terms/page.tsx` + `app/legal/cookies/page.tsx` (mirroring the existing
      thin wrappers).
- [ ] Write substantive **template prose** for all four (Privacy, Terms, EULA, Cookies):
      real sections and real wording, each opening with the existing
      "template — not legal advice, review with counsel before launch" note and a real
      **effective / last-updated date** (add a `lastUpdated`/`effectiveDate` field to
      `LegalDoc`, rendered in a doc header).
- [ ] [`footer.tsx`](../packages/site/components/footer.tsx) now surfaces all four
      automatically (it maps `LEGAL_DOCS`) — confirm order + labels read well.

## Theme E — Stories, tests & verification — **M**

- [ ] Storybook stories for `ReadingLayout`, `Prose`, `TableOfContents` in `packages/ui`
      (they run as Vitest **browser** tests via `@storybook/addon-vitest`), incl. a `play`
      that asserts scroll-spy marks the active heading and heading-id slugification.
- [ ] Unit test the slugifier (collision de-dup, punctuation/emoji stripping) and the
      `useReadingLink` fallback (no provider → plain `<a>`).
- [ ] `moon run ui:test docs:test site:test` green; `moon run :typecheck :lint` green;
      `ui`/`docs`/`site` boundary tests pass.

---

## Files this phase touches

- **`@midnite/ui`** (new): `packages/ui/src/reading/` (`reading-layout.tsx`, `prose.tsx`,
  `table-of-contents.tsx`, `reading-link.tsx`) + stories/tests; edits to
  [`packages/ui/src/index.ts`](../packages/ui/src/index.ts).
- **`@midnite/docs`**: [`src/components/layout.tsx`](../packages/docs/src/components/layout.tsx),
  [`mdx-components.tsx`](../packages/docs/src/components/mdx-components.tsx),
  [`table-of-contents.tsx`](../packages/docs/src/components/table-of-contents.tsx) (removed),
  [`app.tsx`](../packages/docs/src/app.tsx).
- **`@midnite/site`**: [`app/legal/layout.tsx`](../packages/site/app/legal/layout.tsx),
  [`components/markdown.tsx`](../packages/site/components/markdown.tsx),
  [`lib/legal.ts`](../packages/site/lib/legal.ts),
  [`components/footer.tsx`](../packages/site/components/footer.tsx), new
  `app/legal/terms/page.tsx` + `app/legal/cookies/page.tsx`.

## Verification

- [ ] `ReadingLayout`/`Prose`/`TableOfContents` exported from `@midnite/ui`; its
      `boundary.test.ts` still green (leaf rule intact).
- [ ] Docs reading pages render with **visual parity** — TOC scroll-spy, mobile drawer,
      code blocks, deep-link anchors all behave as before the migration.
- [ ] Site `/legal/*` pages render through the shared primitive **with a working right-rail
      TOC** and heading deep-links; Privacy + EULA unchanged in content.
- [ ] `/legal/terms` and `/legal/cookies` exist, render real template prose with an
      effective date, and appear in the footer alongside Privacy + EULA.
- [ ] `moon run ui:test docs:test site:test` + `moon run :typecheck :lint` green.

## Decisions / open questions

1. **`Prose` self-slugifies `h2/h3`** (resolved — user pick) → heading ids exist in every
   consumer with zero per-app `rehype-slug` config; the shared `TableOfContents` can rely
   on them everywhere. Docs' existing `rehype-slug` becomes redundant (leave or remove).
2. **One prose element map, two render paths** (resolved) → export the raw element-component
   map so docs' `MDXProvider` and site's `react-markdown` consume the identical map; `Prose`
   is the container wrapper. Kills the duplicated typography.
3. **Router-agnostic TOC** (resolved) → click uses `scrollIntoView` + IntersectionObserver
   spy (no href-hash reliance), so it works under docs' hash-router and site's App Router;
   site additionally gets real `#id` deep-links for free.
4. **Link injection via `ReadingLayoutProvider`** (resolved — user pick) → each app injects
   its own `Link` (site `next/link`, docs react-router `NavLink`); `ui` imports neither and
   stays a framework-agnostic leaf. Default = plain `<a>`.
5. **Adoption = both docs + site this phase** (resolved — user pick) → docs migrates too,
   for one true source of truth; Theme B's visual-parity check is the guardrail against
   regressing the polished docs face.
6. **Open:** should the shared sidebar eventually move into `ui` as well? Deferred — the
   docs (grouped/registry-driven) and legal (flat) navs differ enough that a shared
   abstraction would leak today. Revisit if a third reading surface appears.
