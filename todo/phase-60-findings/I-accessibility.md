# Phase 60 Theme I — Accessibility & keyboard navigation

**Date:** 2026-07-09 · **Scope:** the hand-rolled `@midnite/ui` primitives (accordion/collapse/tabs), complex web interactions (dnd-kit board, hand-rolled dialogs/modals, the ⌘K command palette, the 51/55 cockpits), and global concerns (token contrast in both themes, form labels, live regions). · **Method:** static source read + `@storybook/addon-a11y` (axe-core) over the ui stories + a dedicated WCAG token-contrast script + a two-part keyboard probe (Storybook play-fns for the primitives, a Playwright spec for the palette combobox).

> **Deviation from the phase's analysis-only rule (approved for this slice):** Theme I normally *reports*; this run also applied the **trivial ARIA quick-wins** it found (roles/labels/keyboard on the primitives + palette + two modals), promoted the design-system axe gate from `todo`→`error`, and added the missing axe/keyboard story coverage. Non-trivial or visual changes (token contrast, a shared modal focus-trap, a board `KeyboardSensor`) are **documented, not applied** — they're direction-affecting and belong in a remediation phase.

## Summary

| # | Area | Severity | Status |
|---|------|----------|--------|
| A11Y-1 | `Tabs` had no keyboard model — every tab a separate tab-stop, arrow keys dead (violates WAI-ARIA tabs) | P2 | ✅ **Fixed** |
| A11Y-2 | `Collapse` collapsed body stayed focusable + in the a11y tree (invisible focus / SR reads hidden controls) | P2 | ✅ **Fixed** |
| A11Y-3 | Command palette was not a combobox/listbox — no `aria-activedescendant`, SR can't track the active result | P2 | ✅ **Fixed** |
| A11Y-4 | `Accordion` trigger not associated with its region (`aria-expanded` but no `aria-controls`) | P3 | ✅ **Fixed** |
| A11Y-5 | `media-type-picker-modal` + `approvals-drawer` had `role="dialog"` without `aria-modal` | P3 | ✅ **Fixed** |
| A11Y-6 | `ConfirmDialog` (destructive-confirm path) had no focus trap + didn't return focus on close | P2 | ✅ **Fixed** (exemplar) |
| A11Y-7 | design-system axe gate was `test: 'todo'` — axe ran but **never failed CI**; violations invisible | P2 | ✅ **Fixed** (→`error`) |
| A11Y-8 | `destructive` text/foreground contrast **3.60:1** (both themes) — fails AA 4.5:1 for normal text | P2 | 📋 Documented (token change) |
| A11Y-9 | `success` text/foreground contrast **3.37:1** (both themes) — fails AA 4.5:1 for normal text | P2 | 📋 Documented (token change) |
| A11Y-10 | Focus trap + return-focus is per-dialog — absent across the other ~36 `aria-modal` surfaces (systemic) | P2 | 📋 Documented (shared `<Modal>`) |
| A11Y-11 | dnd-kit board wires no `KeyboardSensor` → no keyboard drag-and-drop | P2 | 📋 Documented (mitigated) |
| A11Y-12 | `Tabs`/palette `role=option` wiring to external panels is caller-owned — no `aria-controls` to the tabpanel | P3 | 📋 Documented |

**Applied this slice:** A11Y-1..7 + the input/textarea story label defects that the promoted axe gate surfaced — all with axe story coverage / a keyboard probe re-run green (`moon run ui:test`, `moon run web:e2e -- a11y-keyboard`). **Contrast** (A11Y-8/9) is now measured precisely + per-theme by [`packages/ui/scripts/contrast-audit.mjs`](../../packages/ui/scripts/contrast-audit.mjs); `color-contrast` is deliberately disabled in the axe *story* gate so the structural gate isn't coupled to a token decision.

---

## Fixed — ARIA quick-wins (design system + high-traffic surfaces)

### A11Y-1 — `Tabs` keyboard model — ✅ FIXED (P2)

