# Phase 67 — Product guides on every page (engine v2)

> Builds directly on **Phase 66 Theme F** ([PR #425](https://github.com/bilo-io/midnite/pull/425)), which shipped the replayable product-guide system: an SVG-mask spotlight [`GuideOverlay`](../packages/web/components/guide/guide-overlay.tsx), a `data-tour` anchor contract, a per-route [`GUIDE_ROUTE_MAP`](../packages/web/lib/guide/steps.ts), a Zustand [`useGuide`](../packages/web/lib/guide/use-guide.ts) store, and [`useSeenGuides`](../packages/web/lib/guide/use-seen-guides.ts) riding the `seenGuides` preference. That system is real but **thin**: guides exist on only **4 routes** (tasks, workflows/edit, sessions, memory), each 2–3 steps, launched only from the assistant menu, with no versioning and no auto-launch. **Phase 67 takes it to full-surface coverage and upgrades the engine** to versioned, auto-launching, mildly-interactive tours with one place to browse them all.

> **Scope:** almost entirely `packages/web` (the guide engine, overlay, assistant panel, and per-surface `data-tour` anchors), plus **one** small `packages/shared` change — evolving the `seenGuides` preference shape (Theme A). No gateway work: guides stay web-owned constants; the gateway remains agnostic (it only persists the loose `seenGuides` map via Phase 43 sync). Keep the `ui ◀── web` and `shared` boundaries clean (CLAUDE.md) — the overlay/engine live in `web`, not `@midnite/ui`.

> **Explicitly out of scope** (deliberately deferred to a later "guides as a shared/gateway domain" phase): a gateway-served guide catalog or server/CMS-authored guides; step-level drop-off **analytics**; full **branching / multi-path** tours; **per-role** targeting; and deep sub-panel tours *inside* complex surfaces (workflow node-by-node, office movement internals). This phase is coverage + engine polish, not a guide platform.

> Effort tags: **S** small · **M** medium · **L** large. Themes A–C are the engine v2 lift and are largely independent; Theme D (content) depends on A–C landing the versioning + anchor conventions; Theme E is tests woven across. Suggested order: A → B → C → D → E.

---

## The engine today (read first)

- **Data model** ([`steps.ts`](../packages/web/lib/guide/steps.ts)): `GuideStep = { anchor; title; body (markdown); placement? }`, `Guide = { id; label; steps: GuideStep[] }`. Steps anchor to on-screen elements via a **`data-tour="<key>"`** attribute (not CSS selectors); a step whose anchor is absent at runtime is **auto-skipped**.
- **Routing:** `GUIDE_ROUTE_MAP` maps a pathname-prefix → guide, resolved **longest-prefix-first** (`resolveGuide(pathname)`), so sub-routes inherit their section guide. `KNOWN_GUIDE_IDS` is the canonical id set (web-owned).
- **Trigger:** the assistant panel ([`assistant-panel.tsx`](../packages/web/components/assistant/assistant-panel.tsx)) calls `useGuide.getState().start(resolveGuide(pathname))`; `GuideOverlay` is mounted once in the `(main)` shell ([`layout.tsx`](../packages/web/app/(main)/layout.tsx)). The FAB ([`assistant-fab.tsx`](../packages/web/components/assistant/assistant-fab.tsx)) shows a subtle "unseen guide" dot via `useSeenGuides().hasSeen`.
- **Persistence:** `seenGuides: z.array(z.string())` in [`preferences.ts`](../packages/shared/src/preferences.ts) — a flat id list, marked seen the moment a guide starts.

---

## Theme A — Engine v2: versioning + auto-launch — **M** — ✅ DONE (PR #426, 2026-07-14)

> Fix the two Phase 66 gaps: edited guides never re-surface (flat id list), and guides only start from the menu.

- [x] **A1.** Add `version: number` to the `Guide` type in [`steps.ts`](../packages/web/lib/guide/steps.ts) (default `1`); document that bumping it re-surfaces the guide. Every existing + new guide def carries an explicit `version`.
- [x] **A2.** Evolve `seenGuides` from `string[]` to an **`id → version` map** (`Record<string, number>`) in [`preferences.ts`](../packages/shared/src/preferences.ts). Keep the schema loose (web owns canonical versions): `z.union([z.array(z.string()), z.record(z.string(), z.number())])` with a `.transform` that coerces a legacy array `['a','b']` → `{ a: 1, b: 1 }` on read. **This is a persisted-union change — legacy rows MUST coerce cleanly** (see Decisions §1); add a regression test for the coercion.
- [x] **A3.** Rework [`use-seen-guides.ts`](../packages/web/lib/guide/use-seen-guides.ts): `hasSeen(guide)` returns true only when the stored version `>=` the guide's current `version`; `markSeen(guide)` writes the guide's current version. Reading the legacy array shape still works (via A2 coercion + a `normalizeSeen` at the device-local read layer, since `AppSettings` localStorage bypasses zod).
- [x] **A4.** Auto-launch: when the user lands on a route whose `resolveGuide(pathname)` is unseen (per A3), auto-`start()` it **once**, dismissible. Wired via a dedicated `<GuideAutoLaunch/>` in the `(main)` shell ([`layout.tsx`](../packages/web/app/(main)/layout.tsx)) on pathname change; the overlay marks seen on start (as today) so it stays quiet after. Replay from the menu is unaffected.
- [x] **A5.** Guard auto-launch (see Decisions §2): desktop-only (`useIsDesktop`), suppressed until past first-run setup (`SetupStatus.ready`, which owns the wizard window), and honoring a new **`autoShowGuides` boolean preference** (default `true`, synced) so a user can turn auto-launch off while keeping manual replay. Toggle surfaced in Settings → Appearance ("Product guides").

## Theme B — Interactive steps: scroll-to + action-advance — **M** — ✅ DONE (PR #428, 2026-07-14)

> Make steps feel alive without branching.

- [x] **B1.** Auto-scroll the anchored element into view (`scrollIntoView({ block: 'center', behavior: 'smooth' })`, reduced-motion → `'auto'`) in [`guide-overlay.tsx`](../packages/web/components/guide/guide-overlay.tsx), in a **one-time per-step effect** (decoupled from the continuous `measure()` so a smooth scroll's own scroll events can't re-trigger it). The scroll listener re-reads the knockout rect as the page animates, so the spotlight tracks the element to its final position on long pages.
- [x] **B2.** Extended `GuideStep` with an optional **`advanceOn?: 'click'`** (extensible union): when set, the overlay listens for the anchored element firing that event and auto-advances to the next step (in addition to the Next button). Minimal — anchor-element events only, no arbitrary app-state watching; never `preventDefault`, so the app's own handler runs too.
- [x] **B3.** The knockout is now **click-through** (Decision: all steps): the SVG dim is visual-only (`pointer-events:none`) and transparent **curtain catchers** frame the hole (clicking the dim dismisses; the hole passes clicks to the real element). Esc/Back still work; an `advanceOn` click both triggers the app action and advances.
- [x] **B4.** Reduced-motion + a11y: scroll `behavior` comes from `useAnimationPrefs().animate` (folds in `data-motion` **and** OS `prefers-reduced-motion`) → `'auto'` when reduced; curtains stay out of the tab order + a11y tree (Esc/Skip cover keyboard/AT); existing focus management + keyboard nav (←/→/Enter/Esc) intact.

## Theme C — Guides index in the assistant menu — **S** — ✅ DONE (PR #429, 2026-07-14)

> One place to see and replay every guide, not just the current route's.

- [x] **C1.** The **"All guides"** index is a new `guides` view in [`assistant-panel.tsx`](../packages/web/components/assistant/assistant-panel.tsx) (the "Guide" entry now opens it): lists every guide from the `ALL_GUIDES` registry with its `label` and a **subtle unseen dot** (via `useSeenGuides`), the current route's guide floated to the top.
- [x] **C2.** Click-to-replay from anywhere: on-route starts immediately; off-route sets `useGuide.pending` + `router.push(guideLaunchPath(guide))`, and a shell watcher `<GuidePendingReplay/>` starts it once `resolveGuide(pathname)` matches (so the guide never starts before its anchors mount). `guideLaunchPath` derives the route from `GUIDE_ROUTE_MAP`.
- [x] **C3.** The FAB "unseen" dot ([`assistant-fab.tsx`](../packages/web/components/assistant/assistant-fab.tsx)) now reflects **any** unseen guide (`useSeenGuides().hasAnyUnseen`), not only the current route's — a real "you have new guides" signal.

## Theme D — Full coverage: ~12 guides + anchors — **L** — ✅ DONE (PR #431, 2026-07-14)

> One guide per major top-level destination. Each = add `data-tour` anchors to the target surface + author a guide def in [`steps.ts`](../packages/web/lib/guide/steps.ts) + register it in `GUIDE_ROUTE_MAP` / `KNOWN_GUIDE_IDS`. Every guide closes on the universal `assistant` "replay anytime" step (existing convention).

- [x] **D1.** **Office / 3D** (`/office`) — anchors on the scene shell + the 2D/3D view toggle; a 3-step orientation tour.
- [x] **D2.** **Projects** (`/projects`) and **Project detail** (`/projects/view`) — list + New button anchors, plus a `project-detail` step that **auto-skips on the list** and lights the cockpit tabs on the detail route (prefix inheritance, no separate guide).
- [x] **D3.** **Ideas** — ⏳ **skipped, no web route.** The ideas pipeline (Phase 40) has no `/ideas` page in `packages/web` (CLI/gateway surface); logged here rather than anchoring a guide to nothing. Add when/if a web route lands.
- [x] **D4.** **Fable digests** (`/digests`) — anchors on the feed shell + the master-detail content region.
- [x] **D5.** **Releases** — ⏳ **skipped, no web route.** The release flow (Phase 29) is the `/release-prep` → `/release-complete` skills + CLI; there is no `/releases` web surface. Logged.
- [x] **D6.** **Search** (`/search`) — scope overview + a live **`advanceOn: 'click'`** step on the search input (the first real interactive step, Theme B).
- [x] **D7.** **Settings** (`/settings`) — hub shell + category sidebar anchors; points at Appearance (theme, `autoShowGuides`).
- [◐] **D8.** **Command palette** — the ⌘K palette is **keyboard-only** (no pointer trigger in the chrome), so a standalone click-to-open guide isn't possible without adding nav chrome (out of D's scope). Folded a **⌘K keyboard mention** into the dashboard guide's closing step; the live `advanceOn` demo instead rides the search guide (D6). Adding a visible palette trigger + its own guide is the follow-up.
- [x] **D9.** **Session detail** (`/sessions/view`) — covered by the existing `/sessions` guide via prefix inheritance (Decision: detail via inheritance).
- [x] **D10.** **Dashboard / fleet home** (`/dashboard`) — short orientation: the grid overview + the task composer, closing on the assistant/FAB step (with the ⌘K mention from D8) so first-run users learn where guides live.
- [◐] **D11.** Audit done: **dashboard, office, projects, digests, search, settings** now resolve to guides (+ existing board/workflow/sessions/memory). Deliberately **not** covered this PR (bounded follow-up, logged): `/ops`, `/slides`, `/councils`, `/media`. Ideas/Releases have no route (D3/D5).
- [x] **D12.** Copy pass: every new guide is 2–4 tight steps, markdown bodies, explicit `placement`, closing on the `assistant` anchor — consistent voice with the original four.

## Theme E — Tests, stories & e2e shots — **M** — ✅ DONE (PR #433, 2026-07-14)

- [x] **E1.** Unit: `seenGuides` array→map coercion + `hasSeen`/`markSeen` version logic with the legacy-shape regression — shipped in Theme A ([`use-seen-guides.test.ts`](../packages/web/lib/guide/use-seen-guides.test.ts), `preferences.test.ts`).
- [x] **E2.** Unit: auto-launch gating (fires once when unseen; quiet when seen / `autoShowGuides` off / non-desktop / setup not ready) — shipped in Theme A ([`guide-auto-launch.test.tsx`](../packages/web/components/guide/guide-auto-launch.test.tsx)).
- [x] **E3.** Unit: `resolveGuide` covers every new route + detail sub-route inheritance — shipped in Theme D ([`steps.test.ts`](../packages/web/lib/guide/steps.test.ts)).
- [x] **E4.** Stories with `play`: an `advanceOn: 'click'` interactive step (`InteractiveAdvance` in [`guide-overlay.stories.tsx`](../packages/web/components/guide/guide-overlay.stories.tsx)) + the "All guides" index (`AllGuides` in the new [`assistant-panel.stories.tsx`](../packages/web/components/assistant/assistant-panel.stories.tsx)). (Replay-navigation across routes is covered by `assistant-fab.test.tsx`.)
- [x] **E5.** [`e2e/guide.shots.ts`](../packages/web/e2e/guide.shots.ts) now shoots each covered guide's first step (board/dashboard/office/projects/digests/search/settings) in light + dark, launched the real way (assistant → Guides index → guide). Also **fixed the board shot** broken by Theme C's index flow.
- [x] **E6.** Verification checklist below driven to done; a11y pass added to [`e2e/a11y-keyboard.e2e.ts`](../packages/web/e2e/a11y-keyboard.e2e.ts) (overlay is a focused modal dialog; ←/→/Esc drive it). Reduced-motion honoured via `useAnimationPrefs` (Theme B).

---

## Files this phase touches

- **Engine / model:** [`packages/web/lib/guide/steps.ts`](../packages/web/lib/guide/steps.ts) · [`use-guide.ts`](../packages/web/lib/guide/use-guide.ts) · [`use-seen-guides.ts`](../packages/web/lib/guide/use-seen-guides.ts)
- **Overlay:** [`packages/web/components/guide/guide-overlay.tsx`](../packages/web/components/guide/guide-overlay.tsx)
- **Assistant / launch:** [`packages/web/components/assistant/assistant-panel.tsx`](../packages/web/components/assistant/assistant-panel.tsx) · [`assistant-fab.tsx`](../packages/web/components/assistant/assistant-fab.tsx)
- **Shell (auto-launch):** [`packages/web/app/(main)/layout.tsx`](../packages/web/app/(main)/layout.tsx)
- **Preference (map + toggle):** [`packages/shared/src/preferences.ts`](../packages/shared/src/preferences.ts) · Settings appearance surface in `packages/web`
- **Coverage anchors (Theme D):** target components across `packages/web` — office scene, [`projects`](../packages/web/app/(main)/projects/), ideas, fable/digests, releases, search, settings, command palette, session detail, and the dashboard/nav shell (add `data-tour` attributes)
- **Tests/stories/e2e:** `packages/web/lib/guide/*.test.ts` · [`guide-overlay.test.tsx`](../packages/web/components/guide/guide-overlay.test.tsx) · [`guide-overlay.stories.tsx`](../packages/web/components/guide/guide-overlay.stories.tsx) · [`e2e/guide.shots.ts`](../packages/web/e2e/guide.shots.ts)

## Verification

- [x] `moon run :typecheck`, `moon run :lint`, `moon run web:test` all green.
- [x] `moon run web:e2e`: guide shots run + generate previews for every covered guide (board/dashboard/office/projects/digests/search/settings, light+dark). Committed pixel baselines are Linux/Docker-rendered — they regenerate in CI (`--update-snapshots`); host-rendered PNGs are not committed as baselines (see PR note).
- [x] Editing a guide + bumping its `version` re-surfaces it; a legacy `string[]` `seenGuides` row hydrates as `version 1` (coercion regression test, Theme A).
- [x] Auto-launch fires **once** per unseen guide, is dismissible, respects `autoShowGuides` off + desktop-only + past-setup (Theme A `guide-auto-launch.test.tsx`).
- [◐] Every **doc-named** primary destination resolves to a guide (Theme D); `/ops`, `/slides`, `/councils`, `/media` are the logged bounded follow-up, and Ideas/Releases have no web route. Anchors resolve or gracefully auto-skip; steps scroll into view (Theme B).
- [x] "All guides" index lists every guide with correct seen/unseen state and replays from any page (navigating when off-route); the FAB dot reflects any unseen guide (Theme C).
- [x] Interactive `advanceOn: 'click'` steps advance on the real action and via Next; keyboard nav + reduced motion intact (Theme B + the a11y e2e / overlay story).
- [x] No gateway changes; `shared` boundary respected (only `preferences.ts` touched, Theme A); overlay/engine stay in `web`, not `@midnite/ui`.

## Decisions / open questions

1. **`seenGuides` migration (settled → map + read-coercion).** Change the persisted field from `string[]` to `Record<string, number>`. Because it's a persisted union, **coerce legacy arrays on read** (`['a'] → {a:1}`) via a zod `.transform`, keep the schema accepting both shapes, and add a regression test — removing/replacing a persisted shape without read-coercion silently breaks hydration of old rows. *Recommendation (accepted): map + coercion, not a flat-list keep.*
2. **Auto-launch guardrails (settled).** Auto-launch is **desktop-only**, **suppressed during the Phase 19 setup wizard**, and gated by a new **`autoShowGuides`** preference (default on). Prevents nagging mobile users mid-scroll and colliding with first-run setup. *Recommendation (accepted).*
3. **Action-advance scope (settled → minimal).** `advanceOn` watches **anchor-element events only** (`'click'` to start, union left open), not arbitrary app-state. No branching. *Recommendation (accepted): minimal; branching is out of scope.*
4. **Discovery surface (settled → in-menu index).** "All guides" lives in the assistant panel, not a dedicated `/guides` route — cheaper, no new nav entry, still discoverable. Revisit a full help hub only if coverage/analytics grow (that's the deferred shared-domain phase). *Recommendation (accepted).*
5. **Open — versioning UX for authors.** Should a lint/test assert that any changed guide `id` also bumped its `version`? *Recommendation: a lightweight unit test snapshotting guide id→version so an intentional content edit forces a conscious bump; decide during Theme E.*
6. **Open — dashboard guide vs. FAB self-intro.** D10 risks overlapping the FAB's own affordance. *Recommendation: keep the dashboard guide short and make its closing step the `assistant` anchor so it hands off to "replay anytime" cleanly.*
