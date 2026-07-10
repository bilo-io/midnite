# Phase 65 — Memory Workspace (a knowledge studio per memory)

> midnite already has a **memory** domain — authored markdown, global or project-scoped, with up to 10
> **reference sources** (URL + favicon + OG title) — but the **only way to open one is a single-panel
> modal** ([`memory-modal.tsx`](../packages/web/components/memory-modal.tsx): title / scope / markdown /
> source-links). Projects, sessions, and tasks all graduated to **deep-linkable detail pages** (Phases
> 55 / 51 / 42); memory has not, and `routeFor('memory')` still points every search hit at the flat
> `/memory` list. Phase 65 turns memory into a **full-page, 3-panel workspace** at **`/memory/view?id=`** —
> a NotebookLM-style surface: a **left sources rail** (list + add, collapsible), a **center** memory doc
> **+ chat-to-the-knowledge-base** composer, and a **right Studio rail** that **generates artifacts** from
> the memory's corpus (brief · FAQ · study guide · timeline · infographic · audio overview · video). To
> make chat + generation *real* (not "chat to the doc you wrote"), sources graduate from bare links to an
> **ingested corpus** — URL bodies fetched + readability-extracted, plus **file uploads** (PDF / `.md` /
> `.txt`). Finally, memory becomes **the** knowledge notion: the **project "sources" tab is retired**, its
> data migrated into a project-scoped memory.

> **Scope guardrails (CLAUDE.md).** Full-stack, but every layer follows the existing grain.
> **Naming stays `memory`/`memories`** throughout — the route, table, FTS `type`, shared schemas, and
> client keep their names; the new page is branded **"Memory"**, *not* "Notebook" (no domain rename, no
> rename migration). Gateway work stays **module → controller → service → repository** under
> [`gateway/src/memories/`](../packages/gateway/src/memories/) + [`gateway/src/media/`](../packages/gateway/src/media/);
> the **501 `generate` stub** in [`media.service.ts`](../packages/gateway/src/media/media.service.ts) is the
> home for generated artifacts. Chat + generation reuse the existing provider-agnostic, metered
> [`LlmService`](../packages/gateway/src/agent/llm/llm.service.ts) — **no new LLM plumbing**; TTS/video are
> **additive provider seams**, degrading gracefully when unconfigured. Retrieval is **FTS5 keyword +
> full-corpus stuffing** ([`search/`](../packages/gateway/src/search/)) — **no embeddings / vector store**
> this phase. Every wire shape is a zod schema in [`shared`](../packages/shared/src/); the web page follows
> the **static-export `/…/view?id=` convention** (no `[id]` segment) and **clones the Phase 55 two-rail
> cockpit** ([`project-detail-view.tsx`](../packages/web/app/(main)/projects/view/project-detail-view.tsx)) —
> don't reinvent the shell. Overflow menus **portal to body**; responsive cutoffs come from
> [`use-media-query.ts`](../packages/web/hooks/use-media-query.ts) only.

> Effort tags: **S** small · **M** medium · **L** large. This is an **XL** phase — themes are cut so each
> ships on its own. **A** (page shell + `GET /memories/:id` + routing) is the frame and unblocks
> everything. **B** (source ingestion) is the corpus foundation that **C** (chat) and **D/E** (Studio)
> ground on. **F** (retire project sources) is independent and can land in parallel. **G** (tests/docs)
> trails each theme. Critical path: A → B → {C, D, E}.

---

## Current state (what exists to build on)

- **Memory domain (modal-only, link-only sources)** — `Memory` ([`shared/src/memory.ts`](../packages/shared/src/memory.ts)):
  `id`, `title`, `content` (markdown, ≤ `MAX_MEMORY_CONTENT` 50 000), `projectId | null` (null = global),
  `sources: MemorySource[]` (≤ `MAX_SOURCES_PER_MEMORY` 10), `archived`, `createdAt`, `updatedAt`.
  `MemorySource`: `id`, `url`, `kind`, `title?`, `faviconUrl?`, `fetchedAt?`, `position`. **Source *content*
  is never fetched or stored** — only the link + OG metadata (via
  [`projects/lib/opengraph.ts`](../packages/gateway/src/projects/lib/opengraph.ts) `fetchSourceMetadata`).
