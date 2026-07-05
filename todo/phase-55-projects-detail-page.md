# Phase 55 — Projects Detail Page (a cockpit per project)

> midnite already treats **projects** as a first-class domain — they own a plan, sources, phase-docs,
> and a bag of tasks — but the **only way to open one is a modal** ([`project-modal.tsx`](../packages/web/components/project-modal.tsx),
> 5 tabs: Details / Sources / Plan / Tasks / Phase Docs). Sessions (Phase 51) and tasks (Phase 42)
> both graduated to **deep-linkable detail pages**; projects have not, so the session left panel
> already links to a **dead `/projects/{id}`**. Phase 55 gives projects the same treatment: a
> **`/projects/view?id=` cockpit** — a `PageHeader` + two independently collapsible, state-persisted
> rails around a **center tabbed content area** — a faithful clone of the session cockpit. The
> **modal stays** for in-context use (the office board room) and for **creating** a project; the page
> becomes the primary navigation target everywhere else. This is **composition, not invention** — the
> two-sidebar layout, the tab primitive, and every project endpoint already exist; this phase wires
> them into a focused per-project surface.

> **Scope guardrails (CLAUDE.md).** **Entirely web** work — **no gateway/API changes at all**: every
> endpoint the page needs (`getProject`, `updateProject`, `deleteProject`, `addProjectSource`/`removeProjectSource`/`reorderProjectSources`,
> `enhanceProjectDescription`, `draftProjectPlan`/`updateProjectPlan`, `exportProjectMarkdown`) already
> exists in [`web/lib/api.ts`](../packages/web/lib/api.ts) and is exercised by the modal today. The
> page follows the **static-export routing convention** (`output: 'export'`): a `/projects/view?id=`
> query-string route like sessions/tasks/councils/ideas — **no `[id]` segment, no `generateStaticParams`**.
> Reuse the [`councils/[id]`](../packages/web/app/(main)/councils/[id]/council-detail-view.tsx) /
> [`sessions/view`](../packages/web/app/(main)/sessions/view/session-detail-view.tsx) two-sidebar
> layout, the [`@midnite/ui` tabs](../packages/ui/src/components/tabs.tsx) primitive, and
> [`PageHeader`](../packages/web/components/page-header.tsx) — **don't rebuild them**. The modal keeps
> **behavior parity** by re-rendering the *same* extracted panels (Theme B), so the two surfaces never
> drift. Responsive cutoffs come from the [`use-media-query`](../packages/web/hooks/use-media-query.ts)
> hooks, never hand-written widths (web overflow menus still portal to body per repo convention).

> Effort tags: **S** small · **M** medium · **L** large. **B** (extract the aspect panels) unblocks the
> content; **A** (shell + routing + layout) is the frame; **C** fills the rails; **D** wires the entry
> points and enforces the modal-vs-page rule. A+B are the critical path; C builds on A's shell, D on both.

---

## Current state (what exists to build on)

- **Project domain (rich already)** — `Project` ([`shared/src/project.ts`](../packages/shared/src/project.ts)):
  `id`, `name`, `description?`, `tag`, `color` (hex), `workDir?`, `plan?`, `planUpdatedAt?`, `archived?`,
  `createdAt`, `updatedAt`, `sources: ProjectSource[]`, `taskCount?`, `teamId?`, `ideaId?`,
  `phaseDocSync?`, `phaseDocSyncRepoId?`. `ProjectSource`: `id`, `url`, `kind`
  (`web`|`github-repo`|`github-pr`|`github-issue`|`youtube`|…), `title?`, `faviconUrl?`, `fetchedAt?`.
- **Projects are modal-only (no detail page)** — [`project-modal.tsx`](../packages/web/components/project-modal.tsx)
  with 5 tabs: **details** (name, description + AI enhance, tag + color, workDir, project-memory link,
  phase-doc sync config), **sources** (URL list, max 10, reorderable), **plan** (draft/edit markdown,
  seed tasks from plan), **tasks** (clickable rows of the project's tasks), **phasedocs** (phase-doc
  editor). Opened from the [`projects-view.tsx`](../packages/web/app/(main)/projects/projects-view.tsx)
  list (edit / new / `?open=<id>` deep-link) and the office board room. **There is no
  `/projects/view` / `/projects/[id]` yet — this phase builds it.**
