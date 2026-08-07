# Phase 85 — green the `e2e` job, and stop it hiding again

**Why now.** The `e2e` GitHub job has failed on **every** non-skipped `main` run for at
least 22 runs (back past 2026-07-30). The last measured signature before this phase:
**31 failed · 8 flaky · 46 passed, 34.7 minutes** (run `31182112786`, commit `f2cc5946`).

Nobody saw it, by construction. `e2e.yml` carried `continue-on-error: true` on the
**job**, which makes GitHub record the job as `failure` while reporting the whole
workflow **run** as `success` — a permanently-red suite behind a green badge. There was
no `e2e-gate` aggregator to surface it, and `main` carried no branch protection at all.

The rest of the suite is fine: a full `moon run :test` on `main` (b68afd02) passes
**6,049 tests, 0 assertion failures** across all ten packages.

**Of the 31 failures, ~0 were app regressions.** They were harness gaps, stale specs,
and over-broad locators that accumulated while nobody could see them accumulate.

---

## Theme A — the shared harness ✅

The suite fought two first-run modal gates that are permanently on in this environment,
and each spec had to opt out **by hand**:

- **The setup wizard** auto-opens whenever the gateway reports `ready === false`. The
  config deliberately blanks the LLM keys so task titles stay deterministic, so the e2e
  gateway is *never* ready and the wizard *always* opens, swallowing every click and drag.
- **The idle screensaver** (`inactivityTimeoutS`, 30s) layers a second interceptor over
  anything the first already stalled.

- [x] The opt-out was an `addInitScript` block copy-pasted into **61 places across 36
      files** — and missing entirely from `board`, `task-graph`, `task-detail`,
      `search-page`, `search-palette`, `data-restore` and `retro-digest-pipeline`, which
      is exactly where the click/drag failures were. A new spec was born broken.
      `e2e/helpers/harness.ts` now owns it: import `test` from there and both gates are
      suppressed.
- [x] `mergeSettings()` — init scripts stack and **re-run on every navigation**, so three
      specs that assigned `midnite.settings` wholesale were clobbering the harness's own
      `inactivityTimeoutS` and handing themselves a screensaver mid-test.
- [x] `suppressFirstRunGates()` for contexts built by hand with `browser.newContext()` —
      the `page` fixture cannot reach those (`office-presence`, `reconnect-resume`).
- [x] `pressGlobalKey()` / `openPalette()` — ⌘K, `?` and the `G _` chords attach their
      listeners in effects **inside `<AuthGate>`**, which renders `null` until the session
      resolves, so a single un-retried keypress right after `goto()` was lost forever.
      That was the palette flake.
- [x] `uniqueLabel()` — `workers: 1` + `retries: 1` + one shared gateway DB means a
      `beforeAll` re-seeds identical titles on retry, mutating a first-attempt failure
      into a *different*, more confusing strict-mode violation on the second.
- [x] `agent.pool` 1 → 4. `poolEnabled: false` only stops the scheduler;
      `POST /tasks/:id/start` bypasses it by design, so a retry that seeded a fresh task
      hit `409 no free agent slot` while the first attempt's stub agent still held the
      only slot.

## Theme B — serve a real build ✅

- [x] `next dev` compiled each route on first visit **inside** the 60s per-test budget —
      13 bare "Test timeout exceeded" failures came from that, and most of the wall clock.
      `MIDNITE_WEB_TARGET=server` (already supported for the hosted build) gives a real
      `next build` in its own `.next-server` distDir. On in CI; locally `E2E_BUILD=1`, so
      a single-spec loop keeps `next dev`'s ~5s boot.
- [x] `next build` rewrites the **tracked** `next-env.d.ts` to point at its distDir; the
      command puts it back, or every run left the tree dirty and aimed the default static
      typecheck at a dir `web:build` never produces.
- [x] `webServer` is global, not per-project, so `--project=chromium` booted a Storybook
      only the `stories` project uses — ~2 minutes, every run. Now conditional.
- [x] **Result: 34.7 min → 13.8 min.**

## Theme C — realign the specs with the app ✅

Every one of these is a spec that stopped describing the product:

- [x] **Copy + role drift** — `BackLink` renders a `<Link>` (link, not button);
      `ResourceNotFound`'s heading is `{noun} not found`, no trailing period, its capital
      from `first-letter:uppercase` CSS; the rail's lock control is `nav.footer.lock` =
      "Lock" and accessible-name matching is substring, so "Lock screen" stopped matching.
