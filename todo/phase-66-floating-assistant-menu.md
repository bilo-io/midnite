# Phase 66 — Floating Assistant Menu

> midnite's help, chat, and docs are scattered — chat-to-board hides behind a nav button that
> pops the ⌘K palette, docs is a single external link, there's no in-app tour at all, and asking
> the fleet a question has no home. Phase 66 gives all of that **one persistent surface**: a
> **floating action button anchored on the round midnite logo**. Hover it and it lights up with the
> app's gradient border + glow; click it and it expands into a gradient-bordered, glowing panel
> (the same treatment the composer gets on focus) offering **Docs** (the current page's docs),
> **Guide** (a replayable, per-route product tour), **Chat to board** (the Phase 59 NL command bar,
> relocated to live here), and **Agent** (ask about your fleet/tasks/sessions and get rich markdown
> answers — with midnite's own components rendered inline where a picture beats prose).

> **Scope guardrails (CLAUDE.md).** This is **overwhelmingly `packages/web`** plus one design-system
> extraction and one new gateway read-path. **It overturns Phase 59's settled "no FAB" decision on
> purpose** (see [phase-59 §Decisions 2](phase-59-chat-to-board.md)) — the app now *has* a FAB
> pattern, and this is it. Reuse, don't reinvent: **Chat to board** lifts the already-decoupled
> [`useChatCommand`](../packages/web/hooks/use-chat-command.ts) hook + [`ChatBar`](../packages/web/components/chat-bar.tsx)
> out of [`command-palette.tsx`](../packages/web/components/command-palette.tsx) — **no new chat
> engine, no new gateway chat route**. **Agent** composes the existing read endpoints
> (`agents`/`sessions`/`pool`/`tasks`/`metrics`) as context and calls the existing provider-agnostic
> [`LlmService`](../packages/gateway/src/agent/llm/llm.service.ts) — **no new provider code**, budget/
> usage tracked like every other LLM call (Phases 7/50). The **glow** graduates from the raw
> [`.gradient-border`](../packages/web/app/globals.css) CSS class into a real **`@midnite/ui`**
> primitive + token so `web` and `docs` share one source of truth (leaf rule intact — `ui` still
> depends on nothing in-repo). Rich answers reuse [`MarkdownPreview`](../packages/web/components/markdown-preview.tsx);
> the agent's inline components come from a **fixed, zod-validated registry** in
> [`shared`](../packages/shared/src/) — **not** a generic LLM tool-calling framework.

> Effort tags: **S** small · **M** medium · **L** large. **A** (shell + FAB) is the spine every entry
> hangs off; **B** (glow → `@midnite/ui`) is the design-system dependency A consumes; **C** (docs
> deep-link) + **D** (chat relocation) are the two cheap wins; **E** (agent chat + component registry)
> is the headline and the risk; **F** (replayable guide) is the net-new interaction layer.
> B → A → {C, D, E, F}.

---

## Current state (what exists to build on)

- ✅ **Logo-anchored nav** — [`nav-bar.tsx`](../packages/web/components/nav-bar.tsx) renders the round
  logo (`public/logo.PNG`, `rounded-full`) at ~L168; the **"Chat to board"** entry is a button at
  ~L270-278 that fires `window.dispatchEvent(new CustomEvent('midnite:open-chat'))`, caught in
  [`command-palette.tsx`](../packages/web/components/command-palette.tsx) (~L177). Mobile equivalent:
  [`mobile-nav.tsx`](../packages/web/components/mobile-nav.tsx). The **"Docs"** button (~L288) is a
  plain external link to `DOCS_URL` with no path.
- ✅ **The glow, as a CSS class** — `.gradient-border` in [`globals.css`](../packages/web/app/globals.css)
  (~L882-955) + keyframes `gradient-border-spin` / `gradient-border-glow-pulse`: transparent border
  with padding-box card + border-box conic-gradient; `:focus-within` thickens + spins + fades in a
  blurred `::after` halo; honors `prefers-reduced-motion`. Applied **inline** by three composers
  ([`prompt-composer.tsx`](../packages/web/components/prompt-composer.tsx),
  [`council-topic-composer.tsx`](../packages/web/components/council-topic-composer.tsx),
  [`memory-chat-composer.tsx`](../packages/web/components/memory/memory-chat-composer.tsx)). **Not** a
  `@midnite/ui` primitive yet.
- ✅ **Chat-to-board engine, decoupled** — gateway `chat/` module (`POST /chat/preview|command|undo|query`),
  contract in [`shared/src/chat.ts`](../packages/shared/src/chat.ts), web client methods in
  [`api.ts`](../packages/web/lib/api.ts) (~L521-568), and — crucially — all state already lives in the
  [`useChatCommand`](../packages/web/hooks/use-chat-command.ts) hook with a presentational
  [`ChatBar`](../packages/web/components/chat-bar.tsx). The palette is just its current *host*.
- ✅ **Rich render** — [`MarkdownPreview`](../packages/web/components/markdown-preview.tsx)
  (react-markdown + remark-gfm + rehype-highlight, per-element Tailwind overrides). Canonical chat
  pattern: [`memory-chat-composer.tsx`](../packages/web/components/memory/memory-chat-composer.tsx)
  (assistant turns via `MarkdownPreview`). Format-switched rendering precedent:
  [`memory-artifact-viewer.tsx`](../packages/web/components/memory/memory-artifact-viewer.tsx).
- ✅ **Agent-question backbone** — [`LlmService`](../packages/gateway/src/agent/llm/llm.service.ts)
  (provider-agnostic, `generateStructured`, `.enabled`, already used by `chat-query.service.ts`); data
  from `agents`/`sessions`/`pool`/`tasks`/`metrics` controllers (Phase 61 observability incl.
  `/metrics/ops`, `/metrics/cycle-time`, `/tasks/counts|graph|activity`).
- ✅ **Docs, per-feature** — the Phase 26 [`packages/docs`](../packages/docs/) app now has a doc page
  per sidenav item (recent commits `180dc149`/`8f2c2bc6`), and `DOCS_URL` / `APP_URL` base constants
  exist ([`site-links.ts`](../packages/web/lib/site-links.ts), `docs/src/lib/app-links.ts`).
- ❌ **Net-new:** the FAB shell + expand animation; a `pathname → docs-slug` map (no route→docs
  mapping exists today); an **LLM-emits-a-component** dispatch (safe, registry-bounded); a **product
  tour / spotlight** layer (no tour library or coach-mark component exists anywhere in `web`).

---

## Theme A — Assistant shell + logo FAB — **M**  ✅ DONE (PR #422, 2026-07-13)

The persistent surface everything hangs off.

- [x] **A floating action button** anchored on the round midnite logo, fixed bottom-corner, present
      on **app routes only** (not the public/marketing surface). Rest state: quiet logo; **hover**:
      the gradient border + glow (Theme B primitive) lights up.
- [x] **Click expands** to a panel that itself carries the gradient border + glow (the composer-focus
      aesthetic) with the four entries — **Docs · Guide · Chat to board · Agent** — and a collapse
      affordance. Animated open/close; `prefers-reduced-motion` skips the motion.
- [x] **Coexist with ⌘K, don't duplicate it.** The palette stays the keyboard-driven command surface;
      the FAB is the discoverable, pointer-driven assistant. Portal to `body` with fixed positioning
      per the web overflow-menu convention; Escape / outside-click closes; focus-trap + ARIA
      (`dialog`/`menu`) so it's keyboard-operable.
- [x] **Mobile variant** — the FAB adapts under `md` (bottom-sheet-style panel rather than a floating
      card), wired through the existing `useIsMobile` cutoffs ([`use-media-query.ts`](../packages/web/hooks/use-media-query.ts)).

## Theme B — Extract the gradient glow into `@midnite/ui` — **M**  ✅ DONE (PR #422, 2026-07-13)

Promote the app's signature treatment to the design system so `web` + `docs` share one source.

- [x] **New `@midnite/ui` primitive + token CSS** — lift `.gradient-border` (+ its keyframes and the
      `::after` glow halo, reduced-motion-aware) out of [`globals.css`](../packages/web/app/globals.css)
      into a `GradientGlow`/`gradient-border` primitive in [`packages/ui`](../packages/ui/), exported
      from the package entry. Leaf rule intact — `ui` still imports nothing in-repo.
- [x] **Migrate the three existing composers** ([`prompt-composer.tsx`](../packages/web/components/prompt-composer.tsx),
      [`council-topic-composer.tsx`](../packages/web/components/council-topic-composer.tsx),
      [`memory-chat-composer.tsx`](../packages/web/components/memory/memory-chat-composer.tsx)) to the
      new primitive — behavior-preserving, same visual result; the raw class is removed once nothing
      references it.
- [x] **`docs` consumes it too** — the docs site gets the same glow available as a documented `@midnite/ui`
      example (Phase 26 lives on `@midnite/ui`); the boundary tests in both `ui` and `docs` stay green.

## Theme C — Docs deep-link (current page's docs) — **S-M**  ✅ DONE (PR #422, 2026-07-13)

"Docs" opens the docs *for where you are*, not a generic home.

- [x] **A `pathname → docs-slug` map** — a small table (web `lib/`) resolving the current App-Router
      pathname to the matching docs page slug, reusing the per-feature docs pages that already exist
      (Phase 26) and the `DOCS_URL` base ([`site-links.ts`](../packages/web/lib/site-links.ts)). Falls
      back to the docs home for unmapped routes.
- [x] **Docs entry** in the assistant panel opens `${DOCS_URL}/${slug}` for the active route (new tab).
      Retire the plain path-less "Docs" nav button (~L288) in favour of this — one docs affordance.
- [x] Keep the map honest: a tiny test asserts every mapped slug is a real docs route (guards against
      the map drifting as docs pages are added/renamed).

## Theme D — Relocate Chat to board into the panel — **M**  ✅ DONE (PR #422, 2026-07-13)

Chat-to-board now *lives* in the assistant, not behind a palette event.

- [x] **Render `ChatBar` in-panel** — lift the already-decoupled [`useChatCommand`](../packages/web/hooks/use-chat-command.ts)
      + [`ChatBar`](../packages/web/components/chat-bar.tsx) so "Chat to board" opens the NL command bar
      *inside* the assistant panel (preview → confirm → undo, follow-up expansion, live board refresh —
      all inherited, **no engine changes**).
- [x] **Remove the sidenav + mobile-nav entry** — drop the "Chat to board" button from
      [`nav-bar.tsx`](../packages/web/components/nav-bar.tsx) (~L270-278) and
      [`mobile-nav.tsx`](../packages/web/components/mobile-nav.tsx). The palette keeps its own `>`
      chat mode for keyboard users (same shared hook, two hosts) — the `midnite:open-chat` event may
      re-point at the FAB or be retired; either way the sidenav no longer owns the affordance.
- [x] Verify the confirm/undo/audit safety path (Phase 59 Theme F) works identically from the new host.

## Theme E — Agent chat with inline custom components — **L** — ✅ DONE (PR #423, 2026-07-13)

Ask about the fleet; get answers that render midnite's own UI where it helps.

- [x] **shared contract** — an `AssistantBlock` **discriminated union** (`{ kind: 'markdown', text }`
      | `{ kind: 'component', name, props }`) with a **fixed, zod-validated component registry**
      (`task-card`, `fleet-gauge`, `session-list`, `sparkline`) — typed props per `name`, **id-referenced**
      (the LLM emits a ref like `taskId`, never fabricated data). Lives in
      [`shared`](../packages/shared/src/assistant.ts); `coerceAssistantBlock` downgrades an
      unknown/invalid block to markdown rather than crashing.
- [x] **gateway (read-only)** — the `assistant/` module answerer composes fleet context (task counts/
      graph/activity, sessions, agent pool, Phase 61 metrics) and calls
      [`LlmService`](../packages/gateway/src/agent/llm/llm.service.ts) `generateStructured` against the
      `AssistantBlock[]` schema; feature-tagged `assistant`; **fails soft** to a deterministic overview
      when no provider is configured, when the call errors, **or when a context read throws**.
      **No new mutation path** — the agent only reads (`POST /assistant/query`).
- [x] **web dispatch** — a `name → component` registry renders each block: markdown via
      [`MarkdownPreview`](../packages/web/components/markdown-preview.tsx), components via the mapped
      midnite component with its validated props resolved **client-side** by id (reusing `TaskCard` +
      counts/sessions/metrics reads). An unrecognised/stale ref renders a graceful notice, never a blank.
- [x] **Agent chat UI** — a standalone, **ephemeral** `<AgentChat>` transcript (assistant blocks + user
      prompts) reusing the markdown-render pattern; the "answered from fleet state — no AI used" vs "via
      your AI provider" path is surfaced per answer. (Theme A's floating panel embeds it.)

## Theme F — Replayable Guide (per-route product tour) — **L**

An interactive walkthrough of the current feature, launchable any time.

- [ ] **A lightweight in-house spotlight overlay** — anchor-to-element highlight (cutout + step card),
      borrowing the portal/step-progression scaffolding from [`SetupWizard`](../packages/web/components/SetupWizard.tsx)
      but adding the DOM-anchoring `SetupWizard` lacks. No new heavy dependency; styled to match the
      assistant's glow aesthetic; `prefers-reduced-motion` + keyboard-navigable + focus-managed.
- [ ] **Per-route step registry** — a `lib/guide/` table keyed by pathname → ordered steps (anchor
      selector + copy), authored for a **few key routes first** (board, session detail, workflow
      builder, memory workspace) as the established pattern; unmapped routes show a "no guide yet" state.
- [ ] **Replayable + progress-aware** — "Guide" in the panel starts the current route's tour; it's
      re-runnable anytime (not a one-shot first-run gate). Optionally remember "seen" per route (via
      Phase 43 preference sync) to offer a subtle first-visit nudge, without ever blocking.

---

## Files this phase touches (map)

- **New (`@midnite/ui`):** a `GradientGlow` primitive + gradient-border/glow token CSS in
  [`packages/ui/src/`](../packages/ui/src/) (Theme B); exported from the package entry.
- **New (shared):** `AssistantBlock` discriminated union + component registry schema in
  [`shared/src/`](../packages/shared/src/) (Theme E); client method for the assistant endpoint in
  [`web/lib/api.ts`](../packages/web/lib/api.ts).
- **New (gateway):** a read-only assistant answerer (compose fleet context → `LlmService`) — a small
  `assistant/` module or a method beside the existing `chat-query.service.ts`; reuses
  [`LlmService`](../packages/gateway/src/agent/llm/llm.service.ts) + the `agents`/`sessions`/`pool`/
  `tasks`/`metrics` read endpoints — **no contract changes to those**.
- **New (web):** the assistant FAB + panel (`components/assistant/`), a `pathname → docs-slug` map
  (`lib/`), the `AssistantBlock` `name → component` dispatch, and the guide overlay + per-route step
  registry (`components/guide/` + `lib/guide/`).
- **Edit (web):** [`nav-bar.tsx`](../packages/web/components/nav-bar.tsx) +
  [`mobile-nav.tsx`](../packages/web/components/mobile-nav.tsx) (remove chat-to-board + path-less docs
  buttons); migrate the three composers to the `@midnite/ui` glow primitive; remove `.gradient-border`
  from [`globals.css`](../packages/web/app/globals.css) once unreferenced.
- **Reuse (no changes):** [`useChatCommand`](../packages/web/hooks/use-chat-command.ts) +
  [`ChatBar`](../packages/web/components/chat-bar.tsx) (relocated host only),
  [`MarkdownPreview`](../packages/web/components/markdown-preview.tsx), the chat `preview/command/undo`
  safety path (Phase 59 F), usage tracking + budget caps (Phases 7/50), the media-query cutoffs, the
  overflow-menu portal convention.

---

## Verification

- [x] **Shell:** the logo FAB appears on app routes (not the public site); hover lights the gradient
      border + glow; click expands a glowing, gradient-bordered panel with all four entries; Escape /
      outside-click closes; keyboard-operable + focus-trapped; motion respects `prefers-reduced-motion`;
      a usable mobile variant under `md`.
- [x] **Glow primitive:** `.gradient-border` now lives in `@midnite/ui`; the three existing composers
      render identically through the primitive; the raw CSS class is gone from `globals.css`; `ui` +
      `docs` boundary tests stay green (leaf rule intact).
- [x] **Docs deep-link:** "Docs" opens the docs page for the current route (falls back to home for
      unmapped routes); the path-less nav "Docs" button is retired; the slug-map test passes.
- [x] **Chat relocation:** "Chat to board" opens the NL command bar **inside** the panel with
      preview → confirm → undo working identically to Phase 59; the sidenav + mobile-nav entries are
      gone; the palette `>` chat mode still works (shared hook).
- [ ] **Agent:** asking about the fleet/tasks/sessions returns markdown answers **plus** inline
      midnite components (task-card / fleet-gauge / session-list / sparkline) via the zod-validated
      `AssistantBlock` registry; an unknown/invalid block degrades to markdown; with no provider
      configured it falls soft to a deterministic overview; the agent never mutates; spend is tracked
      under a distinct `assistant` feature.
- [ ] **Guide:** "Guide" starts a replayable, per-route spotlight tour on the covered routes (board,
      session, workflow, memory); it's re-runnable anytime; unmapped routes show a graceful "no guide
      yet"; keyboard-navigable + reduced-motion-aware.
- [ ] `moon run :typecheck` · `moon run :lint` · `moon run :test` green (shared `AssistantBlock` schema
      units; gateway assistant-answerer with `LlmService` fakes + fail-soft; web RTL for the FAB/panel,
      docs-slug map, relocated chat bar, block dispatch, and guide overlay — **web tests from a
      `.worktrees/`/`midnite-wt` worktree outside `.git`, not the primary checkout mid-edit**).

---

## Decisions / open questions

1. **This overturns Phase 59's "no FAB"** *(settled — the seed).* Phase 59 deliberately rejected a
   floating widget in favour of the palette + a nav chat icon. Phase 66 reverses that: the app now has
   one FAB, the assistant, and chat-to-board relocates into it. The palette stays for keyboard users.
2. **Chat renders inside the panel** *(settled).* Lift the already-decoupled `useChatCommand`/`ChatBar`
   into the assistant so chat-to-board visually lives there — not just a re-fired palette event. One
   shared hook, two hosts (panel + palette `>` mode); no engine changes.
3. **Guide is a real feature via a lightweight in-house spotlight** *(settled).* No tour library exists;
   rather than pull in `driver.js`, build a small anchor-to-element overlay (borrowing `SetupWizard`'s
   portal scaffolding) for full styling control and no bundle-budget nudge. *Open:* if the targeting
   layer proves fiddly across responsive layouts, `driver.js` is the fallback — revisit if in-house
   drifts past ~a day of work.
4. **Agent components: bounded registry + structured output** *(settled).* The LLM returns
   `AssistantBlock[]` validated against a **fixed** zod component registry (`task-card`/`fleet-gauge`/
   `session-list`/`sparkline` to start) — not a generic tool-calling framework. New components are
   added additively to the registry. Invalid/unknown blocks degrade to markdown.
5. **Glow → `@midnite/ui`** *(settled).* Promote `.gradient-border` to a design-system primitive so
   `web` + `docs` share one source; migrate the three composers. The "right" home; adds cross-package
   scope but keeps the leaf rule intact.
6. **Agent chat is ephemeral in v1** *(recommend).* No server-side thread persistence — per-session
   only, like a quick fleet Q&A. Revisit persisted assistant threads (à la Phase 65 memory chat) if
   users want history.
7. **FAB on app routes only** *(recommend).* Hidden on the public/marketing surface (which has no
   fleet, docs deep-link, or agent context). App-shell-scoped mount.
8. **Palette `midnite:open-chat` event** *(open).* With chat relocated, the event can either re-point
   at opening the FAB's chat, or be retired (palette keeps its own `>` entry). Lean **re-point** so
   any existing trigger still lands somewhere sensible.
9. **Out of scope** *(settled).* Offline/PWA changes; server-persisted agent history; exhaustive
   per-route guide content (author a few key routes as the pattern, grow later); a generic LLM
   tool-calling / function-calling framework; voice input; the agent mutating the board (read-only —
   mutation stays chat-to-board's job).
