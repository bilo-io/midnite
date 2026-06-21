// Typed design tokens — the TS mirror of `styles/tokens.css` for JS consumers.
//
// The CSS custom properties in `styles/tokens.css` are the canonical RUNTIME
// source of truth (they cascade + flip with `.dark`); this map exposes the same
// values to TypeScript (charts, canvas, inline styles, docs specimens). Keep the
// two in sync — the CSS leads, this follows.
//
// The DS taxonomy below is structured end-to-end: `color` + `radius` are filled
// from today's system; `spacing`/`typography`/`shadow`/`zIndex`/`motion` are
// **placeholders** — the app uses Tailwind's default scales today, so these are
// reserved here (clearly marked) until the design system formalizes its own.

/** A bare HSL triplet (`H S% L%`), consumed as `hsl(var(--token))` / `hsl(${value})`. */
export type Hsl = string;

/** Semantic color tokens for one theme — mirrors the `:root` / `.dark` blocks. */
export type ColorScale = {
  background: Hsl;
  foreground: Hsl;
  card: Hsl;
  cardForeground: Hsl;
  primary: Hsl;
  primaryForeground: Hsl;
  secondary: Hsl;
  secondaryForeground: Hsl;
  muted: Hsl;
  mutedForeground: Hsl;
  accent: Hsl;
  accentForeground: Hsl;
  destructive: Hsl;
  destructiveForeground: Hsl;
  success: Hsl;
  successForeground: Hsl;
  popover: Hsl;
  popoverForeground: Hsl;
  border: Hsl;
  input: Hsl;
  ring: Hsl;
};

export const color: { light: ColorScale; dark: ColorScale } = {
  light: {
    background: '0 0% 100%',
    foreground: '240 10% 3.9%',
    card: '0 0% 100%',
    cardForeground: '240 10% 3.9%',
    primary: '240 5.9% 10%',
    primaryForeground: '0 0% 98%',
    secondary: '240 4.8% 95.9%',
    secondaryForeground: '240 5.9% 10%',
    muted: '240 4.8% 95.9%',
    mutedForeground: '240 3.8% 46.1%',
    accent: '240 4.8% 95.9%',
    accentForeground: '240 5.9% 10%',
    destructive: '0 84.2% 60.2%',
    destructiveForeground: '0 0% 98%',
    success: '142 71% 36%',
    successForeground: '0 0% 98%',
    popover: '0 0% 100%',
    popoverForeground: '240 10% 3.9%',
    border: '240 5.9% 90%',
    input: '240 5.9% 90%',
    ring: '240 5.9% 10%',
  },
  dark: {
    background: '240 10% 3.9%',
    foreground: '0 0% 98%',
    card: '240 10% 5.5%',
    cardForeground: '0 0% 98%',
    primary: '0 0% 98%',
    primaryForeground: '240 5.9% 10%',
    secondary: '240 3.7% 15.9%',
    secondaryForeground: '0 0% 98%',
    muted: '240 3.7% 15.9%',
    mutedForeground: '240 5% 64.9%',
    accent: '240 3.7% 15.9%',
    accentForeground: '0 0% 98%',
    destructive: '0 62.8% 30.6%',
    destructiveForeground: '0 0% 98%',
    success: '142 65% 48%',
    successForeground: '0 0% 98%',
    popover: '240 10% 7%',
    popoverForeground: '0 0% 98%',
    border: '240 3.7% 15.9%',
    input: '240 3.7% 15.9%',
    ring: '240 4.9% 83.9%',
  },
};

/** Domain accent hues (task status, item kind, workflow-node category). */
export const accentHues = {
  status: {
    light: {
      backlog: '240 4% 50%',
      todo: '217 91% 60%',
      wip: '38 92% 50%',
      waiting: '280 65% 60%',
      done: '142 71% 45%',
      abandoned: '0 0% 60%',
    },
    dark: {
      backlog: '240 5% 65%',
      todo: '217 91% 68%',
      wip: '38 92% 60%',
      waiting: '280 65% 70%',
      done: '142 71% 55%',
      abandoned: '0 0% 50%',
    },
  },
  kind: {
    light: {
      bug: '0 84% 60%',
      feature: '262 83% 58%',
      question: '217 91% 60%',
      chore: '240 4% 46%',
      unknown: '240 4% 60%',
    },
    dark: {
      bug: '0 84% 65%',
      feature: '262 83% 68%',
      question: '217 91% 68%',
      chore: '240 5% 60%',
      unknown: '240 5% 55%',
    },
  },
  node: {
    light: {
      trigger: '217 91% 60%',
      action: '262 83% 58%',
      logic: '38 92% 50%',
      data: '173 80% 40%',
      storage: '333 80% 52%',
    },
    dark: {
      trigger: '217 91% 68%',
      action: '262 83% 68%',
      logic: '38 92% 60%',
      data: '173 70% 50%',
      storage: '333 75% 62%',
    },
  },
} as const;

/** Border-radius scale — derived from `--radius` (0.5rem), shadcn convention. */
export const radius = {
  sm: 'calc(0.5rem - 4px)',
  md: 'calc(0.5rem - 2px)',
  lg: '0.5rem',
  base: '0.5rem',
} as const;

// ── DS taxonomy placeholders ────────────────────────────────────────────────
// Reserved so the system is structurally complete + obviously extensible. The
// app uses Tailwind's default scales for these today; formalize as the design
// system grows. Marked `placeholder: true` so docs/tooling can flag them.

/** PLACEHOLDER — spacing scale (Tailwind's default rem scale is used today). */
export const spacing = { placeholder: true } as const;

/** PLACEHOLDER — typography scale (font families/sizes/weights/line-heights). */
export const typography = { placeholder: true } as const;

/** PLACEHOLDER — shadow / elevation scale. */
export const shadow = { placeholder: true } as const;

/** z-index scale — the few stacking levels the UI relies on today. */
export const zIndex = {
  dropdown: 50,
  tooltip: 50,
  placeholder: true,
} as const;

/** PLACEHOLDER — motion / easing tokens (durations + easing curves). */
export const motion = { placeholder: true } as const;

/** The full design-system token map. `color`/`radius` filled; the rest reserved. */
export const tokens = {
  color,
  accentHues,
  radius,
  spacing,
  typography,
  shadow,
  zIndex,
  motion,
} as const;