- **REST only, no `GET /:id`** — [`memories.controller.ts`](../packages/gateway/src/memories/memories.controller.ts):
  `GET /memories` (list), `POST`, `PATCH /:id`, `DELETE /:id`, `POST /:id/sources`, `POST /:id/sources/reorder`,
  `DELETE /:id/sources/:sourceId`. The service has `getMemory(id)` but **the controller never exposes it** —
  net-new for the page. Tables `memories` + `memory_sources` in [`db/schema.ts`](../packages/gateway/src/db/schema.ts)
  (lines ~325 / ~344); migrations `drizzle/0009_memories.sql`, `0017_…`.
- **FTS5 indexes memory title+content** — [`search/lib/index-mappers.ts`](../packages/gateway/src/search/lib/index-mappers.ts)
  `memoryToIndexDoc` (content clipped to 4 000 chars); [`memories.service.ts`](../packages/gateway/src/memories/memories.service.ts)
  upserts/removes on write. **Sources are not indexed.** `routeFor('memory', id)` → `/memory` (list, no detail).
- **Provider-agnostic LLM layer (production-wired)** — [`agent/llm/llm.service.ts`](../packages/gateway/src/agent/llm/llm.service.ts):
  `generateText` / `generateTextVia` / `generateStructured`, adapters for Anthropic / OpenAI / OpenAI-compat /
  Google under [`agent/llm/providers/`](../packages/gateway/src/agent/llm/providers/), credentials from DB →
  env → Claude keychain, metered via `UsageService`. **The chat + generation engine — reuse, don't rebuild.**
- **A chat module exists, but it's the board bot** — [`chat/chat-query.service.ts`](../packages/gateway/src/chat/chat-query.service.ts)
  answers read-only questions over the **task board** graph (deterministic intent grammar + LLM summary
  fallback). **No connection to memories** — a *pattern* to imitate (intent → retrieve → answer), not to extend.
- **Media module with a 501 generate stub** — [`media.service.ts`](../packages/gateway/src/media/media.service.ts):
  `Media` domain (`type ∈ {image, video, audio}` in [`shared/src/media.ts`](../packages/shared/src/media.ts)),
  CRUD + path-traversal-guarded `GET /media/:id/file`, `prompt`/`tags`/`width`/`height`/`duration` fields, and
  `POST /media/:id/generate` → `throw new HttpException('generate not yet implemented', 501)`. **Media links to
  projects only, not memories.** No `infographic` type yet.
- **Two-rail cockpit precedent (ready to clone)** — [`projects/view/project-detail-view.tsx`](../packages/web/app/(main)/projects/view/project-detail-view.tsx)
  (itself modelled on sessions/councils): sticky `PageHeader`, `flex flex-col lg:flex-row`, `min-w-0 flex-1`
  center, independently collapsible left+right rails persisted via `useLocalStorage`, mobile→drawers via the
  media-query hooks. **The layout to match** — plus the [`@midnite/ui` tabs](../packages/ui/src/components/tabs.tsx)
  primitive, [`PageHeader`](../packages/web/components/page-header.tsx), [`MarkdownEditor`](../packages/web/components/markdown-editor.tsx),
  and [`SourceListEditor`](../packages/web/components/source-list-editor.tsx).
- **Project sources (to be retired)** — the `sources` tab in [`project-modal.tsx`](../packages/web/components/project-modal.tsx)
  (`Tab` union, tabs array) + the right-rail [`project-info-panel.tsx`](../packages/web/components/projects/project-info-panel.tsx)
  → [`project-sources-panel.tsx`](../packages/web/components/projects/panels/project-sources-panel.tsx); backed by
  `project_sources` (schema line ~304) + `addProjectSource`/`removeProjectSource`/`reorderProjectSources`
  ([`web/lib/api.ts`](../packages/web/lib/api.ts) ~L1161) and their gateway endpoints. **Structurally identical to
  memory sources but a parallel, independent notion.**

---

## Theme A — `/memory/view?id=` page: 3-panel shell, routing & `GET /memories/:id` — **M** — ✅ DONE (PR #379, 2026-07-10)

