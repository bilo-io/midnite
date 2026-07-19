# Report an issue (assistant → GitHub)

_Phase 74._ The floating **assistant menu** (the logo button, bottom-right) has a
**Report issue** entry. It opens an **editable preview** with the page context
auto-filled (route, app version, browser/OS, web-vs-desktop, theme, live-connection
status), and on confirm hands off to a **prefilled GitHub issue** in the public
[`bilo-io/midnite-app`](https://github.com/bilo-io/midnite-app) repo.

## How it works

- **Pure client-side.** There is no gateway endpoint, no GitHub API call, and no
  stored token. The button assembles a `github.com/bilo-io/midnite-app/issues/new?…`
  URL ([`packages/web/lib/site-links.ts`](../packages/web/lib/site-links.ts) →
  `githubIssuesNewUrl`) and opens it with `window.open`.
- **The context is client-only and private.** It is composed in the browser
  ([`packages/web/lib/report-context.ts`](../packages/web/lib/report-context.ts))
  and shown in the preview textarea. Nothing is sent anywhere until the user opens
  the GitHub issue, and every line is editable — deleting a line is how the user
  controls what they share (the issue is **public**).
- **Labels + template.** Reports carry the `bug` and `from-app` labels and request
  the `bug_report.md` template. GitHub uses our explicit `?body=` over the template
  body, but the template's front-matter (labels/assignees) still applies, and it is
  the scaffold for people who open issues **directly** on GitHub. GitHub silently
  ignores labels/templates that don't exist yet, so the link works with or without
  the file below.
- **Desktop.** In the packaged app, external links open the **system browser** via
  `setWindowOpenHandler` → `shell.openExternal`
  ([`packages/desktop/src/main/index.ts`](../packages/desktop/src/main/index.ts));
  this also fixes the existing assistant **Docs** link.

## Cross-repo step — add the template to `midnite-app`

The issue template lives in the **other** repo and cannot be committed from here.
Add the file below to `bilo-io/midnite-app` at
`.github/ISSUE_TEMPLATE/bug_report.md`. It uses the same **Environment** headings
the in-app reporter emits, so app-generated and direct-on-GitHub reports look
consistent.

```markdown
---
name: Bug report
about: Report a problem with the midnite app
title: "[bug] "
labels: ["bug", "from-app"]
assignees: ""
---

### What happened?

<!-- Describe the bug: what you did, what you expected, and what actually happened. -->

### Environment

<!-- The in-app "Report issue" button fills this in automatically. If you're
     opening this issue directly on GitHub, fill in what you can. -->

| Field | Value |
| --- | --- |
| Page |  |
| Version |  |
| Environment |  |
| Browser / OS |  |
| Viewport |  |
| Theme |  |
| Connection |  |
```

> The `labels`/`template` names above must stay in sync with `REPORT_ISSUE_LABELS`
> and `REPORT_ISSUE_TEMPLATE` in [`site-links.ts`](../packages/web/lib/site-links.ts).
