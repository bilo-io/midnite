# Phase 60 Theme H — Consistency & flow sweep

**Date:** 2026-07-09 · **Scope:** state-coverage matrix (loading/empty/error per surface) · interaction consistency (destructive confirms, toasts, optimistic-vs-await, back-links/dead-ends) · copy & affordance (labels, empty-state copy, placeholders, disabled controls, irreversibility) · **Method:** three parallel audits — a **live state-capture** (18 Playwright screenshots of each doc-listed surface in its empty/error/loading state against the real e2e gateway, then read shot+code) plus two static code sweeps; top findings re-verified by hand. **Direction-preserving** — every finding is a gap/inconsistency/omission against a pattern that already exists elsewhere in the app, never a redesign. **Analysis-only** (no code changed).

> **Harness note:** capturing these states first required fixing a gateway-boot regression from PR #370 (a `session-usage↔agents` import cycle → TDZ crash on boot) — landed separately as **PR #371** before this audit could run. Every "error" shot forced the surface's primary GET to 500; "empty" = fresh gateway; "loading" = a delayed response.

## Summary

| # | Area | Finding | Severity |
|---|------|---------|----------|
| **SM-1** | State | **`error≈empty` (systemic):** board/sessions/projects/workflows render their **empty state + a transient toast** on a gateway 500 — dismiss/miss the toast and "backend down" is indistinguishable from "genuinely empty" (and the empty states carry Create CTAs → duplicate-creation risk) | **P2** |
| **SM-2** | State | **`loading≈empty` (systemic):** no list surface reads the `loading` flag `useApiData` already exposes; **zero skeleton components exist** — a slow/cold gateway shows "No projects yet" (+ CTA) before data lands | P2 |
| **SM-3** | State | Error handling is **toast-only, no inline retry** — recovery needs a manual reload; Search alone has an inline error but still no Retry button | P2 |
| **IC-1** | Flow | **Ideas detail is a dead end:** `error` renders bare destructive text with **no back-link**; a deleted/unknown id renders **"Loading…" forever** (infinite spinner) | **P1** |
| **IC-2** | Flow | Councils-view / workflows-edit / team-detail not-found states have **no back-link** (team-detail renders **blank** via `return null`) | P2 |
| **IC-3** | Flow | Ideas delete uses **`window.confirm`** — the lone bypass of the shared `useConfirm()` dialog | P2 |
| **IC-4** | Flow | **Bulk-delete family silent:** projects/workflows/councils/memory bulk-delete has no success toast, no error toast, no rollback (tasks/decks/credentials all give feedback) | P2 |
| **IC-5** | Flow | Ideas create/save mutate silently — create swallows its error (`catch {}`), save has no success/error toast | P2 |
| **IC-6** | Flow | Optimistic-vs-await inconsistent: task/roadmap moves are optimistic+rollback; sibling list mutations await-then-refetch with no pending affordance | P3 |
| **CA-1** | Copy | Creation trigger verb split: **"New {noun}"** on 10 surfaces vs **"Add {noun}"** on 3 settings surfaces (same "create fresh entity" action) | P2 |
| **CA-2** | Copy | Disabled primary actions don't say **why** — the clean `disabledHint` pattern exists only in the council composer | P2 |
| **CA-3** | Copy | Search placeholder: 11 inputs "Search {noun}" vs 3 with trailing "…" | P3 |
| **CA-4** | Copy | Delete irreversibility copy diverges 3 ways; some destructive confirms omit the permanence note entirely | P3 |
| **CA-5** | Copy | Empty-state tier inconsistent: rich `EmptyState` primitive on main pages vs bare dashed one-liners in settings vs board's terse "Nothing here" | P3 |

**Headline:** the app has a **strong shared spine already** — a single `useConfirm()`/`ConfirmProvider`, a `useToast()`, a well-designed `EmptyState` primitive, and (in Search) a textbook three-state fetch machine. The findings are the surfaces that **fell off that spine**, and they cluster into two systemic gaps worth a dedicated remediation slice:

1. **State coverage (SM-1/2/3):** the whole `useApiData` list-data path collapses **loading, empty, and error into one "empty" render** (+ a toast on error). One shared `<QueryState>` wrapper — distinct skeleton / empty / error-with-retry off a `useApiData` result — fixes all three across board/sessions/projects/workflows at once. **Highest-value fix.**
2. **Mutation feedback + not-found (IC-1/3/4/5, IC-2):** a shared `runMutation`/`useBulkDelete` helper (confirm → optimistic → `toast` on success/failure → rollback) kills IC-3/4/5/6; a shared `<NotFoundState backHref>` kills IC-1/2.