The frame everything hangs on: a real deep-linkable page that replaces the modal as the primary target.

- [x] **Expose a single-memory fetch** — add `GET /memories/:id` to [`memories.controller.ts`](../packages/gateway/src/memories/memories.controller.ts)
      (thin; delegates to the existing `MemoriesService.getMemory`, 404 → `MemoryDoesNotExistError`), a
      `getMemory(id)` method in [`web/lib/api.ts`](../packages/web/lib/api.ts), and repoint
      `routeFor('memory', id)` → `/memory/view?id=` in [`search/lib`](../packages/gateway/src/search/) (and any
      web mirror). Existing list/CRUD endpoints unchanged.
- [x] **Static-export route** — `app/(main)/memory/view/page.tsx` reads `?id=` via `useSearchParams`, fetches
      through `useApiData(getMemory)`, inline **loading** + **not-found** states. **No `[id]` segment**
      (`output: 'export'`), matching `projects/view`, `sessions/view`.
- [x] **`memory-detail-view.tsx` — the 3-region shell** cloning the Phase 55 cockpit: sticky `PageHeader`
      (title + scope chip [Global / project name] + `archived` badge + back-to-`/memory` + rail toggles),
      `flex flex-col lg:flex-row`, `min-w-0 flex-1` **center**, a **left sources rail** and a **right Studio
      rail** that each collapse to a slim rail. Rail open/closed persisted via `useLocalStorage`
      (`midnite.memory.leftOpen` / `midnite.memory.rightOpen`).
- [x] **Center panel = doc + composer** — the memory's title/scope/markdown editing (reuse
      [`MarkdownEditor`](../packages/web/components/markdown-editor.tsx)) **at parity with the modal**, with the
      chat composer docked below (Theme C fills it; ships as a disabled "ask this memory…" affordance until C).
- [x] **Left rail = sources** — the source list + **add** (URL) inline (reuse
      [`SourceListEditor`](../packages/web/components/source-list-editor.tsx)); ingestion status per source lands
      in Theme B. **Right rail = Studio** — scaffolded artifact list (Theme D/E fill it).
- [x] **Navigation & modal-vs-page rule** — memory cards/tree in [`memory-view.tsx`](../packages/web/app/(main)/memory/memory-view.tsx)
      become `<Link>`s to `/memory/view?id=` (cmd/middle-click → new tab); the **modal is reserved for
      *create*** (and any in-context office use), mirroring Phase 55's `?open=` → page redirect. The
      `?create=<projectId|global>` deep-link keeps opening the create modal.
- [x] **Responsive** — on `useIsMobile` both rails become drawers toggled from the header; center goes
      full-width. Cutoffs from the media-query hooks only; overflow menus portal to body.

---

## Theme B — Source ingestion: fetch URL bodies + file uploads — **L** — ✅ DONE (PR #382, 2026-07-10)

Turn bare links into an actual corpus — the substrate chat + generation stand on.

- [x] **Ingested-content storage** — extend `memory_sources` with `extractedText` (nullable), `contentBytes`,
      `ingestState` (`pending`/`ready`/`failed`/`skipped`), `ingestError?`, `mimeType?`; a forward-only
      migration under [`gateway/src/db/migrations/`](../packages/gateway/src/db/). A per-source body cap
      (**≤ 200 KB extracted text**, Decision §5) trims oversize content. Reflect the new fields in
      [`shared/src/memory.ts`](../packages/shared/src/memory.ts) `MemorySourceSchema`.
- [x] **URL fetch + readability extraction** — a `MemoryIngestionService` (or `memories/lib/ingest.ts`) that
      fetches a source URL and extracts readable text (extend the existing
      [`opengraph.ts`](../packages/gateway/src/projects/lib/opengraph.ts) fetch pattern; add a readability step).
      Runs **async on source add** (state `pending` → `ready`/`failed`), re-fetchable via
      `POST /memories/:id/sources/:sourceId/reingest`. Best-effort, never blocks the add.
