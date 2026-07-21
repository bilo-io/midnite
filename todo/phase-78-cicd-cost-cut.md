# Phase 78 — CI/CD cost-cut: affected-only deploys & checks

> **Problem.** Every push and PR runs the full GitHub Actions matrix and triggers Vercel
> deploys regardless of what actually changed. [`ci.yml`](../.github/workflows/ci.yml),
> [`e2e.yml`](../.github/workflows/e2e.yml), and [`preview.yml`](../.github/workflows/preview.yml)
> all fire on **every** push/PR with **no `paths:` filter** — a docs typo boots a runner,
> installs the whole workspace, installs Playwright chromium, and runs `moon ci`. On the
> Vercel side, [`web/vercel.json`](../packages/web/vercel.json) +
> [`docs/vercel.json`](../packages/docs/vercel.json) deploy a **preview for every feature
> branch** and rebuild **even when the app's own code didn't change** (there's no
> ignore-build-step; web's `buildCommand` also chains `shared`/`ui`/`shell`). This phase
> stops the waste: only deploy the app whose dependency subtree changed, only run the
> checks that a change actually needs, and never deploy previews.

> **Scope guardrails.** moon's **affected graph** is the single oracle for Actions
> (`moon query projects --affected` already knows `shared→web` / `ui→shell→web` edges); a
> thin **git-diff** ignore script gates Vercel (moon isn't in Vercel's build image). Skipped
> work must report **green**, never "waiting" — a final always-run **`ci-gate`** job is the
> only required check. No hard numeric deploy cap (Vercel has none in config; savings come
> from elimination). The **gateway stays fully un-deployed** (already off). We do **not**
> change what `moon ci` runs internally — only whether a runner boots at all.

> **Effort legend:** **S** ≈ an afternoon · **M** ≈ a day or two · **L** ≈ multi-day.

---

## Current state this builds on

- **Actions:** `ci.yml` runs `moon ci` (typecheck+test+build+lint); `e2e.yml` runs Playwright
  e2e + visual + a `coverage` job, already `continue-on-error`; `preview.yml` runs a
  screenshot `gallery`, a per-PR Storybook `gh-pages` deploy, a main-only `docs` deploy, and
  a PR-close `cleanup`. Only [`sync-public-assets.yml`](../.github/workflows/sync-public-assets.yml)
  has a `paths:` filter today. All check out with `fetch-depth: 0` (moon needs base history).
- **Vercel:** `web` + `docs` each have a `vercel.json` that only disables the `gh-pages`
  branch; **feature-branch previews are on** and there's **no ignore-build-step**. The
  gateway's `vercel.json` disables `main` + `gh-pages` (stateful server — stays off).

> **Scope note (discovered during build).** CI revealed **5** Vercel projects, not the 3 the
> doc assumed: `web`, `docs`, **`admin`**, **`site`**, and `gateway`. `admin`/`site` were
> deploying ungated previews and `gateway` previews failed on every PR — all five are now
> covered (user confirmed "all my Vercel apps").

## Theme A — Vercel deploy governance (previews off + subtree ignore) — **M** ✅ DONE (PR #498, 2026-07-21)

- [x] **Kill all previews for every app** — only the production branch (`main`) deploys;
      the `ignoreCommand` in [`scripts/vercel-ignore.mjs`](../scripts/vercel-ignore.mjs) skips
      any non-production `VERCEL_ENV`/ref. No feature-branch previews at all.
- [x] **Per-app `vercel-ignore.mjs` script** (Node, not bash — unit-testable): a thin
      `git diff HEAD^ HEAD` over the app's **dependency subtree** — `web`/`admin` =
      pkg+`shared`+`ui`+`shell`; `docs`/`site` = pkg+`ui`. Exit 0 = skip, exit 1 = build. So a
      `docs`-only change never rebuilds `web`. Referenced from each `vercel.json`.
- [x] **Gateway never deploys** — its `vercel.json` gets an always-skip `ignoreCommand`
      (`NEVER_DEPLOY`) on top of `deploymentEnabled:false`, so preview branches stop attempting
      (and failing) a stateful-server build.
- [x] Verified via CI: `changes` detection ran green; docs-only vs `shared` subtree behaviour
      is pinned by the drift-guard + unit tests (real-Vercel confirmation lands post-merge on `main`).

## Theme B — Actions affected-gating (moon oracle) — **L** ✅ DONE (PR #498, 2026-07-21)

- [x] **`changes` detection job** — reusable [`affected.yml`](../.github/workflows/affected.yml)
      (checkout `fetch-depth: 0`, moon-only setup) runs `moon query projects --affected` via
      [`scripts/gh-affected.mjs`](../scripts/gh-affected.mjs), emitting a per-package boolean
      matrix + `code`/`webVisual`/`docsDeploy` groups.
- [x] **Gate `ci.yml`** — `moon ci` runs only when `code == 'true'`; a pure docs/markdown
      change skips the runner entirely.
- [x] **Gate `e2e.yml`** — `e2e` on `webVisual`; `coverage` on `webVisual || gateway`.
- [x] **Gate `preview.yml`** — `gallery` + Storybook on `webVisual`; main-only `docs` deploy on
      `docsDeploy`; PR-close `cleanup` stays unconditional.
- [x] Factored the proto→pnpm install boilerplate into a `.github/actions/setup` composite
      action (deps optional, so the lightweight `changes` job skips `pnpm install`).

## Theme C — Skip-is-pass contract (`ci-gate` + branch protection) — **M** ✅ DONE (PR #498, 2026-07-21)

- [x] **`ci-gate` aggregation job** in `ci.yml` — `if: always()`, `needs: [changes, ci]`,
      passes when `ci` succeeded **or** was skipped (fails on real failure/cancel or a broken
      `changes`). The single required check, so a docs-only PR is immediately mergeable.
- [x] **Repoint branch protection** — the exact `gh api` call is captured in the runbook
      ([`docs/CICD.md`](../docs/CICD.md)); applying it is the one post-merge step (below).
- [x] Confirmed the non-blocking jobs (`e2e`/`coverage`/`gallery`/`storybook`/`docs`) are
      `continue-on-error` and must **not** be required checks — documented in the runbook.

## Theme D — Runbook & drift guards — **S** ✅ DONE (PR #498, 2026-07-21)

- [x] **[`docs/CICD.md`](../docs/CICD.md)** — the deploy economy table, the moon/Vercel oracle
      split, fail-open policy, the `ci-gate` contract + branch-protection repoint, and how to
      add a new app.
- [x] **Drift guard** — `packages/shared/src/vercel-ignore-scripts.test.ts` fails CI if a
      `SUBTREES` entry drifts from the package's transitive `moon.yml dependsOn`.
- [x] Noted in [`CLAUDE.md`](../CLAUDE.md) (CI section) that CI/CD is affected-gated and to
      expect skipped-but-green checks + the `ci-gate` required check.

## Post-merge actions (human, one-time)

- **Repoint branch protection** to require `ci-gate` instead of `ci`/`moon ci` — the `gh api`
  call is in [`docs/CICD.md`](../docs/CICD.md#repoint-branch-protection-one-time).
- **Confirm on real Vercel** after the first `main` deploy: a docs-only change deploys docs
  only; a `shared` change deploys web + admin; no feature-branch previews appear.

---

## Files this phase touches

- [`.github/workflows/ci.yml`](../.github/workflows/ci.yml) — `changes` job, gated `moon ci`, `ci-gate`
- [`.github/workflows/e2e.yml`](../.github/workflows/e2e.yml) — gate `e2e` + `coverage`
- [`.github/workflows/preview.yml`](../.github/workflows/preview.yml) — gate `gallery`/`storybook`/`docs`
- `.github/actions/setup/` *(new, optional)* — composite install action to de-dup boilerplate
- [`packages/web/vercel.json`](../packages/web/vercel.json) + `packages/web/scripts/vercel-ignore.sh` *(new)*
- [`packages/docs/vercel.json`](../packages/docs/vercel.json) + `packages/docs/scripts/vercel-ignore.sh` *(new)*
- [`packages/gateway/vercel.json`](../packages/gateway/vercel.json) — note only (stays disabled)
- `docs/CICD.md` *(new)* — the deploy/checks runbook
- [`CLAUDE.md`](../CLAUDE.md) — one-line CI note

## Verification

- [ ] **Docs-only PR:** `ci.yml`'s `moon ci` job **skips**, `ci-gate` reports **green**, PR is
      mergeable; no `web` Vercel deploy on merge, docs deploys.
- [ ] **`shared` change PR:** `moon ci` runs, e2e/preview run, and **web** deploys on merge
      (subtree edge honoured).
- [ ] **Feature branch push:** **no** Vercel preview deployment is created for `web` or `docs`.
- [ ] **`ci-gate` is the sole required check;** a genuinely failing `moon ci` still fails the
      gate (skip-is-pass never masks a real failure).
- [ ] Runbook documents adding a new app; the subtree drift guard passes.
- [ ] Existing green flows unchanged for a normal `web` PR (full matrix still runs).

## Decisions

1. **moon-affected is the oracle for Actions** (user choice) — `moon query projects
   --affected` over hand-maintained path globs, so cross-package edges (`shared→web`,
   `ui→shell→web`) can't drift out of sync.
2. **Economize, no hard cap** (user choice) — Vercel has no native "N deploys/day" in config;
   savings come from previews-off + subtree gating, not a numeric ceiling.
3. **All previews off for `web` + `docs`** (user choice) — production branch only.
4. **e2e + Storybook preview are affected-gated too** (user choice) — fattest runners, biggest
   saving, even though they're already non-blocking.
5. **Skip-is-pass via a `ci-gate` aggregation job** (user choice) — one workflow, no twin
   no-op file; branch protection repoints to `ci-gate`.
6. **Vercel uses a git-diff ignore script, not moon** (user choice) — moon isn't in Vercel's
   build image; a thin per-app subtree `git diff` avoids installing moon on every deploy
   evaluation. moon stays the oracle for Actions; the Vercel path list is the one
   hand-maintained thing, guarded by the Theme D drift check.
7. **Open — gate `preview.yml`'s main-only docs deploy?** *(Recommendation: yes — a one-line
   `if` keyed on the docs subtree; it's cheap but free to gate and keeps the model uniform.)*
   Marked resolved-to-yes above; flip if you'd rather always redeploy docs on main.