No P0. One **P1** (IC-1, Ideas dead-end/infinite-load). Everything else is P2/P3 polish.

---

## Section 1 — State coverage (loading / empty / error)

All gateway-backed list surfaces share one data path: `useApiData` (`lib/use-api-data.ts:28`, TanStack Query) → page passes `data ?? []` to the view → `useGatewayErrorToast(error)` fires a toast on failure. The structural consequence: on **both** loading (`data` still null) and error (`data` null + toast) the view gets `[]` and renders its **empty state**. No caller reads the `loading` flag `useApiData` returns; there are **zero** skeleton components in the package.

### Matrix (what the user actually sees)

| Surface | Loading | Empty | Error |
|---|---|---|---|
| **Board** | "Nothing here" per column (no skeleton) | "Nothing here" per column | "Nothing here" **+ toast** — *error≈empty* |
| **Sessions** | "No sessions yet" | "No sessions yet" | "No sessions yet" **+ toast** — *error≈empty* |
| **Projects** | "No projects yet" (+ CTA) | "No projects yet" (+ CTA) | same **+ toast** — *error≈empty* |
| **Workflows** | "No workflows yet" (+ CTA) | "No workflows yet" (+ CTA) | same **+ toast** — *error≈empty* |
| **Search** | ✅ "Searching…" spinner | ✅ "No results for '…'." | ✅ inline "Search failed — try again." (no Retry) |
| **Slides / Settings** | localStorage/prefs-backed — no gateway GET, so a backend outage produces **no signal** (SM-4, informational) |

### SM-1 — `error≈empty` ambiguity — 📋 DOCUMENTED (P2, systemic)

On a gateway 500, board/sessions/projects/workflows render their **empty state** + a transient dismissible toast (`lib/use-gateway-error-toast.ts:13-24` is the *only* error signal; views branch solely on `length === 0` — `board-view.tsx:383`, `sessions-view.tsx:385`, `projects-view.tsx:368`, `workflows-view.tsx:218`). Miss/dismiss the toast and a down gateway looks like an empty collection — and the empty states carry "New project"/"New workflow" CTAs, so a user may start creating duplicates.
- **Evidence:** `h-board-error.png`, `h-sessions-error.png`, `h-projects-error.png`, `h-workflows-error.png` (all show the empty render + toast).
- **Proposed shared pattern:** a `<QueryState>` wrapper taking a `useApiData` result and rendering **distinct** skeleton / empty / **error-with-retry** branches; error branch = inline panel + a `Retry` bound to `refresh()`. Replaces the `data ?? [] → empty` + toast idiom at 4 call sites. **Effort: M.**

### SM-2 — `loading≈empty`, no skeletons — 📋 DOCUMENTED (P2, systemic)

No list surface reads `useApiData`'s `loading` flag (`lib/use-api-data.ts:43-48`); while the first fetch is in flight the empty state shows. `h-board-loading.png` shows all columns already reading "Nothing here" mid-load. Grep confirms **no `Skeleton` component** anywhere in `app/` or `components/`.
- **Proposed shared pattern:** same `<QueryState>` wrapper renders a list/board skeleton while `loading && !data`. **Effort: M.**

### SM-3 — toast-only errors, no inline retry — 📋 DOCUMENTED (P2)

No list surface offers inline error + retry; recovery = manual reload. Search is the only inline error (`search-results.tsx:108-109`) and even it has no Retry button (recovery = retype).
- **Proposed shared pattern:** the `<QueryState>` error branch's `Retry` button (SM-1); give Search's inline error the same. **Effort: S** once the wrapper exists.
- **Cross-ref:** Theme G **ES-4** (no route-level `error.tsx`) is the render-throw counterpart to this data-error gap.

### SM-4 — Slides & Settings have no observable failure surface — 📋 DOCUMENTED (P2-low, informational)

Both are local (localStorage / client prefs), never hit the gateway primary GET, so an outage produces no signal (`h-slides-empty.png`==`h-slides-error.png`; settings likewise). Not a bug today; a note for if either grows a gateway dependency.

**Confirmed good:** **Search** is the reference — an explicit `FetchStatus` machine (`'idle'|'loading'|'done'|'error'`, `search-results.tsx:42,100-118`) with three visually distinct branches. The shared **`EmptyState`** primitive (`components/empty-state.tsx`, icon+heading+hint+CTA, per-filter variants) makes the *empty* state genuinely good on sessions/projects/workflows/slides — the defect is only that loading+error collapse into it.

---

## Section 2 — Interaction consistency

Strong shared spine: `useConfirm()`/`ConfirmProvider` (`components/confirm-dialog.tsx`, a proper `role="alertdialog"`) and `useToast()` (`components/toast.tsx`). Findings are the surfaces off that spine — mostly Ideas + the bulk-delete family.

