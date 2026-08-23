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

## Theme E — the six the rebase exposed ✅

Two weeks of `main` drift landed on this branch at rebase: **81 passed · 6 failed**, in
files the branch mostly never touched. They looked like six problems. They were two, and
one of them was an app bug the suite had been unable to report while it was invisible.

- [x] **Four of the six were one silent client bug.** `useReliableSubscription` keeps its
      socket in a `useRef` shared across effect runs, and `onclose` reset that ref
      unconditionally. React's dev-mode double-invoke closes the first socket *while it is
      still CONNECTING*, so its `close` event lands **after** the second run has stored its
      own socket — and the reset disowned a live connection. The handshake is sent through
      that ref, so the surviving socket opened and sent nothing; the gateway only registers
      a client once its `subscribe` frame arrives, so **the board received no events at all
      for the life of the page**. `onclose` now only disowns the socket when it is still the
      current one, and the open handshake goes down the socket it belongs to. That alone
      fixed `refetch-coalescing`, both `reconnect-resume` specs and `reply-resume`.
      Worth naming: the gateway was blameless throughout — a raw `WebSocket` opened from
      the same page received its watermark immediately. Two unit tests now pin it, and each
      fails without either half of the fix.
- [x] **`office`'s pointer-lock crash was also real.** drei's `<PointerLockControls>` binds
      click-to-lock to `document` when given no `selector`, so *any* click asked the WebGL
      canvas for the pointer — including the click on the "2D" tab that unmounts it. The
      request landed on a detached element and threw an uncaught `WrongDocumentError`,
      which is precisely what the Phase 63 G engine-swap spec exists to catch. Scoping the
      handler to the stage wrapper fixes the crash and the UX together: the viewport grabs
      the pointer, the surrounding chrome no longer does.
- [x] **The last two were the shared-gateway coupling, one layer deeper.** `a11y-keyboard`
      and `refetch-coalescing` waited on a `Todo` column heading without seeding anything.
      An empty board replaces the whole column grid with an empty state, so those waits
      only ever passed because *another* spec had left a task behind — they broke the
      moment the suite ran as a subset. Both now seed their own anchor and pin the unified
      layout (`pinUnifiedBoard` takes a `BrowserContext` too, for `reconnect-resume`'s
      hand-rolled keeper client).

**Result: 87 passed · 0 failed, 4.7 min** — from 31 failed · 34.7 min on `main`.

## Follow-ups the newly-visible capture step revealed

The capture step had been `skipped` on every run ever recorded, so nobody had seen its
state. On its first real run: **29 failed · 1 flaky · 93 passed**. Two distinct findings,
neither caused by Phase 85, and neither fixed here:

- [ ] **A real responsive bug.** `mobile-audit.shots.ts` is an assertion, not a capture,
      and it fails at every phone width:
      `Horizontal body scroll at 320px on: tasks (+96px), media (+187px), workflows (+32px), task-detail (+325px)`
      — same at 375 / 390 / 768 / landscape, plus `mobile-layout.shots.ts` at 390. Needs a
      layout decision, not a test edit.
- [ ] **The harness gap, one layer out.** `helpers/screenshots.ts` dismisses the setup
      *nudge* but not the *wizard* or the screensaver, and `helpers/harness.ts` covers
      only `*.e2e.ts` — so the `.shots.ts` specs still fight the overlay this phase
      removed everywhere else (e.g. `accent-surfaces` times out clicking a "Customise"
      button the wizard backdrop swallows). ~20 of the 29. Mechanical: extend the harness
      to the other glob.

## Verification

```bash
moon run web:e2e
# local:  87 passed · 0 failed (4.7m) — was 31 failed · 8 flaky · 46 passed (34.7m)
```

`moon run :typecheck` and `:lint` are green; `moon run :test` passes 2694 gateway + 2398
web. The one `:test` failure seen under full-suite load,
`lib/i18n-setup-infra-keys.test.ts`, is the known load-induced 5s-timeout flake in a file
this branch never touches — it runs in 348ms on its own.

`reconnect-resume.e2e.ts` was the CI flake to watch after Theme C repointed its
count-badge locator. Theme E found the cause was not the locator: the socket it measures
was orphaned before it ever subscribed.

Done means the `e2e` **job** (not just the run) reports `success` in
`gh run view <id> --json jobs`, the capture step no longer reports `skipped`, and
`gh api repos/bilo-io/midnite/branches/main/protection` returns a ruleset instead of 404.
