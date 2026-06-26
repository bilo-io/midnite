# Phase 39 — Visual customization

> midnite already lets you bend its look a little — a colour theme (`light`/`dark`/`system`/`time`), a side-nav mode, **3** decorative background patterns, and 31 wordmark fonts — all persisted in `localStorage` and applied via CSS classes/vars (see [`appearance-section.tsx`](../packages/web/app/(main)/settings/appearance-section.tsx), [`app-settings.ts`](../packages/web/lib/app-settings.ts), the `@midnite/ui/theme` context). But the surface is thin: the "animated gradient" background is so subtle (`hsl(var(--foreground) / 0.01–0.06)`) it's nearly invisible, there are only three backgrounds, and nothing else about the app's feel — accent colour, density, motion — is yours to set. **Phase 39 turns appearance into a real personalization surface:** a gallery of ≥10 backgrounds with a gradient you can actually see, a curated accent colour, layout density + type scale, explicit motion controls, and an Appearance panel that previews it all live and applies it with no flash on load.

> **Scope guardrails (CLAUDE.md).** This is a **web + design-system** phase, no gateway work. `@midnite/ui` stays the **leaf design-system source of truth** — new *semantic* tokens and the token-override *hooks* (CSS custom properties the runtime can set) live in [`packages/ui/src/styles/tokens.css`](../packages/ui/src/styles/tokens.css) + [`tokens/index.ts`](../packages/ui/src/tokens/index.ts); decorative, app-specific bits (the background utilities, the Appearance UI, the settings store) stay in `web`. Preferences remain **client-only** (`localStorage`, the existing `useLocalStorage` + `@midnite/ui/theme` pattern) — no server/per-user sync this phase. Every new visual pref is **applied via a CSS variable or a `data-*` attribute on `<html>`** and seeded **before first paint** by extending the existing inline theme-init script, so nothing flashes. Accessibility is non-negotiable: reduced-motion stays respected, accent choices stay contrast-safe.

> Effort tags: **S** small · **M** medium · **L** large. **Theme A** delivers the headline asks (backgrounds + visible gradient); **B–D** are independently shippable personalization axes; **E** is the connective UX (live preview + no-flash) that ties them together and is best landed alongside or just after A.

---

## Current state (what exists to build on)

- **Appearance settings** — [`packages/web/app/(main)/settings/appearance-section.tsx`](../packages/web/app/(main)/settings/appearance-section.tsx): four `Accordion` sections (theme · nav mode · background pattern · logo font), each a `SettingRow` + a `Segmented`/`Switch`/grid control.
- **Settings store** — [`packages/web/lib/app-settings.ts`](../packages/web/lib/app-settings.ts): the `AppSettings` type + `DEFAULT_SETTINGS`, persisted under `localStorage['midnite.settings']` via `useLocalStorage`. `backgroundPattern` already lives here.
- **Theme runtime** — `@midnite/ui/theme` (re-exported by [`packages/web/app/theme/theme-context.tsx`](../packages/web/app/theme/theme-context.tsx)): a React context that writes `localStorage['midnite.theme']` and toggles `<html class="dark">`. A pre-paint inline script ([`theme-script.ts`](../packages/ui/src/theme/theme-script.ts), injected in [`layout.tsx`](../packages/web/app/layout.tsx)) applies the theme before hydration → no flash.
- **Backgrounds** — [`packages/web/app/globals.css`](../packages/web/app/globals.css) `@layer utilities`: `.bg-grid`, `.bg-honeycomb`, `.bg-animated-gradient` (a conic gradient spun by `@keyframes gradient-border-spin` over `@property --gradient-angle`, **already removed under `prefers-reduced-motion`**). Mapped to a class by [`lib/use-background-pattern.ts`](../packages/web/lib/use-background-pattern.ts); rendered in `PageHeader` + `Screensaver`.
- **Design tokens** — [`packages/ui/src/styles/tokens.css`](../packages/ui/src/styles/tokens.css): `:root` (light) + `.dark` blocks of bare-HSL semantic tokens (`--primary`, `--accent`, `--ring`, …), consumed as `hsl(var(--token))`. Mirrored in [`packages/ui/src/tokens/index.ts`](../packages/ui/src/tokens/index.ts), which already carries **placeholder** spacing/typography/motion token slots.
- **Reduced motion** — honored only via OS `@media (prefers-reduced-motion: reduce)` blocks throughout `globals.css`; **no in-app toggle**.

---

## Theme A — Background gallery + a gradient you can see — **M**

The headline: more backgrounds, and make the animated one actually animate-visibly.

### A1. Expand to ≥10 background options — **M** — ✅ DONE (PR #212, 2026-06-26)
- [x] Added 9 new `.bg-*` utilities in `globals.css`: dots, diagonal-lines, plus-cross, topographic, waves, blueprint, grain, aurora, mesh-gradient. All pure CSS (gradients/masks), theme-token-driven, with `mask-image` edge fade. Total: 12 patterns.
- [x] Extended `BackgroundPattern` type + `BACKGROUND_PATTERN_OPTIONS` in `app-settings.ts`; class map stays in `BACKGROUND_PATTERN_CLASS`. Replaced 3-item Segmented control with a 3-col (mobile) / 4-col (sm+) live-preview swatch grid that renders each pattern at full opacity.

