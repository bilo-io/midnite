# Phase 74 — Report issue (assistant-menu → GitHub)

> [Phase 66](phase-66-floating-assistant-menu.md) built the floating **assistant menu** — a logo FAB that opens a panel of entries (Docs / Guide / Chat / Agent). Phase 74 adds one more entry, **"Report issue"**, that turns "something's broken" into a **prefilled GitHub issue** in the public **`bilo-io/midnite-app`** repo. The user clicks it, an **editable preview** appears with the title + a body **auto-filled from the page they were on** (route, app version, browser/OS, web-vs-desktop, theme, live-connection status), they trim anything they don't want to share, and confirm — which opens GitHub's `issues/new` with `title`/`body`/`labels` prefilled. No account plumbing on our side, no gateway, no token: it's a pure client-side compose-and-hand-off, plus a one-line **desktop fix** so the hand-off (and the existing Docs link) opens the system browser instead of an in-app window.

> **Scope guardrails (CLAUDE.md).** This is **web + a tiny desktop touch** — no gateway, no `shared` schema, no new API. The GitHub repo constant already lives in [`packages/web/lib/site-links.ts`](../packages/web/lib/site-links.ts) (`PUBLIC_GITHUB_REPO = 'bilo-io/midnite-app'`); the issue-URL helper + labels go **beside it**, not in `shared` (nothing else needs them). The preview modal is a **new web component** mirroring the existing [`confirm-dialog.tsx`](../packages/web/components/confirm-dialog.tsx) pattern (portal to `document.body`, focus-trap, Escape/Enter) — no new dialog dependency. The **issue-template file itself lives in the *other* repo** (`midnite-app`): this phase *authors the content and documents adding it there*, it does **not** commit into `midnite-app`. Everything is prefill-by-URL — **out of scope**: any server-side issue creation, GitHub API/bot token, screenshots, or an error-capture trail.

> Effort tags: **S** small · **M** medium · **L** large. Natural order: **A** (menu entry + URL helper) + **C** (context builder) are the core, **B** (preview modal) is the UX around them, **D** (desktop external-open) makes it correct in the packaged app, **E** (template + docs) finishes go-live. A+B+C is "the button works in web"; +D is "it works in desktop too".

---

## Current state (what exists to build on)

- **Assistant menu** — [`packages/web/components/assistant/assistant-panel.tsx`](../packages/web/components/assistant/assistant-panel.tsx): entries are a typed `readonly Entry[]` constant `ENTRIES` (`{ key, label, description, icon, soon?, beta? }`, `icon` = a **lucide-react** component); `activate(entry)` dispatches per-key. The `docs` entry already does `window.open(docsUrlForPathname(pathname), '_blank', 'noopener,noreferrer')` — **the only external link in the web app** and the exact shape a "Report issue" entry follows. The FAB host [`assistant-fab.tsx`](../packages/web/components/assistant/assistant-fab.tsx) portals its panel to `document.body`; mounted once in [`app/(main)/layout.tsx`](../packages/web/app/(main)/layout.tsx).
- **Repo config** — [`site-links.ts`](../packages/web/lib/site-links.ts): `PUBLIC_GITHUB_REPO = 'bilo-io/midnite-app'` (line 16), with `GITHUB_RELEASES_URL` already derived from it — the home for a new `githubIssuesNewUrl(...)` helper + a `REPORT_ISSUE_LABELS` constant.
- **Context, readable synchronously today** — route via `usePathname()` (already imported in `assistant-panel.tsx`); app version via `getCurrentVersion()` in [`lib/version.ts`](../packages/web/lib/version.ts); theme via `useTheme()` ([`app/theme/theme-context`](../packages/web/app/theme/theme-context.tsx)) + accent in [`lib/app-settings.ts`](../packages/web/lib/app-settings.ts); WS/live status via `useConnectionStore` + `worstStatus()` in [`lib/connection-store.ts`](../packages/web/lib/connection-store.ts); web-vs-desktop via `getDesktopBridge()` in [`lib/desktop-bridge.ts`](../packages/web/lib/desktop-bridge.ts); plus `navigator.userAgent`, viewport, `window.location` for free.
- **Modal pattern** — no `Dialog` primitive exists in `@midnite/ui` or `packages/web/components/ui`; the established hand-rolled pattern is [`confirm-dialog.tsx`](../packages/web/components/confirm-dialog.tsx) (`role="alertdialog"`, `aria-modal`, `fixed inset-0 z-[100]`, focus-trap, Escape/Enter, focus restore). Popovers portal to `document.body` (per repo convention); a textarea primitive exists at [`components/ui/textarea.tsx`](../packages/web/components/ui/textarea.tsx).
- **Desktop external-open — the one gap** — [`packages/desktop/src/main/index.ts`](../packages/desktop/src/main/index.ts) creates the `BrowserWindow` but registers **no** `setWindowOpenHandler`/`will-navigate`, and nothing imports `shell`. So `window.open('https://github.com/…')` resolves via Electron's default handler and opens **inside the app**, not the system browser — the existing Docs link has this same latent bug.
- **No existing feedback/report feature** — confirmed greenfield; no collision.