[`packages/ui/src/components/tabs.tsx`](../../packages/ui/src/components/tabs.tsx) rendered `role="tablist"`/`role="tab"`/`aria-selected` but every tab was a native `<button>` in the tab order and there was **no arrow-key handling** — the WAI-ARIA tabs pattern requires a *single* tab stop (roving `tabindex`) with ←/→ (and ↑/↓) moving between tabs and Home/End to the ends. **Fix:** roving `tabIndex` (selected `0`, rest `-1`) + an `onKeyDown` on the tablist (arrows wrap, Home/End jump, activate-on-move) + a focus-visible ring. Covered by the new `KeyboardNavigation` play-fn in `tabs.stories.tsx`.

### A11Y-2 — `Collapse` hides visually but not from AT — ✅ FIXED (P2)

[`packages/ui/src/components/collapse.tsx`](../../packages/ui/src/components/collapse.tsx) animated the grid track to `0fr` + `overflow-hidden` when closed, but the content **stayed in the DOM, focusable, and in the accessibility tree** — a keyboard user could Tab into an invisible collapsed accordion body, and a screen reader announced hidden controls. **Fix:** `inert={!open}` (React 19) on the clipped inner region drops it from the tab order + a11y tree while collapsed, matching what `overflow-hidden` does visually. `Collapse` now also forwards `id`/`role`/`aria-label*` so a trigger can point at it.

### A11Y-3 — Command palette wasn't a combobox — ✅ FIXED (P2)

[`packages/web/components/command-palette.tsx`](../../packages/web/components/command-palette.tsx) navigated results with arrow keys but the list was plain `<ul>/<li>/<button>` — **no `role="listbox"`/`role="option"`, no `aria-selected`, no `aria-activedescendant`, input not `role="combobox"`** — so a screen-reader user got no announcement of the highlighted result (the flagship P41 surface). **Fix:** input → `role="combobox"` + `aria-controls`/`aria-expanded`/`aria-autocomplete="list"`/`aria-activedescendant`; results `<ul>` → `role="listbox"`; each section → `role="group"` (label `aria-hidden`); each item → `role="option"` + `id` + `aria-selected`. Focus stays in the input (correct combobox behaviour). Covered by [`packages/web/e2e/a11y-keyboard.e2e.ts`](../../packages/web/e2e/a11y-keyboard.e2e.ts).

### A11Y-4 — `Accordion` trigger↔region association — ✅ FIXED (P3)

[`packages/ui/src/components/accordion.tsx`](../../packages/ui/src/components/accordion.tsx) set `aria-expanded` on the trigger but nothing tied it to the body. **Fix:** `useId()` → `aria-controls` on the button + `id`/`role="region"`/`aria-label={title}` on the `Collapse`; decorative chevron + icon marked `aria-hidden`. Covered by the `DisclosureSemantics` play-fn.

### A11Y-5 — modals missing `aria-modal` — ✅ FIXED (P3)

[`media-type-picker-modal.tsx:44`](../../packages/web/components/media-type-picker-modal.tsx) and [`approvals-drawer.tsx:206`](../../packages/web/components/approvals-drawer.tsx) declared `role="dialog"` without `aria-modal="true"`, so AT didn't treat the background as inert. **Fix:** added `aria-modal="true"` to both (the other ~35 modals already have it).

### A11Y-6 — `ConfirmDialog` focus management — ✅ FIXED (P2)

[`packages/web/components/confirm-dialog.tsx`](../../packages/web/components/confirm-dialog.tsx) focused the confirm button but **let Tab escape to the (visible) background and never restored focus** on close. As the destructive-confirm path it's the highest-stakes dialog. **Fix:** a Tab focus-trap cycling within the dialog + capturing `document.activeElement` on open and restoring it on close. This is the *exemplar* — the same gap exists across the other modals (see A11Y-10).

### A11Y-7 — axe gate never failed CI — ✅ FIXED (P2)

[`packages/ui/.storybook/preview.tsx`](../../packages/ui/.storybook/preview.tsx) set `a11y: { test: 'todo' }` — axe ran on every story but only *warned*, so design-system regressions never failed `moon run ui:test`. **Fix:** promoted to `test: 'error'` (a real structural gate: roles/names/labels/ARIA). Flipping it immediately surfaced pre-existing violations now fixed: the `input`/`textarea` stories rendered unlabelled fields (added `aria-label`s modelling correct usage). `color-contrast` is disabled in this gate on purpose — it's audited per-theme by the contrast script (A11Y-8/9), which is more precise than axe on token themes and shouldn't couple the structural gate to a token decision.

