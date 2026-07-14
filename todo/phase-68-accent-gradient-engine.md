# Phase 68 — Accent Gradient Engine

> [Phase 39 · Theme B](phase-39-visual-customization.md) gave the Appearance panel a **curated 8-swatch accent** (default + blue/violet/emerald/amber/rose/cyan/orange): `applyAccent()` in [`lib/apply-appearance.ts`](../packages/web/lib/apply-appearance.ts) sets `--accent-h`/`--accent-s` (bare numbers) + a `data-accent` attribute on `<html>`, and the theme-aware lightness lives in `html[data-accent]` / `html.dark[data-accent]` rules in [`globals.css`](../packages/web/app/globals.css) so contrast holds in both themes. It's **solid-only**, single-channel, and a swatch id. Separately, the app already ships a **brand rainbow** — the multi-colour conic (`--node-trigger → --node-action → --node-logic → --node-data`) that drives `.bg-animated-gradient` (spun by `@property --gradient-angle`). **Phase 68 turns accent into a gradient engine:** gradients alongside solids, a second independently-settable accent channel, a light in-panel builder, and the brand rainbow promoted to the **default, first** accent option — all still a web-side layer over the untouched `@midnite/ui` tokens.

> **Scope guardrails (CLAUDE.md).** This is a **web-only** phase — no gateway work, and `@midnite/ui` [`tokens.css`](../packages/ui/src/styles/tokens.css) stays the **untouched source of truth** (the accent model is a web-side override layer, exactly as Phase 39 established). Every new pref is applied via a **CSS variable or `data-*` attribute on `<html>`**, seeded **before first paint** by extending the existing web-side `appearanceInitScript` (no flash). All accent state round-trips through the synced `UserPreferencesSchema` ([Phase 43](phase-43-server-side-preference-sync.md)) — and because we're **changing the shape of a persisted field**, legacy rows must hydrate cleanly (read-coercion + a regression test; see [`removing-persisted-union-member-needs-read-coercion`]). Accessibility is non-negotiable: **foreground text/icons never sit on a gradient** (they fall back to `--accent-solid`), focus rings stay clearly visible, and motion respects the [Phase 39](phase-39-visual-customization.md) `data-motion` setting + `prefers-reduced-motion`.

> Effort tags: **S** small · **M** medium · **L** large. **Theme A** is the model foundation everything else builds on; **B** wires the appliers/CSS; **C** paints the surfaces; **D** is the builder UX; **E** is motion + a11y polish. A–B–D form the shippable core; C is the widest-blast-radius work; E can land alongside or just after.

---

## Current state (what exists to build on)