---

## Theme A — Assistant-menu entry + issue-URL builder — **S**

The button itself and the pure function that assembles the GitHub URL.

- [ ] **`githubIssuesNewUrl({ title, body, labels })`** in [`site-links.ts`](../packages/web/lib/site-links.ts) — builds `https://github.com/${PUBLIC_GITHUB_REPO}/issues/new?title=…&body=…&labels=…` with proper `encodeURIComponent`; add a `REPORT_ISSUE_LABELS` constant (e.g. `['bug', 'from-app']`) and optionally a `template` param (`bug_report.md`, Theme E). Keep it a pure, unit-testable helper beside `GITHUB_RELEASES_URL`.
- [ ] **"Report issue" entry** in `ENTRIES` ([`assistant-panel.tsx`](../packages/web/components/assistant/assistant-panel.tsx)) — `{ key: 'report', label: 'Report issue', description: 'Something broken? Tell us', icon: Bug }` (lucide `Bug`); extend the `EntryKey` union; add an `activate` branch that opens the preview modal (Theme B) rather than navigating.
- [ ] **Tests** — `githubIssuesNewUrl` encodes title/body/labels correctly (spaces, newlines, `#`, unicode) and points at `bilo-io/midnite-app`; the entry renders in the panel with the right icon/label.

## Theme B — Editable preview modal — **M**

A "here's what we'll send — edit anything, then open GitHub" step, so nothing leaves the app unseen (the issue is **public**).

- [ ] **`ReportIssueDialog`** ([`packages/web/components/report-issue-dialog.tsx`](../packages/web/components/report-issue-dialog.tsx)) — mirror the [`confirm-dialog.tsx`](../packages/web/components/confirm-dialog.tsx) structure (`role="dialog"`, `aria-modal`, backdrop, focus-trap, Escape to cancel) but **portal to `document.body`** (it launches from the already-portaled assistant panel). An editable **title** input + a **fully-editable body** `Textarea` prefilled from Theme C, a "what happens next / opens a public GitHub issue" note, and **Cancel / Open on GitHub** actions.
- [ ] **Confirm → hand-off** — on confirm, call `window.open(githubIssuesNewUrl({ title, body, labels: REPORT_ISSUE_LABELS }), '_blank', 'noopener,noreferrer')` and close. (Desktop routing handled by Theme D — the web code stays dumb.)
- [ ] **URL-length guard** — GitHub truncates very long URLs (~8KB practical limit). Compute the assembled URL length; if oversized, show an inline warning in the dialog ("context trimmed to fit") and/or auto-trim the least-important context section — the user can still edit. A "Copy body" fallback button for the edge case.
- [ ] **Tests** — the dialog renders the prefilled title/body, edits flow through to the opened URL (mock `window.open`), Cancel closes without opening, oversized body surfaces the warning, focus-trap/Escape behave.

## Theme C — Page-context capture + prefill — **M**

Turn "the page they were on" into a compact, useful, **editable** issue body — the part the seed author wasn't sure was possible (it is).

