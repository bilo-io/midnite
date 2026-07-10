# Memory Workspace

> A NotebookLM-style knowledge surface built on midnite's **memory** domain. Every
> memory opens as a full-page, deep-linkable workspace at **`/memory/view?id=`** — a
> left **Sources** rail, a center **doc + chat** composer, and a right **Studio** rail
> that generates artifacts from the memory's corpus.
>
> Introduced in **Phase 65**. The domain stays named `memory`/`memories` throughout
> (no "Notebook" rebrand); the page is simply branded "Memory".

---

## What a memory is

A **memory** is authored markdown — global or scoped to a project — plus up to ten
**sources**. Historically a source was a bare reference link (URL + favicon + OG
title); as of Phase 65 sources graduate to an **ingested corpus** (see
[Sources](#sources-an-ingested-corpus)), and memory becomes *the* knowledge notion
in the app — the old per-project "sources" tab was retired and migrated into a
project-scoped memory.

| Field | Notes |
|-------|-------|
| `title` | Short label. |
| `content` | Markdown, ≤ 50 000 chars. |
| `projectId` | `null` = global; otherwise scoped to a project. |
| `sources` | ≤ 10 `MemorySource`s (links or uploaded files). |
| `archived` | Soft-archive flag. |

The wire shape lives in [`shared/src/memory.ts`](../packages/shared/src/memory.ts);
artifacts in [`shared/src/memory-artifact.ts`](../packages/shared/src/memory-artifact.ts).

---

## The workspace page

Navigate to a memory from the memory list (cards/tree are links; ⌘/middle-click
opens a new tab) or from any search hit — `routeFor('memory', id)` points at
`/memory/view?id=`. The page uses the shared two-rail cockpit (`RailShell`): each
rail collapses independently and its open/closed state persists across reloads
(`midnite.memory.leftOpen` / `…rightOpen`). On mobile both rails become
header-toggled drawers and the center goes full-width.

The **modal is reserved for _creating_** a memory (and any in-context office use);
opening an existing one always lands on the page. A bookmarked deep link resolves
standalone (the id rides the query string because the web app is a static export,
so there is no `[id]` route segment); an unknown id shows an inline not-found.

- **Center** — the memory's title, scope, and markdown, edited at parity with the
  old modal, with the chat composer docked below.
- **Left rail** — the source list + add (URL or file upload) with per-source
  ingestion status.
- **Right rail** — the Studio artifact menu.

---

## Sources: an ingested corpus

Adding a source no longer stores just a link — its **body is fetched and
readability-extracted** so chat and Studio have real text to ground on.

- **URLs** — fetched (behind the same SSRF guard as OpenGraph metadata), converted
  to readable text, and capped at **200 KB** of extracted text. Ingestion runs
  **async and best-effort**: the source appears immediately in state `pending`,
  then resolves to `ready` or `failed` (with a retry affordance). It never blocks
  the add.
- **File uploads** — `PDF` / `.md` / `.txt`, up to **8 MB**. PDFs are text-extracted;
  markdown/text are stored directly. Files persist in the media/upload store behind
  the same path-traversal guard as media file-serving.
- **Re-index** — a source's extracted text folds into the memory's FTS body (the
  indexed excerpt stays clipped; the full text is retained for grounding).
- **Reingest** — a per-source action re-fetches a URL or re-extracts a stored file;
  opening a memory also lazily kicks ingestion for any older, not-yet-ingested links.

Ingested text is what makes chat and Studio answer from *the sources*, not just the
note you wrote.

---

## Studio: generated artifacts

The right rail generates artifacts from the memory's **corpus** — its markdown plus
every source's ingested text (link-only sources contribute their title/URL). Each
artifact is a row in `memory_artifacts`; generation is **async** (`pending` →
`ready` / `failed`) and the client polls until it settles.

| Artifact | Format | Notes |
|----------|--------|-------|
| Executive brief | Markdown | Overview + key points + takeaway. |
| FAQ | Markdown | 5–8 grounded Q&A pairs. |
| Study guide | Markdown | Key concepts, deep-dive, review questions. |
| Timeline | Markdown | Chronological (or logical) summary. |
| Infographic | SVG | A single self-contained SVG poster. |
| Audio overview | — | *Coming soon.* |
| Video | — | *Coming soon.* |

Text artifacts render through the shared markdown preview; the **infographic renders
in a scripts-disabled sandboxed `<iframe>`** (the SVG is model-generated and treated
as untrusted). Every artifact can be regenerated and downloaded (`.md` / `.svg`).

Generation reuses the provider-agnostic, metered
[`LlmService`](../packages/gateway/src/agent/llm/llm.service.ts) — usage is attributed
to the `memory` feature. If **no AI provider is configured**, or the memory has no
content or ingested sources yet, generation fails with an honest inline message
rather than a silent drop or a fabricated artifact.

> Retrieval this phase is **FTS5 keyword + full-corpus stuffing** — at notebook scale
> (one memory + ≤ 10 sources) the whole corpus fits in context. No embeddings /
> vector store.

---

## Chat to the knowledge base

The center composer answers questions grounded in the memory + its ingested sources,
with a persisted thread and source citations. (Shipping in Phase 65 Theme C.)

---

## API surface

All routes are thin controllers over `MemoriesService` / `MemoryStudioService`;
every payload has a zod schema in `shared`.

| Method & path | Purpose |
|---------------|---------|
| `GET /memories` · `GET /memories/:id` | List · fetch one (404 on unknown). |
| `POST /memories` · `PATCH /:id` · `DELETE /:id` | Create · update · delete. |
| `POST /:id/sources` · `POST /:id/sources/file` | Add a link · upload a file source. |
| `POST /:id/sources/:sourceId/reingest` | Re-run ingestion for a source. |
| `POST /:id/sources/reorder` · `DELETE /:id/sources/:sourceId` | Reorder · remove. |
| `GET /:id/artifacts` | List Studio artifacts (poll for status). |
| `POST /:id/artifacts` | Generate (or regenerate) an artifact of a `kind`. |
| `DELETE /:id/artifacts/:artifactId` | Remove an artifact. |

---

## Related

- [Architecture](./ARCHITECTURE.md) — how the gateway layers fit together.
- [Testing plan](./TESTING_PLAN.md) — where the memory tests live.