- [x] **Shipped redesigns** — Settings → Data became a Backup|Restore tab pair that keeps
      both panels mounted and `hidden`s the inactive one (the restore preview was
      rendering correctly into a `display:none` subtree); the memory workspace moved its
      doc editor into a metadata modal and its file input into `AddSourceModal`; project
      detail's tabs went Details/Plan/Tasks → Details/Docs/Tasks/Roadmap, its right rail
      was renamed, and a loaded detail page deliberately has **no** back affordance any
      more (`page-header.tsx`) — that assertion moved to the not-found branch, where the
      `BackLink` still lives; the board tour gained a middle step.
- [x] **Over-broad locators** — `page.locator('canvas')` also matched `<AppBackdrop>`'s
      decorative canvas, mounted behind every `(main)` page whenever the appearance
      pattern has a canvas twin (one Settings click away at any time); `/to interact/i`
      matched both the 2D and 3D hints; `heading{name:'Studio'}` also matched
      `PageHeader`'s `<h1 aria-label={title}>` for a memory whose title contains "studio".
- [x] **Real API drift** — `GET /tasks` returns `{ items, total }`; `inbound-receiver`
      still destructured it as a bare array.
- [x] **A spec that broke itself** — `slides` seeded its empty deck store in an
      `addInitScript`, which re-runs on every navigation, so going to `/slides` wiped the
      deck the test had just created.
- [x] **The count badge moved** — `reconnect-resume` read it by `following-sibling::span[1]`
      off the `<h2>`; the pill now sits in its own flex container, so the XPath matched
      nothing and every read hung to the 60s timeout. That read as a WS-liveness problem
      and was not one.
- [x] **Two rows, one title** — a task's indexed body *is* its title, so a search result
      renders it twice (title + match snippet): `getByText(title)` is a strict-mode
      violation in `search-page` and `search-palette`.
- [x] **Trailing slashes** — `trailingSlash: true` means `/tasks/graph/?task=…`, which
      `/\/tasks\/graph\?.*task=/` can never match.
- [x] **A drag that only worked alone** — `board`'s drag passed in isolation and failed in
      a full run: the board is un-windowed and page-scrolling, so once the suite has
      seeded its fixtures the card sits below the fold and `page.mouse` pressed empty
      space. `dragCardTo` scrolls into view and clamps the drop point.
- [x] **Coverage recovered, not skipped** — the breakdown flow gained a plan-overview
      Stage 1 needing a completed agent run, which the stub agent could never produce: it
      idled forever on the one-shot form (`claude -p …`) managed runs use, so the run hung
      in `running` and the rest of the flow was unreachable. The stub now answers
      one-shots with deterministic markdown and exits; the interactive session path is
      untouched (it never carries `-p`).

## Theme D — make it visible, and keep it that way ✅

- [x] `continue-on-error` moves from the **job** to the screenshot-capture **step**: a
      capture problem still can't block a merge, a flow regression now can.
- [x] `e2e-gate` mirrors `ci-gate` — always runs, passes on `success` *or* `skipped`,
      fails on a real failure. That's the check to require; requiring `e2e` itself would
      let a legitimate skip wedge a merge.
- [x] The visual step had **never once executed** — job-level `continue-on-error` doesn't
      stop a failing step from halting the job, so it reported `skipped` on every run in
      the history. Now `if: always()`.
- [x] `toHaveScreenshot` + its ten baselines are gone. They were macOS-generated while the
      job runs on `ubuntu-latest`, so they could never have passed there. The shots are
      preview artifacts for human review; the flow specs own the behavioural assertions.
- [x] Stale records corrected — `docs/TESTING.md` listed three storybook `play` assertions
      as permanently failing (fixed long ago) and claimed a11y was warnings-only (it's
      `test: 'error'` in both `web` and `ui`); `docs/CICD.md` and the e2e README document
      `e2e-gate` and the harness.
- [ ] Branch protection on `main` requiring **`ci-gate` + `e2e-gate`** — `docs/CICD.md`
      has specified this for a while and it has never existed
      (`…/branches/main/protection` → 404, `…/rulesets` → `[]`).

## Verification

```bash
cd packages/web
E2E_BUILD=1 pnpm exec playwright test --project=chromium --reporter=list
```

Done means the `e2e` **job** (not just the run) reports `success` in
`gh run view <id> --json jobs`, the capture step no longer reports `skipped`, and
`gh api repos/bilo-io/midnite/branches/main/protection` returns a ruleset instead of 404.
