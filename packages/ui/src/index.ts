// @midnite/ui — the reusable component library + design system.
//
// Phase 25 Theme A stood up the package + Vite build; Theme B moves in the design
// tokens (here) + the theme runtime (`@midnite/ui/theme`) + the token CSS
// (`@midnite/ui/styles`). The generic primitives (button, card, input, …) migrate
// from packages/web/components/ui in Theme C.

export { cn } from './lib/cn';

// Typed design tokens (the TS mirror of `@midnite/ui/styles`).
export * from './tokens';