### A2. Make the animated gradient obvious + an intensity control — **S–M** — ✅ DONE (PR #212, 2026-06-26)
- [x] Reworked `.bg-animated-gradient` to a multi-colour conic sweep using `--node-trigger / --node-action / --node-logic / --node-data` tokens at 15–40% opacity (was 1–6% foreground-only). Animation slowed to 20s.
- [x] `--bg-intensity` CSS custom property (`@property`, initial 0.2, inherits); `html[data-bg-intensity]` sets it to 0.10 (subtle) / 0.20 (balanced) / 0.40 (bold). `useBackgroundPattern` applies `data-bg-intensity` to `<html>` when gradient is active.
- [x] Segmented intensity control (Subtle / Balanced / Bold) appears inline in Appearance only when animated gradient is selected. Reduced-motion block already freezes animation.

---

## Theme B — Accent colour personalization — **M** — ✅ DONE (PR #213, 2026-06-26)

Let people tint the app to their taste, on top of the design tokens.

- [x] A **curated 8-swatch accent palette** (default + blue/violet/emerald/amber/rose/cyan/orange) in Appearance; selecting one writes `settings.accent` and overrides `--primary`/`--ring`/`--accent` (+ foregrounds) on `<html>` at runtime.
- [x] The override is a **web-side layer** (`applyAccent()` in [`lib/apply-appearance.ts`](../packages/web/lib/apply-appearance.ts) sets `--accent-h`/`--accent-s` + `data-accent`); [`@midnite/ui` tokens.css](../packages/ui/src/styles/tokens.css) stays the untouched source of truth — the theme-aware lightness lives in `html[data-accent]` / `html.dark[data-accent]` rules in `globals.css`.
- [x] Works in both light and dark (swatch supplies hue+saturation; lightness tracks the theme so contrast holds). `default` = no override (today's primary unchanged). No-flash via a web-side `appearanceInitScript` in the `<head>`.

---

## Theme C — Density & typography scale — **S–M**

Tune information density for big monitors vs. laptops.

- [ ] A **density** setting (`comfortable` / `compact`) applied via a `data-density` attribute on `<html>`; drives a base spacing/`font-size` CSS var that the layout reads. Wire the **placeholder spacing/typography token slots** already declared in [`tokens/index.ts`](../packages/ui/src/tokens/index.ts) rather than inventing a parallel system.
- [ ] Keep it modest — two levels, applied to root spacing + base type scale; verify no layout breakage on the board, office HUD, and settings.
- [ ] (Optional, scope-permitting) a **UI font** choice distinct from the wordmark font — only if it lands cleanly via a single `--font-ui` var.

---

## Theme D — Motion & visual-effects controls — **S**

Make motion a deliberate choice, not just an OS inheritance.

- [ ] A **motion** setting (`system` default / `reduced` / `full`) written to settings and applied as `data-motion` on `<html>`. CSS gates animations on **both** the OS `prefers-reduced-motion` media query **and** `data-motion` — `reduced` forces-off; `full` opts back in **only** because the user explicitly asked (*Decision §4*).
- [ ] Fold the Theme A2 background-intensity knob and (optionally) toggles for the heavier effects (page-reveal, typewriter header, glass/blur) under this section.

---

## Theme E — Appearance UX, live preview & no-flash application — **M**

The connective tissue: one coherent panel, instant feedback, zero flash.

- [ ] Rework [`appearance-section.tsx`](../packages/web/app/(main)/settings/appearance-section.tsx) so backgrounds + accent render as **live preview swatches/cards** (the real pattern/colour, not just a label), applying instantly on select and revertable.
- [ ] Consolidate the new prefs (`backgroundPattern`, `bgIntensity`, `accent`, `density`, `motion`) in [`app-settings.ts`](../packages/web/lib/app-settings.ts) with sane defaults that reproduce **today's** look.
- [ ] Extend the pre-paint inline script ([`theme-script.ts`](../packages/ui/src/theme/theme-script.ts) / [`layout.tsx`](../packages/web/app/layout.tsx)) to also read these prefs from `localStorage` and set the corresponding classes/`data-*`/CSS vars on `<html>` **before first paint**, so a reload never flashes the default look.

---

## Out of scope (named, not built here)

- **Server-side / per-user preference sync** across devices — stays `localStorage`; a natural follow-on once it ties into [Phase 33](phase-33-multi-user-teams.md) accounts.
- **User-uploaded wallpapers / fully custom images** — curated CSS backgrounds only.
- **Theme sharing / marketplace / import-export** of look presets.
- **Office (Phaser) visual customization** — the canvas scene is [Phase 8](phase-8-office-fidelity.md)/[Phase 9](phase-9-office-visual-overhaul.md) territory.
- **Reworking the `@midnite/ui` token contract** beyond adding override-hook vars + filling the existing placeholder spacing/type slots.
- **A free-spectrum colour picker** (curated palette chosen — Decision §2); a custom-hex input is a possible later stretch.

---

## Files this phase touches (map)

- **web — settings UI:** [`app/(main)/settings/appearance-section.tsx`](../packages/web/app/(main)/settings/appearance-section.tsx) (live-preview swatches, new sections), possibly small new components under `app/(main)/settings/` for the preview grid.
- **web — prefs + appliers:** [`lib/app-settings.ts`](../packages/web/lib/app-settings.ts) (new fields + defaults), [`lib/use-background-pattern.ts`](../packages/web/lib/use-background-pattern.ts) (extended map), new `lib/apply-appearance.ts` (`applyAccent`/`applyDensity`/`applyMotion` setting `<html>` vars/attrs), [`app/layout.tsx`](../packages/web/app/layout.tsx) (extend the init script wiring).
- **web — styles:** [`app/globals.css`](../packages/web/app/globals.css) (≥7 new `.bg-*` utilities, `--bg-intensity`, `data-motion`/`data-density` gates, bolder gradient).
- **ui — design system:** [`src/styles/tokens.css`](../packages/ui/src/styles/tokens.css) (accent override-hook vars if needed), [`src/tokens/index.ts`](../packages/ui/src/tokens/index.ts) (fill placeholder spacing/type slots used by density), [`src/theme/theme-script.ts`](../packages/ui/src/theme/theme-script.ts) (extend pre-paint application).
- **Tests:** RTL/Storybook for the new controls + appliers; a story per background; assert reduced-motion + `data-motion='reduced'` both freeze animation. (Web tests from the **primary checkout**, not a `.git` worktree.)
- **Docs:** README "Appearance" section + append to [`done.md`](done.md) as themes land.

---

## Verification

- [x] The Appearance panel offers **≥10 backgrounds** (12 total), each shown as a live-preview swatch; selecting one applies instantly and persists across reload. (PR #212)
- [x] The animated-gradient background is **clearly visible** at the default intensity (a deliberate moving backdrop), and the intensity control (`subtle`/`balanced`/`bold`) visibly scales it. (PR #212)
- [x] Picking a **curated accent** retints primary/ring/accent across the app in both light and dark, with legible contrast, and persists. (PR #213)
- [ ] **Density** (`comfortable`/`compact`) visibly changes spacing/type without breaking the board, office HUD, or settings layouts.
- [ ] The **motion** setting works: `reduced` freezes all animation even without the OS flag; `full` re-enables it; `system` matches the OS preference. OS `prefers-reduced-motion` is still honored at the `system` default.
- [ ] **No flash on load:** a hard reload with non-default background/accent/density/motion shows the chosen look immediately (pre-paint), never the default first.
- [ ] Defaults reproduce **today's** appearance for users who change nothing.
- [ ] `@midnite/ui` stays a leaf (its boundary test passes); tokens.css remains the source of truth (only override-hook vars added).
- [ ] `moon run :typecheck` · `moon run :lint` · `moon run :test` green across the graph.

---

## Decisions / open questions

1. **Where backgrounds live** *(recommend: `web`).* The decorative `.bg-*` utilities are app-specific chrome, not design-system primitives — keep them in [`web/app/globals.css`](../packages/web/app/globals.css), not `@midnite/ui`. Only token *override hooks* (CSS vars) and the placeholder spacing/type slots touch `ui`.
2. **Accent control** *(settled: curated palette).* 6–8 hand-picked, contrast-checked swatches — on-brand, no bad-contrast footguns, simplest to ship. A custom-hex input is a possible later stretch, not this phase.
3. **No-flash application** *(recommend: extend the init script).* Apply background/accent/density/motion from `localStorage` in the existing pre-paint inline script so all visual prefs land before first paint, consistent with how theme already avoids the flash. Trade-off: a slightly larger inline script.
4. **Motion-setting semantics** *(recommend: `system`/`reduced`/`full`, OS-respecting by default).* `full` overrides the OS only because the user explicitly opted in; the default `system` continues to honor `prefers-reduced-motion`. Avoids forcing motion on motion-sensitive users by default.
5. **Density scope** *(recommend: spacing + base font-size, two levels).* Wire the existing placeholder spacing/type token slots in [`tokens/index.ts`](../packages/ui/src/tokens/index.ts); keep it to two levels to bound layout-QA surface. A distinct UI font is optional/stretch.
6. **Accent hue model** *(open).* Set a single `--accent-hue` and derive primary/ring/accent by adjusting only hue (keeping token lightness/saturation, so dark/light contrast holds) vs. ship fully-specified HSL triplets per swatch per theme. Recommend deriving from hue where contrast holds, with per-swatch overrides where it doesn't — settle while building B.
7. **Live-preview cost** *(recommend: apply-on-select, revertable).* Apply changes immediately to the whole app for instant feedback (not a sandboxed preview pane), with the prior value restorable — simpler and more honest than a mini-preview that can drift from reality.