- [x] **File uploads as sources** — `POST /memories/:id/sources/file` (multipart) accepting **PDF / `.md` /
      `.txt`** (size cap in [`shared`](../packages/shared/src/), Decision §5). PDF → text extraction; md/txt
      stored directly. Files persist under the media/upload store (path-traversal-guarded like
      [`media` file-serve](../packages/gateway/src/media/media.service.ts)); `MemorySource` gains a `file` kind.
- [x] **Re-index the corpus** — `memoryToIndexDoc` folds ingested source text into the FTS body (kept clipped;
      the 4 000-char limit still governs the *indexed* excerpt — full text lives in `extractedText` for
      stuffing). Update [`index-mappers.ts`](../packages/gateway/src/search/lib/index-mappers.ts) + the
      service write-path.
- [x] **Web: ingestion status UI** — the left rail shows per-source state (spinner / ✓ ready / ⚠ failed +
      retry), a file **upload** affordance beside the URL add, and honest empty/failed copy. Reuses the source
      list; no new design system.

---

## Theme C — Chat to the knowledge base (persisted threads, cited answers) — **L**

The center composer becomes a grounded Q&A over the memory + its ingested sources.

- [ ] **Persisted chat storage** — a `memory_chat_messages` table (`id`, `memoryId`, `role`
      (`user`/`assistant`), `content`, `citations` (JSON: which source/section ids), `createdAt`) + a
      forward-only migration; `MemoryChatMessageSchema` + request/response schemas in
      [`shared/src/memory.ts`](../packages/shared/src/memory.ts) (or a sibling `memory-chat.ts`).
- [ ] **Chat endpoints (thin controller → service)** — `GET /memories/:id/chat` (history),
      `POST /memories/:id/chat` (append user turn → answer). Service: **retrieve** (FTS5 rank the memory +
      ingested source text; at notebook scale — one memory + ≤10 sources — **stuff the full corpus** into
      context, trimming by FTS rank only when over a token budget, Decision §2) → **answer** via
      [`LlmService.generateText`](../packages/gateway/src/agent/llm/llm.service.ts) with a
      grounded prompt → persist both turns. Answers **cite the sources used**; the model is instructed to say
      when the corpus doesn't cover a question (no hallucinated coverage).
- [ ] **Streaming or fast round-trip** — stream tokens if the client path supports it; otherwise a plain
      request/response with an optimistic pending bubble. Metered through `UsageService` like every other LLM
      call. Graceful failure → an inline error turn, never a silent drop.
- [ ] **Web: chat panel** — the center composer renders the thread (user/assistant bubbles, markdown, **source
      citation chips** linking to the left-rail source), an input with send/stop, and history that survives
      reload (`GET …/chat`). Client methods `getMemoryChat(id)` / `postMemoryChat(id, message)` in
      [`web/lib/api.ts`](../packages/web/lib/api.ts).

---

## Theme D — Studio: text artifacts + infographic — **M** — ✅ DONE (PR #384, 2026-07-10)