- **Every project endpoint already exists** — `getProject(id)`, `getProjects()`, `createProject`,
  `updateProject`, `deleteProject`, `addProjectSource`/`removeProjectSource`/`reorderProjectSources`,
  `enhanceProjectDescription`, `draftProjectPlan`/`updateProjectPlan`, `exportProjectMarkdown` in
  [`web/lib/api.ts`](../packages/web/lib/api.ts). **No new gateway work.**
- **Two-sidebar cockpit precedent (ready to clone)** — [`sessions/view/session-detail-view.tsx`](../packages/web/app/(main)/sessions/view/session-detail-view.tsx)
  (itself modelled on [`councils/[id]/council-detail-view.tsx`](../packages/web/app/(main)/councils/[id]/council-detail-view.tsx)):
  sticky `PageHeader`, `flex flex-col lg:flex-row lg:items-start`, `min-w-0 flex-1` center, a **left**
  and a **right** rail that each collapse, open/closed state persisted via `useLocalStorage`
  (`midnite.session.leftOpen`/`rightOpen`), mobile → drawers via `useIsMobile`/`useIsTablet`/`useIsDesktop`
  ([`use-media-query.ts`](../packages/web/hooks/use-media-query.ts)). **The template to match.**
- **Tab primitive (ready)** — segmented [`@midnite/ui` tabs](../packages/ui/src/components/tabs.tsx)
  (`options`/`value`/`onChange`; caller owns panel rendering) — already used for the projects-list view
  toggle. Drives the center tab bar.
- **The dead link** — [`session-left-panel.tsx`](../packages/web/app/(main)/sessions/view/session-left-panel.tsx)
  already renders `<Link href={"/projects/" + project.id}>`, pointing at a route that doesn't exist.
  This phase both creates the destination and fixes the link to `/projects/view?id=`.
- **Derivable stats (real today)** — `taskCount` (on `Project`); task status breakdown via the tasks
  the modal's Tasks tab already fetches; `createdAt`/`updatedAt`/`planUpdatedAt` (activity timeline);
  `sources.length`; `workDir`, `tag`/`color`, `teamId`/`ideaId`, `archived`. **No fabricated metrics** —
  the rails surface only fields that genuinely exist (Decision §5).

---

## Theme A — Detail page shell, routing & collapsible layout — **M**

The frame: a static-export route with a center tab area and two persistent rails.

- [ ] `app/(main)/projects/view/page.tsx` — reads `?id=` via `useSearchParams`, fetches the project
      through `useApiData(getProject)`. **No `[id]` segment** (static export). Inline **loading** and
      **not-found** states.
- [ ] `project-detail-view.tsx` — the three-region shell mirroring the session cockpit: sticky
      `PageHeader` (project name + tag/color dot + `archived` badge + back-to-`/projects` + rail toggles),
      `flex flex-col lg:flex-row lg:items-start`, a `min-w-0 flex-1` **center** holding the tab bar +
      active panel, and **left**/**right** rails that each collapse to a slim rail.
- [ ] **Center tab bar** driven by the [`@midnite/ui` tabs](../packages/ui/src/components/tabs.tsx)
      primitive — **Details · Plan · Tasks · Phase Docs** (Sources moves to the right rail, Decision §3);
      active tab reflected in the URL (`&tab=`) so a tab is deep-linkable and survives reload.
- [ ] **Persist rail open/closed state** via `useLocalStorage` (distinct keys `midnite.project.leftOpen`,
      `midnite.project.rightOpen`) — closed stays closed across reloads (Decision §4).
- [ ] **Responsive:** on `useIsMobile` the rails become **drawers** (toggled from the header), the tab
      content takes full width. Cutoffs from the media-query hooks only.

---

## Theme B — Extract the aspect panels (shared by modal + page) — **M** — ✅ DONE (PR #300, 2026-07-05)

Make the modal and the page render the *same* panels so they can never drift.

- [x] Extract each aspect out of [`project-modal.tsx`](../packages/web/components/project-modal.tsx) into
      standalone components under `components/projects/panels/` — `project-details-panel.tsx`,
      `project-sources-panel.tsx`, `project-plan-panel.tsx`, `project-tasks-panel.tsx`,
      `project-phasedocs-panel.tsx`. Each takes the `project` + the mutation callbacks it needs; **no
      layout assumptions** (works inside a modal tab *or* a page region).
- [x] **Behavior-identical** — description AI enhance, tag/color, workDir, project-memory link,
      phase-doc sync config, source add/remove/**reorder**, plan draft/edit, clickable task rows. This is
      a **refactor**, not a redesign; the modal's existing stories stay green. (Only intentional delta:
      edit-mode Save moved into the Details panel; edit footer is Delete · Close.)
- [x] The modal becomes a thin shell that renders the extracted panels in its tab bar (create mode keeps
      its staged inline form); the page will render Details/Plan/Tasks/Phase-Docs in the center and
      Sources in the right rail (Theme C) — **one set of panels, two shells.**

---

## Theme C — Rail content: stats & actions (left) · sources & activity (right) — **S-M**

The instruments and context around the tabbed content — honest about what's real.

- [ ] **Left rail — stats + quick actions** (`project-stats-panel.tsx`): **task counts by status**
      (todo/wip/done/… from the project's tasks) + total `taskCount`, source count, and **quick actions**
      — **Export markdown** (`exportProjectMarkdown`), **Archive/Unarchive** (`updateProject`), **Delete**
      (`deleteProject`, with confirm). Degrades gracefully — rows/actions a project lacks are omitted.
- [ ] **Right rail — sources + activity** (`project-info-panel.tsx`): the **Sources** panel (reused from
      Theme B, add/remove/reorder inline) + an **activity readout** (`createdAt`, `updatedAt`,
      `planUpdatedAt`) as a compact `<dl>` + a **project-memory** link + **team**/**idea origin** metadata
      (`teamId`/`ideaId`) shown only when present.
