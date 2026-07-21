# @midnite/docs

The midnite documentation site — a static **Vite + React** app whose entire shell is
built from [`@midnite/ui`](../ui). It's the design-system documentation and (later, in
Phase 26 Theme C) the developer docs, and it doubles as the proof that the library is
genuinely consumable outside the web app.

It is a **leaf consumer**: it depends on `@midnite/ui` and nothing else in the repo
(no `shared`/`gateway`/`web`), enforced by [`src/boundary.test.ts`](src/boundary.test.ts).
It never talks to the gateway — the site is fully static.

## Stack

- **Vite + React** SPA (hash routing, so any deep link works on a static host).
- **MDX** for authoring (`@mdx-js/rollup`): prose with inline **live** `@midnite/ui`
  examples. A page's YAML frontmatter (`title` / `section` / `order`) drives the
  sidebar; adding a page = adding a file under [`src/content/`](src/content).
- **Tailwind**, mapping utilities onto the library's token CSS (`@midnite/ui/styles`),
  themed by the library's `ThemeProvider`.

## Develop

```bash
moon run docs:dev        # dev server (builds @midnite/ui first)
moon run docs:build      # static build → dist/
moon run docs:preview    # preview the built site
moon run docs:test       # vitest (boundary + nav helpers + Layout RTL)
```

## Layout

```
src/
  main.tsx            # entry — ThemeProvider + styles + App
  app.tsx             # router + MDXProvider; routes/nav from the content glob
  components/         # shell: layout, sidebar, theme-toggle, mdx-components, demos
  content/            # MDX pages (+ nav.ts registry helpers)
    foundations/      # colours, typography, radius & scales (live token specimens)
    components/       # a page per primitive
  lib/                # token-specimens (live foundations rendering)
```

> Hosted on its own **Vercel** project (production `main` only, gated on the docs
> subtree — see [`docs/CICD.md`](../../docs/CICD.md)). The web app cross-links here
> via `NEXT_PUBLIC_DOCS_URL` (see `packages/shared/src/site-links.ts`).