Wire the media `generate` stub for the artifacts that need only `LlmService` — the reliable core of Studio.
Landed — items moved to [`done.md`](done.md). **Decision §6 resolved: a lightweight
`memory_artifacts` table**, not `Media` (whose file-centric shape has no column for inline
markdown/SVG); `Media` stays untouched for Theme E's audio/video files. Text kinds render as
markdown, the infographic as a self-contained SVG in a scripts-disabled sandboxed iframe.
Generation is async on the artifact row (`pending`→`ready`/`failed`), polled by the client;
grounded on the corpus (memory content + Theme B's ingested source text), metered via `LlmService`
under a new `memory` usage feature.

- [x] **Un-stub generation, memory-scoped** — `MemoryStudioService` generates over the corpus; artifacts
      persist in a new `memory_artifacts` table (migration `0079`), async status (`pending`/`ready`/`failed`)
      polled by the client. `Media` left untouched (Decision §6).
- [x] **Text artifacts** — `brief` / `faq` / `study-guide` / `timeline` via `LlmService.generateText` over the
      stuffed corpus; prompts in `memories/lib/studio-prompts.ts`, corpus builder in `memories/lib/corpus.ts`.
- [x] **Infographic** — LLM emits a single self-contained SVG (`extractSvg` unwraps fenced output); rendered
      in a sandboxed iframe. Represented as a `memory_artifacts` row with `format: 'svg'` (Decision §6).
- [x] **Web: Studio rail** — artifact kinds with Generate/Regenerate + per-artifact status (generating / ready
      / failed + retry + inline error), a viewer modal (markdown / sandboxed SVG) with download; client methods
      in [`web/lib/api.ts`](../packages/web/lib/api.ts). Audio/video stay "Soon" (Theme E).

---

## Theme E — Studio: audio overview & video — **L** *(riskiest)*

The signature NotebookLM artifacts — real output via additive provider seams, degrading when unconfigured.

- [ ] **Audio overview (podcast)** — `LlmService.generateStructured` writes a **two-host script** from the
      corpus, then a **TTS provider** renders it to audio persisted as a `Media` `audio` row. TTS is an
      **additive seam** reusing the existing OpenAI/Google provider **credentials** (they expose TTS; the LLM
      layer doesn't call it today). A `memory.studio` config block ([`shared/src/config/`](../packages/shared/src/config/))
      selects provider/voice. **Degrade gracefully:** with no TTS key, ship the **script only** (labelled) and
      surface a clear "add a TTS provider for audio" hint — never a hard failure (Decision §1).
- [ ] **Video (slideshow compose)** — real video **without a generative-video model** (Decision §1): the LLM
      produces **slides** (reuse the infographic/HTML→image path), the audio-overview track narrates, and an
      **`ffmpeg` compose step** stitches slides + narration into an MP4 persisted as a `Media` `video` row.
      Behind a **pluggable `VideoGenerator` seam** (like the Phase 17 spawner) so a true video provider can slot
      in later. Degrades to "slides + audio, no composed video" when `ffmpeg` is unavailable.
- [ ] **Config + docs** — document the new `memory.studio` config (TTS provider/voice, ffmpeg path/toggle) in
      the README + `midnite.json` schema docs; everything **off/degraded by default** so a fresh install with no
      extra providers still shows text + infographic and *offers* audio/video with honest capability messaging.
- [ ] **Web: audio/video in Studio** — an inline `<audio>`/`<video>` player, generation progress, download, and
      the degraded-state messaging when a provider is missing.

---

## Theme F — Retire project sources → memories (full removal + migration) — **M** — ✅ DONE (PR #380, 2026-07-10)

Make memory **the** knowledge notion; projects stop carrying a parallel sources concept.
Landed — items moved to [`done.md`](done.md). A boot-time idempotent
`ProjectSourcesMigrationService` copies each project's `project_sources` into one
project-scoped memory (`"{Project} — knowledge"`, order + metadata preserved) then
drops the table; the gateway source endpoints/service/repo/schema, the report
Sources section, and the portability mapping are gone; the web modal tab, detail-page
right-rail editor, card/recent/tree source chips, and client methods are removed and
replaced by a **"Manage knowledge in Memory"** link (`/memory?scope=<projectId>`).
`SourceListEditor` + `ReorderSourcesRequestSchema` stay (still used by memory sources).

---

## Theme G — Tests, docs & polish — **M**

- [ ] **Gateway** — service specs with repository fakes (`getMemory` 404, ingestion state transitions, chat
      retrieve→answer with a fake `LlmService`, generate async status, project-source migration); repository
      integration on `:memory:` SQLite for the new tables/migrations; controller specs for the new routes.
- [ ] **Shared** — zod round-trip specs for the new/changed schemas (ingested source fields, chat message,
      media `memoryId`/type, project schema minus sources).
- [ ] **Web** — RTL/story coverage for the detail view (3-panel layout, rail collapse persistence, mobile
      drawers), the chat panel (send / cited answer / history), the Studio rail (generate → status → view per
      artifact), ingestion status, and the modal-still-works-for-create regression. **Run web tests from the
      primary checkout or a `Dev/midnite-wt/` worktree** (Vite denies `.git/**`).
- [ ] **e2e** — a Playwright flow against a seeded gateway: open `/memory/view?id=`, add a source, ask a
      question, generate a text artifact; assert the page renders and each panel works.
- [ ] **Docs + baselines** — README/docs for the workspace, ingestion, chat, and Studio config; `midnite.json`
      schema docs for `memory.studio`; light/dark screenshots of the new page for the visual baselines; a11y
      pass (roles/labels, portal menus) on the new surfaces.

---

## Files this phase touches (map)

- **New (web — page + panels):** `app/(main)/memory/view/page.tsx`, `app/(main)/memory/view/memory-detail-view.tsx`,
  a sources rail panel, a **chat panel** component, and a **Studio rail** component (under
  `components/memory/`)
- **Edit (web):** [`memory-view.tsx`](../packages/web/app/(main)/memory/memory-view.tsx) (cards/tree → `<Link>`),
  [`memory-modal.tsx`](../packages/web/components/memory-modal.tsx) (reserve for create; consume shared editors),
  [`web/lib/api.ts`](../packages/web/lib/api.ts) (`getMemory`, source-file upload/reingest, chat, studio
  generate/fetch; **remove** project-source methods), [`project-modal.tsx`](../packages/web/components/project-modal.tsx)
  + [`project-info-panel.tsx`](../packages/web/components/projects/project-info-panel.tsx) +
  [`project-detail-view.tsx`](../packages/web/app/(main)/projects/view/project-detail-view.tsx) (drop sources)
- **Delete (web):** [`project-sources-panel.tsx`](../packages/web/components/projects/panels/project-sources-panel.tsx)
- **New/Edit (gateway):** [`memories.controller.ts`](../packages/gateway/src/memories/memories.controller.ts)
  (`GET /:id`, source-file/reingest, chat, ...), [`memories.service.ts`](../packages/gateway/src/memories/memories.service.ts)
  + repository, a `MemoryIngestionService` + `memories/lib/{ingest,studio-prompts}.ts`, a memory-chat
  service/controller, [`media.service.ts`](../packages/gateway/src/media/media.service.ts) (real `generate`,
  `memoryId` link), [`search/lib/index-mappers.ts`](../packages/gateway/src/search/lib/index-mappers.ts)
  (source text in FTS body; `routeFor` fix), new **migrations** under
  [`gateway/src/db/migrations/`](../packages/gateway/src/db/) (source-ingest columns, `memory_chat_messages`,
  media `memoryId`/type, **project-sources migration + drop**)
- **Edit (shared):** [`memory.ts`](../packages/shared/src/memory.ts) (ingested source fields, chat schemas),
  [`media.ts`](../packages/shared/src/media.ts) (`memoryId`, artifact types), [`project.ts`](../packages/shared/src/project.ts)
  (remove `sources`), [`source.ts`](../packages/shared/src/source.ts) (`file` kind; prune project reorder),
  [`config/`](../packages/shared/src/config/) (`memory.studio`)
- **Reuse (no changes):** the Phase 55 [two-rail cockpit](../packages/web/app/(main)/projects/view/project-detail-view.tsx)
  pattern, [`@midnite/ui` tabs](../packages/ui/src/components/tabs.tsx), [`PageHeader`](../packages/web/components/page-header.tsx),
  [`MarkdownEditor`](../packages/web/components/markdown-editor.tsx), [`SourceListEditor`](../packages/web/components/source-list-editor.tsx)
  (memory usage), [`LlmService`](../packages/gateway/src/agent/llm/llm.service.ts) + providers,
  [`search/`](../packages/gateway/src/search/), [`use-media-query.ts`](../packages/web/hooks/use-media-query.ts)

---

## Verification

- [ ] `/memory/view?id=<memory>` opens a page with a `PageHeader`, a **left sources rail**, a **center doc +
      chat composer**, and a **right Studio rail**; a bookmarked deep link loads standalone; an unknown id
      shows an inline not-found; `GET /memories/:id` returns the hydrated memory (404 on unknown).
- [ ] **Doc editing is at parity with the old modal** (title, scope, markdown) on the page; the modal still
      works for **create**; memory cards/tree **navigate to the page**; search hits route to `/memory/view?id=`.
- [ ] **Sources ingest:** adding a URL fetches + extracts its body (state pending→ready, failure surfaced +
      retry); a **PDF / `.md` / `.txt` upload** becomes a source with extracted text; oversize content is
      capped; ingested text is searchable via FTS.
- [ ] **Chat is grounded + persisted:** asking a question returns an answer **citing the sources used**,
      history survives reload, and a question outside the corpus gets an honest "not covered" answer — not a
      fabrication. LLM usage is metered.
- [ ] **Studio generates real artifacts:** text (brief/FAQ/study-guide/timeline) + infographic generate from
      the corpus and render/download; **audio** produces a playable track (or a labelled script when no TTS
      provider); **video** produces a composed MP4 (or "slides + audio" when ffmpeg is unavailable) — each with
      generating/ready/failed status and regenerate. Nothing hard-fails on a missing provider.
- [ ] **Project sources retired:** the project modal has **no sources tab**, the project cockpit has **no
      sources rail**, `project_sources` is dropped, and existing project sources were **migrated into a
      project-scoped memory** (idempotent); project knowledge links point at Memory.
- [ ] Left/right rails collapse independently and **persist across reload**; mobile → drawers; overflow menus
      portal to body.
- [ ] `moon run :typecheck` · `moon run :lint` · `moon run :test` green across shared/gateway/web (+ the
      Playwright flow); **web tests run from the primary checkout or `Dev/midnite-wt/`**, not a `.git` worktree.
- [ ] Light/dark screenshots of the new page captured for the visual baselines.

---

## Decisions / open questions

1. **Audio real, video via slideshow-compose; both degrade gracefully** *(settled).* Audio = LLM script → TTS
   (reusing OpenAI/Google provider creds; script-only fallback with no key). Video = LLM slides + audio
   narration + **`ffmpeg` compose** → MP4 behind a pluggable `VideoGenerator` seam — **no generative-video
   model** (none exists in-repo; a real one can slot into the seam later). A missing provider **never hard-fails**
   — the artifact ships degraded with honest capability copy. *(User chose "all four for real"; this is how
   "real" is delivered without inventing a video-model integration.)*
2. **Retrieval = FTS5 keyword + full-corpus stuffing** *(settled).* At notebook scale (one memory + ≤10
   sources) the whole ingested corpus fits in context; FTS5 only ranks/trims when over budget. **No embeddings /
   vector store** this phase — that's a future "semantic retrieval" phase if corpus size ever demands it.
3. **Async generation on the `media` row, no new queue** *(recommend).* Generation sets a status field
   (`pending`/`ready`/`failed`) on the persisted row; the client polls (WS if cheap). Reuses the media store;
   avoids introducing a job queue for a handful of artifacts.
4. **Full project-sources removal with a forward migration** *(settled).* One project → one project-scoped
   memory carrying its migrated sources (idempotent), then drop `project_sources`. Forward-only; no rollback
   path (matches repo migration policy). *(User chose full removal over soft-hide.)*
5. **Ingestion caps** *(recommend).* Per-source extracted text ≤ **200 KB**; upload size cap (e.g. **10 MB**)
   in `shared`; FTS *indexed* excerpt stays clipped at 4 000 chars while full text lives in `extractedText` for
   stuffing. Tune during Theme B if real docs blow the budget.
6. **Where text/infographic artifacts live** *(open — lean `Media` + subtype).* Prefer persisting all artifacts
   as `Media` rows (add `infographic`/text handling) for one artifact store; if `Media`'s file-centric shape
   fights inline text/markup, fall back to a lightweight `memory_artifacts` table. Decide in Theme D once the
   `Media` shape is in hand.
7. **Naming stays `memory`/`memories`** *(settled).* No "Notebook" rebrand, no domain/route/table/FTS rename —
   the page is branded "Memory". Zero rename migration; all new value is additive. *(User's explicit call.)*
8. **Chat threads: single thread per memory to start** *(recommend).* One running conversation per memory
   (not multiple named threads) keeps the schema + UI simple; multi-thread is a later refinement if wanted.
9. **Out of scope** *(settled).* Embeddings/vector RAG; domain rename; a generative-video-model provider;
   real-time collaborative editing of a memory; multi-thread chat; cross-memory ("all my knowledge") chat —
   this phase is **per-memory**.