- [ ] Both rails collapse independently (Theme A) and stay honest — **no cost/token metrics fabricated**;
      surface only fields that exist today (Decision §5).

---

## Theme D — Navigation wiring & the modal-vs-page rule — **S**

Enforce "modal in context, page in general," and make the cockpit reachable everywhere a project appears.

- [ ] **Projects-list cards navigate to the page** — in [`projects-view.tsx`](../packages/web/app/(main)/projects/projects-view.tsx),
      a card click becomes a real `<Link>` → `/projects/view?id={id}` (cmd/middle-click opens a new tab);
      **edit** still available as an explicit action, but the default click routes to the cockpit.
- [ ] **Modal reserved for New + office** — the **"New project"** flow keeps the modal (creation stays a
      modal per the seed), and the **office board room** keeps its in-context modal **unchanged**. The
      `?open=<id>` deep-link on `/projects` can now redirect to `/projects/view?id=` (a project is a page,
      not a list-overlay) — Decision §6.
- [ ] **Fix the dead link** — [`session-left-panel.tsx`](../packages/web/app/(main)/sessions/view/session-left-panel.tsx)
      `/projects/{id}` → `/projects/view?id=`; audit any other project deep-links (task page project chip,
      search results) and point them at the page.
- [ ] Deep links resolve directly — a bookmarked `/projects/view?id=` loads standalone (Theme A's container).

---

## Files this phase touches (map)

- **New (web — page + shell):** `app/(main)/projects/view/page.tsx`, `app/(main)/projects/view/project-detail-view.tsx`
- **New (web — extracted/rail panels):** `components/projects/panels/` (`project-details-panel.tsx`,
  `project-sources-panel.tsx`, `project-plan-panel.tsx`, `project-tasks-panel.tsx`,
  `project-phasedocs-panel.tsx`), plus `project-stats-panel.tsx` (left rail) and `project-info-panel.tsx`
  (right rail)
- **Edit (web):** [`project-modal.tsx`](../packages/web/components/project-modal.tsx) (consume extracted
  panels — thin refactor); [`projects-view.tsx`](../packages/web/app/(main)/projects/projects-view.tsx)
  (card → `<Link>`, `?open=` redirect); [`session-left-panel.tsx`](../packages/web/app/(main)/sessions/view/session-left-panel.tsx)
  (fix `/projects/{id}` link) + any other project deep-links
- **Reuse (no changes):** [`@midnite/ui` tabs](../packages/ui/src/components/tabs.tsx),
  [`PageHeader`](../packages/web/components/page-header.tsx), the
  [`session-detail-view`](../packages/web/app/(main)/sessions/view/session-detail-view.tsx) /
  [`council`](../packages/web/app/(main)/councils/[id]/council-detail-view.tsx) two-sidebar layout
  pattern, [`use-media-query.ts`](../packages/web/hooks/use-media-query.ts), every project method in
  [`web/lib/api.ts`](../packages/web/lib/api.ts)
- **None (gateway/shared):** no endpoint, schema, or migration changes — the page composes what exists

---

## Verification

- [ ] `/projects/view?id=<project>` opens a page with a `PageHeader`, a **center tab bar**
      (Details/Plan/Tasks/Phase-Docs), and **two rails**; a bookmarked deep link loads standalone; an
      unknown id shows an inline not-found.
- [ ] **Every aspect is fully usable on the page** at parity with the modal — edit description (incl. AI
      enhance), tag/color, workDir; add/remove/**reorder** sources; draft/edit plan and **seed tasks**;
      edit phase-doc sync; click a task row through to the task page.
- [ ] **Left/right rails collapse independently** and their open/closed state **persists across a reload**;
      on mobile they become **drawers** and the tab content goes full-width; the active tab is reflected in
      the URL and survives reload.
- [ ] Left rail shows **task counts by status** + quick actions (**export**, **archive/unarchive**,
      **delete-with-confirm**); right rail shows **sources**, the **activity timeline**, project-memory link,
      and team/idea metadata **only when present** — nothing fabricated.
- [ ] **Modal-vs-page rule holds:** projects-list cards **navigate to the page**; the **office board room**
      still opens the **modal** (unchanged); **"New project"** still opens the **modal**; the session
      left-panel project link now resolves to `/projects/view?id=`.
- [ ] The **modal still works unchanged** for every aspect (it renders the same extracted panels) — its
      existing stories/tests stay green.
- [ ] `moon run :typecheck` · `moon run :lint` · `moon run :test` green (web RTL/story for the detail view,
      rail-collapse persistence, tab routing, and each extracted panel; modal parity regression; **web tests
      run from the primary checkout, not a `.git` worktree** — use `Dev/midnite-wt/` for web work).
- [ ] Screenshots (light/dark) of the new page captured for the visual baselines.

---

## Decisions / open questions

1. **Direction: cockpit parity** *(settled).* A faithful clone of the Phase 51 session cockpit —
   `PageHeader` + two collapsible rails + center tabs — rather than a deeper project workspace. Rich per-aspect
   views (a mini-kanban Tasks tab, a net-new Sessions tab, a rich activity feed) are **out of scope** here.
2. **Static-export routing: `/projects/view?id=`** *(settled).* A query-string route like
   sessions/tasks/councils/ideas — **no `[id]` segment / `generateStaticParams`** (unavailable under
   `output: 'export'`). Deep-linkable and standalone-loadable; the active tab rides `&tab=`.
3. **Sources → right rail, not a center tab** *(settled).* Center tabs are **Details · Plan · Tasks · Phase
   Docs**; **Sources** is reference context, so it lives in the right rail. The other four modal tabs map
   1:1 to center tabs.
4. **Rail state in `localStorage`, per the cockpit precedent** *(settled).* Persist collapse state
   client-side with `useLocalStorage` (`midnite.project.leftOpen`/`rightOpen`); server-synced preferences
   (Phase 43) are a later upgrade, not needed here.
5. **Rails surface only real fields** *(recommend).* Task counts, source count, activity timestamps,
   workDir, tag/color, team/idea origin all exist today. **No cost/token rollups fabricated** — if/when
   real per-project cost accounting lands (a future metrics phase), the left rail gains a row; until then it
   doesn't pretend.
6. **`?open=<id>` on `/projects` redirects to the page** *(recommend).* Since a project is now a page, the
   old list-overlay deep-link should route to `/projects/view?id=` rather than re-opening the modal over the
   list. (The office board room and **New** are the only remaining modal entry points.)
7. **Share panels, not a `variant` body** *(settled).* Because the page has rails and the modal is a single
   column, we extract the **aspect panels** (each layout-agnostic) and let each shell arrange them — rather
   than a single `<ProjectDetail variant=page|modal>` (which fought the differing shells). This still gives
   one source of truth per aspect.
8. **Out of scope** *(settled).* No gateway/API/schema changes; no `/projects` **hub** redesign beyond the
   card→page nav change; no ⌘K / global-search integration beyond fixing existing project links; no new
   Sessions/Activity/kanban views (those were the Direction-2 "deep aspect views" path — a candidate future
   phase).