### IC-1 — Ideas detail is a dead end (and infinite-loads on a stale id) — 📋 DOCUMENTED (P1)

`app/(main)/ideas/[id]/idea-detail-view.tsx`: `if (error)` → bare `<p class="text-destructive">{error}</p>` with **no back-link** (`:71-74`); `if (!idea)` (deleted/unknown id, no error) → **"Loading…" forever** (`:79-82`). A bookmarked `/ideas/view?id=<deleted>` spins indefinitely. Peers do it right — sessions/projects/tasks/`slides/edit` render a "not found" card **with a back link** and separate not-found from loading.
- **Proposed shared pattern:** a `<NotFoundState backHref label>` (or reuse the sessions/projects `{back}` + card idiom); make the terminal branch `(!id || error || (!loading && !data))`; forbid `return null` / bare "Loading…" as a not-found outcome. **Effort: S.**

### IC-2 — not-found states without a back-link — 📋 DOCUMENTED (P2)

`councils/view/page.tsx:22` "Council not found." (no back-link); `workflows/edit/page.tsx:27` "Workflow not found." (no back-link); `settings/team/[teamId]/team-detail-view.tsx:127-128` bare destructive text, and `!team` → **`return null`** (blank page). Same `<NotFoundState>` fix as IC-1. **Effort: S–M.**

### IC-3 — Ideas delete uses `window.confirm` — 📋 DOCUMENTED (P2)

`idea-detail-view.tsx:66` — `window.confirm(...)`, the only native-dialog call in the app (unstyled, un-themed). Every other destructive action routes through `useConfirm()` (slides/projects/tasks/memory/credentials/guardrails…). One-line swap. **Effort: S.**

### IC-4 — bulk-delete family is silent — 📋 DOCUMENTED (P2)

`projects-view.tsx:181`, `workflows-view.tsx:77`, `councils-view.tsx:81`, `memory-view.tsx:95` all `await Promise.all(ids.map(deleteX))` with **no try/catch, no toast, no rollback** (also `sessions-view.tsx:140` single delete swallows failure). Tasks (`tasks-view.tsx:311-319`), decks (`deck-card.tsx:88`), credentials (`credentials/page.tsx:66-68`) all give feedback. **Proposed:** a shared `useBulkDelete`/`runMutation` (confirm → optimistic-remove → await → `toast.error` + rollback). **Effort: M.**

### IC-5 — Ideas create/save mutate silently — 📋 DOCUMENTED (P2)

`ideas/page.tsx:42-44` create wraps in `catch { /* noop */ }` (no error toast); `idea-detail-view.tsx:48-60` save has no success/error toast. Same `runMutation` helper as IC-4. **Effort: S.** (Distinct site from Theme G ES-5.)

### IC-6 — optimistic-vs-await inconsistent — 📋 DOCUMENTED (P3)

Task/roadmap moves are optimistic+rollback (`tasks-view.tsx:248-260`, `roadmap-board.tsx:127/145`); the IC-4/IC-5 list mutations await-then-refetch with no pending affordance — selecting rows and deleting is instant on the board, stalls on projects. The `useBulkDelete` wrapper (IC-4) unifies it. **Effort: M.**

**Confirmed consistent:** the destructive-confirm spine (`useConfirm()`) is used by board/tasks/projects/workflows/sessions/councils/memory/repos/agents/credentials/slides/pr-review/roadmap/guardrails; **data restore** correctly escalates to a type-the-word-"replace" gate; not-found+back-link is right on sessions/projects/tasks/slides-edit; optimistic+rollback+toast is right on board drag + roadmap.

---

## Section 3 — Copy & affordance

No **P1** affordance gap — a scripted scan of every icon-only `<Button>`/`<button>` found **zero** missing `aria-label`/`title`/`sr-only`.

### CA-1 — creation-trigger verb split ("New" vs "Add") — 📋 DOCUMENTED (P2)

"Create fresh entity" reads **"New {noun}"** on 10 surfaces (memory/projects/workflows/schedules/slides/councils/ideas/tasks/sessions/templates) but **"Add {noun}"** on 3 settings surfaces — `agents-view.tsx:513` "Add" (+ CTA "Add subagent"), `inbound-sources-section.tsx:336` "Add source", `integrations-view.tsx:184` "Add webhook endpoint". (The subagent noun is also spelled 3 ways in one view: "Sub Agents"/"subagents"/"subagent".)
- **Proposed pattern:** reserve **"New {noun}"** for creating a top-level entity, **"Add {noun}"** only for attaching an existing thing to a parent (the code already does the latter for members/tags). Rename the 3 settings triggers. **Effort: S.**

