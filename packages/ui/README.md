# @midnite/ui

The reusable component library and design system for midnite — generic UI
primitives plus the design tokens, in one place that any app can consume.

## Boundary (it's a leaf)

`@midnite/ui` depends on **nothing else in the repo** — not even `@midnite/shared`.
React and React-DOM are **peer dependencies**, not bundled. Only domain-agnostic
primitives + tokens live here; anything coupled to domain types (`TaskCard`, the
board, the office) stays in `@midnite/web`. `src/boundary.test.ts` enforces the
leaf rule in CI.

```
ui ◀── web      (later: docs, possibly site)
```

## Build (Vite library mode)

This is the **one** package built with **Vite library mode** rather than the
repo's `tsc -b` convention, because the library bundles JSX/CSS/assets that
`tsc` won't emit:

- `vite build` emits ESM (`dist/index.js`, `dist/theme.js`) with React external.
- `vite-plugin-dts` emits the `.d.ts` files.
- Typechecking still runs through `tsc --noEmit` (the `typecheck` task), exactly
  like every other package.

## Exports

| Specifier            | What                                              |
| -------------------- | ------------------------------------------------- |
| `@midnite/ui`        | Components + helpers (the `cn()` class merger today). |
| `@midnite/ui/theme`  | Theme runtime (`ThemeProvider`, `useTheme`, …).    |
| `@midnite/ui/styles` | The design-token CSS (`tokens.css`).               |

### Styling (Decision §4)

The library **ships compiled CSS + the token CSS** so it works for any consumer
(including a future non-Tailwind docs app) — consumers `import '@midnite/ui/styles'`
rather than extending a shared Tailwind preset. Internally the primitives use
Tailwind utility classes via `cn()`; **Tailwind is wired** in the consuming apps.

## Status

Phase 25 is landing in themes (see
[`todo/phase-25-ui-library.md`](../../todo/phase-25-ui-library.md)):

- **Theme A** ✅ — package scaffold + Vite build + moon wiring + boundary guard (this).
- **Theme B** — move the design tokens + theme runtime in.
- **Theme C** — migrate the generic primitives + their stories (web keeps re-export shims).
- **Theme D** — the library's own Storybook catalog + design-system docs.
