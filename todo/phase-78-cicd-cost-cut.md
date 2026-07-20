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

## Theme A — Vercel deploy governance (previews off + subtree ignore) — **M**

- [ ] **Kill all previews for `web` + `docs`** — only the production branch (`main`) deploys.
      Set `git.deploymentEnabled` so non-production branches don't deploy, and/or a
      production-only `ignoreCommand` that exits 0 (skip) on any non-production ref. No
      feature-branch previews at all.
- [ ] **Per-app `vercel-ignore` script** (the "Ignored Build Step" / `ignoreCommand`): a thin
      `git diff` over the app's **dependency subtree** — `web` = `packages/web` + `shared` +
      `ui` + `shell` (mirrors its `buildCommand` chain); `docs` = `packages/docs` + `ui`. Exit
      0 = skip deploy, exit 1 = build. So a `docs`-only change never rebuilds `web`, and
      vice-versa. Live as a script under each package (`packages/<app>/scripts/vercel-ignore.sh`)
      referenced from `vercel.json`.
- [ ] **Gateway stays off** — leave [`gateway/vercel.json`](../packages/gateway/vercel.json)
      untouched; add a one-line note that it's intentionally excluded from the subtree scheme.
- [ ] Verify against real Vercel: a docs-only PR merge deploys **docs only**; a `shared` change
      deploys **web** (proves the subtree edge is honoured, not just the leaf dir).

## Theme B — Actions affected-gating (moon oracle) — **L**

- [ ] **`changes` detection job** — a fast leading job (checkout `fetch-depth: 0`, install
      toolchain, `moon query projects --affected --json` against the PR base / push range) that
      emits per-app boolean outputs (`web`, `docs`, `gateway`, `cli`, `shared`, `ui`, `shell`,
      `desktop`) consumed by downstream jobs.
- [ ] **Gate `ci.yml`** — the `moon ci` job runs only when *anything* code-relevant is
      affected; a pure-docs/markdown change skips the runner entirely (no boot, no install, no
      Playwright download).
- [ ] **Gate `e2e.yml`** — run the `e2e` + `coverage` jobs only when `web`/`ui`/`shared`/`shell`
      is affected (they're the fattest runners; biggest single saving even though e2e is
      already non-blocking).
- [ ] **Gate `preview.yml`** — run the screenshot `gallery` + Storybook deploy only when
      `web`/`ui`/`shared`/`shell` changed; run the main-only `docs` deploy only when the docs
      subtree changed. Keep the PR-close `cleanup` unconditional (it must always tidy
      `gh-pages`).
- [ ] Factor the shared install boilerplate (proto → `proto install` → `pnpm install
      --frozen-lockfile`) so the `changes` job and the gated jobs don't duplicate five steps
      each — a small composite action or reused step block.

## Theme C — Skip-is-pass contract (`ci-gate` + branch protection) — **M**

- [ ] **`ci-gate` aggregation job** in `ci.yml` — always runs (`if: always()`), `needs:` the
      `changes` + `moon ci` jobs, and passes when the gated job either **succeeded or was
      skipped** (fails only on a real failure). This is the job GitHub branch protection
      requires — a skipped `moon ci` reports green through the gate, so a docs-only PR is
      immediately mergeable instead of stuck "Expected — waiting for status."
- [ ] **Repoint branch protection** — document (and, where scriptable via `gh api`, apply) that
      the **required status check becomes `ci-gate`**, not `ci`/`moon ci`. Capture the exact
      `gh api` call in the runbook so it's reproducible.
- [ ] Confirm the non-blocking jobs (`e2e`, `coverage`, preview) are **not** required checks, so
      gating them can never wedge a merge regardless of skip behaviour.

## Theme D — Runbook & drift guards — **S**

- [ ] **`docs/CICD.md`** (or a section in an existing infra doc) — the deploy economy: what
      triggers a deploy, what triggers each workflow, the `ci-gate` contract, and **how to add a
      new app** to both the moon-affected outputs and its Vercel subtree list.
- [ ] **Drift guard for the Vercel subtree lists** — a comment/test that keeps each
      `vercel-ignore` path list honest against the package's real `moon.yml` `dependsOn` (the
      one hand-maintained list in the phase; everything else derives from moon), so a future dep
      edge added to `web` doesn't silently under-deploy.
- [ ] Note in [`CLAUDE.md`](../CLAUDE.md) (CI section) that Actions job-selection + Vercel
      deploys are affected-gated, so contributors expect skipped-but-green checks.

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