### CA-2 — disabled primary actions don't explain why — 📋 DOCUMENTED (P2)

A clean `disabledHint` pattern exists but only in `council-topic-composer.tsx` (`:22,38`, fed at `council-detail-view.tsx:229`). Dead-without-reason elsewhere: `media-detail-view.tsx:376` "Generate" `disabled={!saved}`, `data-view.tsx:286` `disabled={!canRestore}`, `integrations-view.tsx:254` `disabled={!canSubmit}`, `world-clocks-widget.tsx:335` `disabled={!valid}`. (Buttons disabled purely while saving are self-evident — excluded.)
- **Proposed pattern:** generalize `disabledHint`/a `title` tooltip for any primary action gated on a **non-obvious** precondition. **Effort: M.**

### CA-3 — search placeholder ellipsis inconsistency — 📋 DOCUMENTED (P3)

11 inputs "Search {noun}" (no ellipsis) vs 3 with "…" (`workflows/templates/page.tsx:299`, `slides-view.tsx:95`, `dashboard-add-widget.tsx:89`). Standardize on "Search {noun}". **Effort: S.**

### CA-4 — delete-irreversibility copy diverges — 📋 DOCUMENTED (P3)

Shared `DeleteConfirmButton` says "This is permanent and can't be undone." (`delete-confirm-button.tsx:24`); hand-rolled confirms say "This cannot be undone." (7 sites) or a longer variant (3 sites), and some destructive deletes omit any permanence note (`memory-modal.tsx:102`, `routine-config-modal.tsx:80/118`).
- **Proposed pattern:** have the `confirm-dialog` auto-append one canonical irreversibility sentence when `destructive !== false`, so no site can forget it. **Effort: M.**

### CA-5 — empty-state tier inconsistent — 📋 DOCUMENTED (P3)

Rich `EmptyState` primitive on main collection pages vs **bare dashed one-liners** in settings (`inbound-sources-section.tsx:348`, `integrations-view.tsx:396`, `api-tokens-view.tsx:245`, `approvals-view.tsx:278`) vs board's terse **"Nothing here"** (`board-view.tsx:385`, the outlier). (Content pattern — state + next step — is good where present.)
- **Proposed pattern:** route settings-list empties through `EmptyState` (or always pair heading + next-step); warm up the board-column empty. **Effort: M.**

**Confirmed consistent:** button voice is uniformly sentence-case verb+noun (no Title-Case drift, no "+ Task"); "New X" → "Create X" (modal submit) is a consistent pairing; destructive confirms use the shared dialog + `AlertTriangle`; data-restore is the gold standard for irreversible signposting; **icon-only buttons are labelled everywhere**; "Dismiss" (transient) vs "Close" (modal) is an intentional, consistent distinction.

---

## Cross-references (Theme G, not re-filed)

- **ES-4** (no web App Router `error.tsx`/`global-error.tsx`) — the render-throw counterpart to SM-3's toast-only data-error handling; a route error boundary + the `<QueryState>` wrapper together close the web error-surface gap.
- **ES-5** (`tasks-view.tsx:169-171` `getTask(...).catch(() => setSelected(null))` swallow) — the board task-detail fetch swallow; noted for continuity.

---

## Ranked backlog (for Theme M)

1. **SM-1/SM-2/SM-3** (P2, systemic) — a shared **`<QueryState>`** wrapper (distinct skeleton / empty / error-with-retry off a `useApiData` result) applied to board/sessions/projects/workflows. Kills the whole `loading≈empty≈error` class. **[M]** — the single highest-value fix.
2. **IC-1** (P1) + **IC-2** (P2) — a shared **`<NotFoundState backHref>`**; fix the Ideas infinite-load dead-end first. **[S–M]**
3. **IC-3/IC-4/IC-5/IC-6** (P2/P3) — a shared **`runMutation`/`useBulkDelete`** helper (confirm → optimistic → toast → rollback); swap Ideas' `window.confirm`. **[M]**
4. **CA-1..CA-5** (P2/P3) — labeling convention ("New" vs "Add"), `disabledHint` generalization, placeholder + irreversibility-copy standardization, empty-state tier. **[S–M each]**

**Cross-cutting pattern (Theme M):** three of the four backlog items are *one shared component/helper each* replacing a scattered ad-hoc idiom (`<QueryState>`, `<NotFoundState>`, `runMutation`). The spine exists (`useConfirm`, `useToast`, `EmptyState`); the remediation is extending it two or three components further, not new design. A single "web state/flow consistency" slice would close most of Theme H.