- **Accent applier** — [`packages/web/lib/apply-appearance.ts`](../packages/web/lib/apply-appearance.ts): `applyAccent(accent)` sets `--accent-h` / `--accent-s` (bare numbers) + `data-accent` on `<html>`; `default` clears the attribute (today's primary unchanged). Test: [`lib/apply-appearance.test.ts`](../packages/web/lib/apply-appearance.test.ts).
- **Accent swatches + model** — [`packages/web/lib/app-settings.ts`](../packages/web/lib/app-settings.ts): the `accent` field on `AppSettings` (a swatch id), `DEFAULT_SETTINGS`, `ACCENT_OPTIONS`, and the `appSettingsToPreferences`/`applyPreferences` bridges into the synced `UserPreferences` subset.
- **Theme-aware lightness** — [`packages/web/app/globals.css`](../packages/web/app/globals.css) `html[data-accent]` (L=42/92%) and `html.dark[data-accent]` (L=62/22%) blocks override `--primary`/`--ring`/`--accent`/`--accent-foreground` from `--accent-h`/`--accent-s` so contrast tracks the theme.
- **The brand rainbow** — `.bg-animated-gradient` in [`globals.css`](../packages/web/app/globals.css): `conic-gradient(from var(--gradient-angle) …)` over the four `--node-*` tokens, animated by `@keyframes gradient-border-spin` over the `@property --gradient-angle`, **already frozen** under `prefers-reduced-motion` / `:not([data-motion='full'])`. This is the gradient we promote to the default accent.
- **Appearance panel** — [`packages/web/app/(main)/settings/appearance-section.tsx`](../packages/web/app/(main)/settings/appearance-section.tsx): the accent accordion renders live-preview swatches; the panel already has "Reset to defaults".
- **No-flash + effects** — [`packages/web/components/appearance-effects.tsx`](../packages/web/components/appearance-effects.tsx) applies settings client-side; the web-side `appearanceInitScript` (in [`layout.tsx`](../packages/web/app/layout.tsx)) seeds them pre-paint.
- **Preference sync** — [Phase 43](phase-43-server-side-preference-sync.md): `accent` is part of the zod `UserPreferencesSchema` synced subset in [`app-settings.ts`](../packages/web/lib/app-settings.ts).
- **Motion setting** — [Phase 39 · Theme D](phase-39-visual-customization.md): `data-motion` (`system`/`reduced`/`full`) on `<html>` + `useAnimationPrefs()`; the gate we reuse for animated gradients.

---

## Theme A — Accent model: primary + secondary, solid or gradient — **M**

Reshape `accent` from a single swatch id into a two-channel, solid-or-gradient model — without breaking anyone's saved value.

- [ ] Define the new accent model in [`app-settings.ts`](../packages/web/lib/app-settings.ts) as a discriminated union: `AccentValue = { kind: 'solid'; swatch: AccentSwatch } | { kind: 'gradient'; stops: AccentSwatch[]; angle: number; animate: boolean }`. `stops` holds 2–3 palette swatch ids (theme-aware lightness still resolves per stop), `angle` in degrees, `animate` default `false`.
- [ ] Add an **independent secondary accent channel** (`accentSecondary: AccentValue`, solid by default, `default` = off) — a first-class token used both as a gradient stop source *and* for standalone secondary UI accents (Decision §4). Primary stays `accent`.
- [ ] Promote the **brand rainbow** to a named preset (`brand`) reusing the `--node-*` hues, and make it the **default value of `accent`** and the **first option** in the palette (Decision §1). Keep all 8 existing solids.
- [ ] **Read-coercion for legacy rows:** a `coerceAccent()` that maps an old bare string (`"violet"`, `"default"`) → `{ kind: 'solid', swatch }`, applied on load and in `applyPreferences`. Regression test hydrating a pre-Phase-68 stored value (see [`removing-persisted-union-member-needs-read-coercion`]).
- [ ] Extend the zod `UserPreferencesSchema` synced subset + `appSettingsToPreferences`/`applyPreferences` so both channels round-trip; keep the schema backward-compatible (accept legacy string, emit new shape).

---

## Theme B — Gradient applier & CSS-var strategy — **M**

Teach the appliers to emit a gradient plus a contrast-safe solid fallback, staying a web-side layer.

- [ ] Extend `applyAccent()` (rename/overload as needed) to accept the new `AccentValue`: for `gradient`, build `--accent-gradient` (a `linear-gradient(var(--accent-angle), …stops)`), derive `--accent-solid` from the **primary stop** for contrast-critical surfaces, and keep setting `--accent-h`/`--accent-s` from that primary stop so existing solid consumers still work.
- [ ] Add `applyAccentSecondary()` emitting `--accent-2-h`/`--accent-2-s` (+ `--accent-2` / `--accent-2-solid`) and a `data-accent-2` attribute; theme-aware lightness rules in [`globals.css`](../packages/web/app/globals.css) mirroring the primary `html[data-accent]` pattern.
- [ ] Resolve each gradient stop through the **same theme-aware lightness** the solid path uses (so a gradient looks right in light *and* dark), rather than baking fixed HSL (Decision §2). Keep [`tokens.css`](../packages/ui/src/styles/tokens.css) untouched.
- [ ] Extend the pre-paint `appearanceInitScript` + [`appearance-effects.tsx`](../packages/web/components/appearance-effects.tsx) to seed gradient + secondary vars before first paint (no flash), including the `@property --accent-angle` registration.
- [ ] Unit-test the appliers: solid, gradient (2- and 3-stop), secondary channel, legacy-coerced value, and that `--accent-solid` is always a real solid.

---

## Theme C — Surface application across the app — **L**

Paint the gradient where it reads well; keep text/icons on the solid fallback everywhere.

- [ ] **Buttons / CTAs** — primary button + CTA surfaces use `--accent-gradient` as `background-image`, with label text forced to the accent-foreground (never on a raw gradient). Audit the shared button primitive's accent usage.
- [ ] **FAB glow + active states** — the [Phase 66](phase-66-floating-assistant-menu.md) assistant FAB glow, active/selected nav items, and selected highlights adopt the gradient; hover/active states derive from it.
- [ ] **Rings / focus / borders** — accent focus rings and accent borders: use a gradient treatment where safe (border-image / gradient box-shadow), but **fall back to `--accent-solid` for focus rings** so focus visibility/a11y never regresses (Decision §3).
- [ ] **Progress / charts / badges** — progress bars, chart accents, and status badges take the gradient (these carry no foreground text over the fill).
- [ ] Grep every consumer of `--primary` / `--accent` / `--ring` and confirm each either (a) takes the gradient intentionally or (b) uses `--accent-solid`; no element ends up with unreadable text on a gradient. Add a checklist to the PR.

---

## Theme D — Builder UX in the Appearance panel — **L**

A light builder — not a full studio — in the accent accordion.

- [ ] Reorder the accent accordion in [`appearance-section.tsx`](../packages/web/app/(main)/settings/appearance-section.tsx): **Brand rainbow first**, then curated gradient presets (mono-shade per hue + a few multi-colour), then the 8 solids.
- [ ] **Light builder** controls: a primary + secondary swatch picker (both from the palette), a **2–3 stop** selector, an **angle** control (segmented presets 0/45/90/135/180° or a small dial), and a **mono ↔ multi** toggle (mono = tonal shades of one hue; multi = distinct stops). No free-hex input (Decision, out of scope).
- [ ] **Live preview** across representative sample components (a button, a badge, a progress bar, a focus ring, a mini FAB) so the choice is visible before it's applied app-wide; apply-on-select, revertable, consistent with Phase 39's live-preview approach.
- [ ] A distinct **secondary accent** control in the same section (independent solid picker), plus wiring into **Reset to defaults** (restores `accent = brand`, `accentSecondary = default`).

---

## Theme E — Motion & accessibility — **S–M**

Animated gradients are opt-in and never fight motion/contrast rules.

- [ ] Optional **animated gradient** (a slow angle-shift / shimmer via `@property --accent-angle`, mirroring `gradient-border-spin`), controlled by the per-value `animate` flag, **off by default**.
- [ ] Gate animation behind the [Phase 39](phase-39-visual-customization.md) `data-motion` setting **and** `@media (prefers-reduced-motion: reduce)`: `reduced` (or OS reduce under `system`) freezes to a static gradient; only `full` (or explicit opt-in) animates.
- [ ] **Contrast guardrails:** assert `--accent-solid` (used behind all foreground) meets contrast in both themes for every preset; document the rule that foreground never renders on a gradient.
- [ ] Tests: `data-motion='reduced'` and `prefers-reduced-motion` both freeze the animated accent; the builder's animate toggle has no effect when motion is reduced.

---

## Out of scope (named, not built here)

- **Free-spectrum hex / HSL colour picker** — stops come from the curated palette (consistent with Phase 39's curated-over-picker call); a full custom-colour input stays a later stretch.
- **Pushing the accent/gradient model into `@midnite/ui` tokens** — stays a web-side override layer this phase (Decision, Architecture); a shared design-system token is a possible follow-on.
- **Theme presets / "vibes"** that bundle accent + background + density + motion into named shareable looks.
- **Gradient *page backgrounds*** — already [Phase 39 · Theme A](phase-39-visual-customization.md) (`.bg-animated-gradient` + the background gallery); this phase is accent-only.
- **Per-component gradient overrides** or a gradient marketplace / import-export.
- **Office (Phaser/three.js) accent theming** — the canvas scenes are [Phase 8](phase-8-office-fidelity.md)/[Phase 9](phase-9-office-visual-overhaul.md)/[Phase 63](phase-63-office-3d.md) territory.

---

## Files this phase touches (map)

- **web — prefs + model:** [`lib/app-settings.ts`](../packages/web/lib/app-settings.ts) (`AccentValue` union, `accent` + `accentSecondary`, `brand` default, `ACCENT_*` options, `coerceAccent()`, sync bridges).
- **web — appliers:** [`lib/apply-appearance.ts`](../packages/web/lib/apply-appearance.ts) (gradient + secondary appliers, `--accent-gradient`/`--accent-solid`/`--accent-2-*`), [`lib/apply-appearance.test.ts`](../packages/web/lib/apply-appearance.test.ts).
- **web — no-flash + effects:** [`components/appearance-effects.tsx`](../packages/web/components/appearance-effects.tsx), [`app/layout.tsx`](../packages/web/app/layout.tsx) (extend `appearanceInitScript`, register `@property --accent-angle`).
- **web — styles:** [`app/globals.css`](../packages/web/app/globals.css) (`html[data-accent-2]` lightness rules, `--accent-gradient` consumers, animated-accent keyframe gated by `data-motion` + reduced-motion).
- **web — settings UI:** [`app/(main)/settings/appearance-section.tsx`](../packages/web/app/(main)/settings/appearance-section.tsx) (reordered accent accordion, gradient presets, light builder, secondary picker, live preview); possibly small new components under `app/(main)/settings/`.
- **web — surfaces (Theme C):** the shared button primitive, the [Phase 66](phase-66-floating-assistant-menu.md) FAB glow, active-nav/selected styles, progress/badge/chart accents — wherever `--primary`/`--accent`/`--ring` are consumed.
- **Tests:** RTL/Storybook for the builder + appliers; a story per preset; assert reduced-motion + `data-motion='reduced'` freeze the animated accent; the legacy-coercion regression test. (Web tests from a `.worktrees/` / `Dev/midnite-wt` worktree outside `.git`.)
- **Docs:** README "Appearance" section + append to [`done.md`](done.md) as themes land.

---

## Verification

- [ ] The accent picker offers the **Brand rainbow first** (the default for a fresh install), then gradient presets, then the 8 solids; selecting any applies instantly and persists across reload.
- [ ] A **gradient accent** paints buttons/CTAs, the FAB glow + active states, and progress/badges/charts, in both light and dark, while **all foreground text/icons stay on `--accent-solid`** and remain legible.
- [ ] A **secondary accent** can be set independently and shows up both as a gradient stop source and on standalone secondary UI accents.
- [ ] The **light builder** works: choose 2–3 stops from the palette, set an angle, toggle mono ↔ multi, and see it in the live preview before it applies app-wide.
- [ ] **Legacy rows hydrate:** a pre-Phase-68 stored `accent` string (e.g. `"violet"`) loads as the equivalent solid with no error (regression test green).
- [ ] **Motion respected:** animated gradients are off by default; `data-motion='reduced'` and OS `prefers-reduced-motion` both freeze them; only `full`/explicit opt-in animates.
- [ ] **No flash on load:** gradient + secondary vars are seeded pre-paint by `appearanceInitScript`; `@property --accent-angle` registered.
- [ ] Defaults + coercion mean a user who changes nothing sees the intended default (Brand rainbow) and existing users keep their solid accent.
- [ ] `@midnite/ui` stays a leaf (boundary test passes); [`tokens.css`](../packages/ui/src/styles/tokens.css) unchanged — only web-side CSS + appliers touched.
- [ ] `moon run :typecheck` · `moon run :lint` · `moon run :test` green.

---

## Decisions / open questions

1. **Brand rainbow as default** *(settled).* The existing `--node-*` conic (`.bg-animated-gradient`) becomes the `brand` accent preset and the **default + first** option; the 8 solids and `default` remain. Existing users keep their saved solid via coercion.
2. **Gradient stop representation** *(recommend: palette swatch ids, resolved through the theme-aware lightness path).* Store stops as swatch ids and resolve each stop's HSL per theme (same mechanism as solids) so gradients stay contrast-correct in light and dark — rather than baking fixed HSL that breaks on theme switch.
3. **Rings / borders under a gradient** *(recommend: solid fallback for focus).* Gradient borders (border-image) and gradient focus rings can hurt focus visibility and radius rendering; use `--accent-solid` for focus rings and only apply gradient borders where visibility is unaffected.
4. **Secondary accent scope** *(settled: separate global channel).* `accentSecondary` is an independently-settable token (`--accent-2`) used app-wide, not merely the second stop of a gradient — the builder pulls from it, and standalone secondary UI accents consume it directly.
5. **Architecture** *(settled: web-side).* Stays a `web` override layer over the untouched `@midnite/ui` tokens, exactly as Phase 39 established; a shared DS token is a possible follow-on, out of scope here.
6. **Animated accent perf** *(recommend: reuse the `@property --accent-angle` + keyframe pattern from `.bg-animated-gradient`).* Animate the angle, not `background-position`; off by default and gated by `data-motion` + reduced-motion.
7. **Preset breadth** *(open — settle while building D).* How many curated multi-colour presets to ship (beyond Brand + per-hue mono-shade). Recommend a small, contrast-checked set (~4–6) to bound QA; the builder covers the long tail.