- [ ] **`buildReportContext()`** ([`packages/web/lib/report-context.ts`](../packages/web/lib/report-context.ts)) — a pure builder that reads the already-available signals and returns `{ title, body }`: **route/page** (`usePathname`), **app version** (`getCurrentVersion`), **environment** (web vs desktop via `getDesktopBridge`), **browser + OS** (`navigator.userAgent`, parsed to something short), **viewport**, **theme** (`preference`/`resolved`), and **live-connection status** (`worstStatus`). A sensible default title (e.g. `` `[bug] <page> — ` ``, cursor-ready for the user to finish).
- [ ] **Formatted, compact markdown body** — a short freeform "**What happened?**" prompt at the top (where the user types) followed by a collapsed-style **`### Environment`** block (a small markdown table / bullet list) with the captured context. Keep it terse to respect the URL-length budget (Theme B); no secrets, no tokens, nothing the user can't see.
- [ ] **Editable = the privacy control** — because the whole body lands in the Theme B textarea, the user can delete any line before submitting; document that the context is client-only and never sent anywhere except into the GitHub URL they open.
- [ ] **Tests** — `buildReportContext` includes route + version + env + theme + connection; desktop vs web branch differs; body stays within a reasonable size for typical pages; deterministic given fixed inputs.

## Theme D — Desktop external-open fix — **S**

Make the hand-off open the real browser in the packaged app — and fix the pre-existing Docs-link quirk for free.

- [ ] **`webContents.setWindowOpenHandler`** in [`packages/desktop/src/main/index.ts`](../packages/desktop/src/main/index.ts) on the main `BrowserWindow`: for `http:`/`https:` URLs return `{ action: 'deny' }` and call `shell.openExternal(url)` (import `shell` from `electron`); allow in-app targets (if any) through. This routes **every** external link — the new Report-issue hand-off **and** the existing assistant **Docs** link — to the user's system browser, with **zero** web-side branching.
- [ ] **Guardrail** — only external `http(s)` origins go to `shell.openExternal`; never hand arbitrary schemes (`file:`, custom) to the OS. A tiny allowlist/scheme check.
- [ ] **Verify in a packaged/dev desktop build** — clicking Report issue (and Docs) opens the default browser, not an in-app window; web behaviour unchanged (still plain `window.open`). Note: desktop has no vitest surface for main-process wiring — verify via a real launch (see [Desktop install:local](../packages/desktop)) and a short code-review of the handler.

## Theme E — Issue template + docs — **S**

The GitHub-side scaffold (authored here, added in `midnite-app`) and the short how-it-works note.