---

## Documented — needs a remediation phase (visual / systemic / product call)

### A11Y-8 / A11Y-9 — token contrast fails AA — 📋 (P2)

[`packages/ui/scripts/contrast-audit.mjs`](../../packages/ui/scripts/contrast-audit.mjs) computes WCAG ratios for every foreground/background token pair in both themes. Two fail AA (4.5:1) for **normal text**:

| pair | light | dark | AA normal | 3:1 large/UI |
|------|-------|------|-----------|--------------|
| `destructive-foreground` on `destructive` | **3.60:1** | **3.60:1** | ❌ | ✅ |
| `success-foreground` on `success` | **3.37:1** | **3.37:1** | ❌ | ✅ |

Both are white text on a saturated red/green. They *pass* 3:1, so a destructive/success **button** (a UI component / large-ish label) is borderline-acceptable, but small text on these fills fails AA. Everything else passes comfortably (foreground/muted-foreground/card/popover/primary/secondary/accent all ≥ 5.9:1). Fixing means lowering the fill lightness (or darkening the fg) — a **visual token change**, deferred as direction-affecting. (Note the tokens already carry precedent comments: `--muted-foreground` was raised to 38% for AA, and dark `--destructive` was raised for text-on-dark.)

### A11Y-10 — dialog focus-trap/return-focus is not systemic — 📋 (P2)

37 components render `aria-modal`, but there is **no shared focus-trap/return-focus utility** (grep: only `confirm-dialog` (now) + `board-view` touch `activeElement`). Each hand-rolled dialog re-implements (or omits) focus containment. **Recommendation:** extract a `useFocusTrap()` hook (open→trap Tab + focus first, close→restore) or a shared `<Modal>` primitive in `@midnite/ui`, and adopt it across the modals — a dedicated remediation slice.

### A11Y-11 — board has no keyboard drag — 📋 (P2, mitigated)

[`packages/web/components/board-view.tsx:91-93`](../../packages/web/components/board-view.tsx) wires only `MouseSensor` + `TouchSensor` — **no `KeyboardSensor`** (the code comments acknowledge it), so dnd-kit's keyboard drag/reorder is unavailable. **Mitigation (why P2 not P1):** keyboard users can still move tasks via the ⌘K contextual *"Move to…"* commands (Phase 42 C) and board arrow-key navigation (Phase 41 D) — moving isn't *unreachable*, just not via drag. **Recommendation:** add `KeyboardSensor` with `sortableKeyboardCoordinates` + dnd-kit `announcements`/`screenReaderInstructions` for parity.

### A11Y-12 — tab/option → external panel wiring — 📋 (P3)

`Tabs` and the palette options can't set `aria-controls` to their panels because the panels are **caller-rendered** and external to the component. Low impact (the roles + selection state are correct), but full parity would add an optional `panelId` prop wiring `aria-controls`/`aria-labelledby`. Recommend when a shared tabs+panel wrapper lands.

---

## Verification

- `moon run ui:test` green with `a11y: { test: 'error' }` — 48 tests incl. the new `Tabs > KeyboardNavigation` and `Accordion > DisclosureSemantics` play-fns; the promoted gate surfaced + fixed the input/textarea label defects.
- `node packages/ui/scripts/contrast-audit.mjs` reproduces A11Y-8/9 (exit 1 on the two failing pairs).
- `moon run web:e2e -- a11y-keyboard` green — the palette combobox/listbox + `aria-activedescendant` arrow-move contract.
- `moon run :typecheck` · `:lint` · `:test` green; no schema changes; the only runtime edits are the ARIA quick-wins above (behavior-preserving for sighted mouse users).

## Recommended follow-up remediation phase(s)

1. **Contrast pass** — lower `destructive`/`success` fill lightness (or darken the fg) to clear AA 4.5:1 in both themes; re-run the contrast script as a CI gate (A11Y-8/9).
2. **Shared modal a11y** — a `useFocusTrap`/`<Modal>` primitive adopted across the ~36 dialogs (A11Y-10).
3. **Board keyboard DnD** — `KeyboardSensor` + dnd-kit announcements (A11Y-11).