- [ ] **Author `bug_report.md`** — the `.github/ISSUE_TEMPLATE/bug_report.md` content for the **`midnite-app`** repo (title prefix, labels front-matter, the same Environment headings the client body uses so direct-on-GitHub reports match app-generated ones). Because our button passes an explicit `?body=`, GitHub uses **our** body and ignores the template's body — the template is the **safety net for people who open issues directly on GitHub**, and keeps the two paths visually consistent. Wire `template=bug_report.md` into `githubIssuesNewUrl` (Theme A) so the label/assignee front-matter still applies.
- [ ] **Document the cross-repo step** — a short section (README + a docs-site note under Guides) explaining: the button lives in the assistant menu, it targets `bilo-io/midnite-app`, the context is client-only, and **the template file must be committed in `midnite-app`** (this repo can't do it) — with the authored content ready to paste.
- [ ] **Tests / guard** — a unit assertion that the `template` + `labels` params are present and correctly encoded in the built URL; a note in the docs-links guard (if applicable) so the issue repo/URL stays consistent with `site-links.ts`.

---

## Files this phase touches

| Area | Files |
|------|-------|
| web · menu | [`components/assistant/assistant-panel.tsx`](../packages/web/components/assistant/assistant-panel.tsx) (new `report` entry + `activate` branch) |
| web · url helper | [`lib/site-links.ts`](../packages/web/lib/site-links.ts) (`githubIssuesNewUrl` + `REPORT_ISSUE_LABELS`) |
| web · modal | **new** [`components/report-issue-dialog.tsx`](../packages/web/components/report-issue-dialog.tsx) (mirrors [`confirm-dialog.tsx`](../packages/web/components/confirm-dialog.tsx), portals to body), reuses [`components/ui/textarea.tsx`](../packages/web/components/ui/textarea.tsx) |
| web · context | **new** [`lib/report-context.ts`](../packages/web/lib/report-context.ts) (composes `usePathname`/[`version`](../packages/web/lib/version.ts)/[`connection-store`](../packages/web/lib/connection-store.ts)/[`desktop-bridge`](../packages/web/lib/desktop-bridge.ts)/theme) |
| desktop · main | [`packages/desktop/src/main/index.ts`](../packages/desktop/src/main/index.ts) (`setWindowOpenHandler` → `shell.openExternal`) |
| docs / other repo | **new** `bug_report.md` content authored for the **`midnite-app`** repo (added there, not here); README + docs-site Guides note |
| tests | `site-links` URL-builder unit, `report-context` builder unit, `ReportIssueDialog` RTL (render/edit/cancel/oversize), the entry render |

---

## Verification

- [ ] **The button exists and previews:** "Report issue" appears in the assistant menu (lucide `Bug`); clicking it opens a modal with an **editable** title + a body **prefilled with page context** (route, app version, browser/OS, web-vs-desktop, theme, connection status). Editing the body changes what gets sent.
- [ ] **Hand-off is correct:** confirming opens `github.com/bilo-io/midnite-app/issues/new` with `title`, `body`, `labels` (and `template`) prefilled and correctly URL-encoded (spaces/newlines/`#`/unicode survive). Cancel opens nothing.
- [ ] **Context prefill is real + private:** the captured context matches the page the user was on and is **all visible/editable** before submit — nothing is sent anywhere except into the GitHub URL the user chooses to open. Oversized bodies surface the URL-length warning (with a Copy-body fallback).
- [ ] **Desktop parity:** in a packaged/dev desktop build, Report issue (and the existing **Docs** link) open the **system browser**, not an in-app window; web still uses plain `window.open` with no branching.
- [ ] **Template documented:** the `bug_report.md` content is authored and the README/docs explain adding it to `midnite-app`; app-generated and direct-on-GitHub reports look consistent.
- [ ] `moon run web:typecheck && web:test && :lint` green; new units (URL builder, context builder, dialog) pass; no gateway/`shared` changes.

---

## Decisions / open questions

1. **Creation approach** → **Resolved (user): prefilled GitHub link + preview.** Pure client-side compose → `window.open(issues/new?…)`; no gateway endpoint, no GitHub API, no bot token. (Server-side creation was considered and set aside as much heavier — auth, stored token, rate-limit/spam guard.)
2. **Template strategy** → **Resolved (user): client-built body + a markdown template in `midnite-app`.** Our button builds the full `?body=` (which GitHub uses over the template body); a `bug_report.md` is also authored for `midnite-app` as the scaffold for people who report directly on GitHub. (YAML issue-forms were set aside — they prefill by field id and fight free-text body prefill.)
3. **Context depth (v1)** → **Resolved (user): light — everything READY today.** Route, app version, browser/OS, web-vs-desktop, theme, WS connection. **Deferred:** gateway version (needs a small new health/meta version field) and a recent-errors trail (needs a net-new error boundary/store — none exists) — both optional extras, revisit if triage needs them.
4. **Report types** → **Resolved (user): single "Report issue" (bug).** Fully-editable body preview (best privacy posture for a public issue). A Bug/Feature picker is a cheap later extension (one entry, different labels/template).
5. **Desktop external-open** → **Resolved (user): include the fix.** `setWindowOpenHandler` + `shell.openExternal` in desktop main; also fixes the existing Docs-opens-in-app bug. The one cross-package touch this phase.
6. **URL-length limit** → **Recommendation: keep the context body compact + guard in the dialog.** GitHub truncates ~8KB URLs; the builder stays terse and the modal warns/auto-trims oversized bodies (with a Copy-body fallback). *(Recommended; confirm in review.)*
7. **Repo/labels home** → **Resolved: `packages/web/lib/site-links.ts`** (web-only; nothing else needs it, so not `shared`). `PUBLIC_GITHUB_REPO` already lives there.
8. **Cross-repo template commit** → the `bug_report.md` file must be added in the **`midnite-app`** repo (this phase can't commit there); the content is authored + documented here so it's a paste-and-commit in the other repo. *(Flagged — not blocking the button, which works with or without the template file.)*
