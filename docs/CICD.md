# CI/CD — affected-only deploys & checks

> **Phase 78.** GitHub Actions and Vercel used to run on every push/PR regardless
> of what changed. This is the runbook for the cost-cut: only the app whose
> dependency subtree changed deploys, only the checks a change needs run, and
> skipped work reports **green** so PRs never hang.

## The deploy economy at a glance

| Surface | Trigger | Gated by |
|---------|---------|----------|
| **GitHub Actions — `ci` (`moon ci`)** | push to `main`, every PR | runs only when a package is affected (`changes.outputs.code`) |
| **GitHub Actions — `e2e` + visual** | push to `main`, every PR | runs only when `web`/`ui`/`shared`/`shell` affected (`webVisual`) |
| **GitHub Actions — `coverage`** | push to `main`, every PR | `webVisual` or `gateway` affected |
| **GitHub Actions — `gallery` + Storybook preview** | PR + `main` | `webVisual` affected |
| **Vercel — `web`** | production branch (`main`) only | web subtree (`web`+`shared`+`ui`+`shell`) changed |
| **Vercel — `admin`** | production branch (`main`) only | admin subtree (`admin`+`shared`+`ui`+`shell`) changed |
| **Vercel — `docs`** | production branch (`main`) only | docs subtree (`docs`+`ui`) changed |
| **Vercel — `site`** | production branch (`main`) only | site subtree (`site`+`ui`) changed |
| **Vercel — `gateway`** | never (stateful server) | `ignoreCommand` always skips + `deploymentEnabled:false` |

No feature-branch **previews** deploy — production only. There is **no numeric
daily-deploy cap**; the savings come from not deploying/running unaffected work.

## How "what changed" is decided

**moon is the single oracle for GitHub Actions.** The reusable
[`affected.yml`](../.github/workflows/affected.yml) workflow runs
`moon query projects --affected` (via [`scripts/gh-affected.mjs`](../scripts/gh-affected.mjs))
against the PR base / previous push commit and emits a boolean per package plus
two convenience groups the jobs gate on:

- `code` — any package affected → run the blocking `moon ci`.
- `webVisual` — `web`/`ui`/`shared`/`shell` → run e2e / visual / Storybook.

The docs site deploys to its own hosted **Vercel** project (see the table above);
its `vercel.json` `ignoreCommand` gates on the docs subtree (`docs`+`ui`) — the
same git-diff mechanism every other app uses, not a GitHub Actions job.

Because moon knows the dep graph (`shared → web`, `ui → shell → web`), a change
to `shared` correctly marks `web` affected — no hand-maintained globs to drift.

**Vercel can't run moon** (it isn't in Vercel's build image), so each app's
`vercel.json` points its *Ignored Build Step* at
[`scripts/vercel-ignore.mjs`](../scripts/vercel-ignore.mjs), a thin `git diff`
over the app's subtree. Exit `0` skips the build, exit `1` proceeds.

### Fail-open

If the diff base can't be resolved (first push, force-push, shallow clone) or
`moon query` errors, detection **fails open** — every package is marked affected
so the full matrix runs. A needed check is never silently skipped. **Root-level
changes** (`.github/`, workspace config, the lockfile, `todo/`, repo-level
`docs/`, `scripts/`) surface as moon's `root` project and also fail open — when
in doubt, run everything.

## The skip-is-pass contract (branch protection)

A GitHub *required* status check that never runs leaves a PR stuck "Expected —
waiting for status." So the required check is **not** `ci` — it's **`ci-gate`**,
an always-run aggregation job in [`ci.yml`](../.github/workflows/ci.yml) that:

- **passes** when `ci` succeeded **or** was skipped (nothing affected), and
- **fails** on a real `ci` failure/cancel, or if affected-detection didn't succeed.

So a docs-only PR skips `moon ci`, `ci-gate` goes green, and the PR is mergeable.

### Repoint branch protection (one-time)

Make `ci-gate` the **only** required status check. The non-blocking jobs (`e2e`,
`coverage`, `gallery`, `storybook`) must **not** be required — they're
`continue-on-error` and gated, so requiring one would let a skip wedge a merge.

> First check what's there: `gh api repos/{owner}/{repo}/branches/main/protection/required_status_checks`.
> If it returns **`Branch not protected` (404)**, there's no protection yet — you're
> *creating* it (use the `PUT` below or the UI), not patching an existing rule.

**Option A — GitHub UI (simplest for a one-time setup).**

1. Open **Settings → Branches** (`https://github.com/{owner}/{repo}/settings/branches`).
2. **Add classic branch protection rule** (or a ruleset).
3. **Branch name pattern:** `main`.
4. Tick **Require status checks to pass before merging**.
5. Search for **`ci-gate`** and select it. *(Only checks that have run before appear —
   `ci-gate` shows up once CI has run at least once on a PR.)*
6. **Leave "Require branches to be up to date before merging" UNticked** — ticking it
   forces a rebase on every PR before merge, which fights the parallel-loop workflow.
7. Add **only** `ci-gate`. Save.

**Option B — `gh` CLI.** When no protection exists yet this is a full `PUT`
(not a `PATCH`):

```bash
gh api -X PUT repos/{owner}/{repo}/branches/main/protection --input - <<'JSON'
{
  "required_status_checks": { "strict": false, "checks": [{ "context": "ci-gate" }] },
  "enforce_admins": false,
  "required_pull_request_reviews": null,
  "restrictions": null
}
JSON
```

- `"strict": false` — don't force branch-up-to-date (same reason as UI step 6).
- `"enforce_admins": false` — admins can still override in a genuine emergency.
- `required_pull_request_reviews` / `restrictions` `null` — no reviewer requirement,
  so self-merge still works.

**Verify (either option):**

```bash
gh api repos/{owner}/{repo}/branches/main/protection/required_status_checks \
  --jq '.checks[].context'   # → ci-gate
```

**Two things to know once it's on:**

- A **skipped `ci` now reads green through `ci-gate`** — a docs-only PR won't hang.
  That's the whole point of requiring `ci-gate` rather than `ci`.
- **CI must actually run** for `ci-gate` to report, so if GitHub Actions is ever
  billing-blocked, PRs won't be mergeable until it's restored (previously, with no
  required check, you could merge on local-green).

## Adding a new app

1. **moon** — the new package's `moon.yml` `dependsOn` is picked up automatically
   by `moon query --affected`; add it to `PACKAGES` in
   [`scripts/gh-affected.mjs`](../scripts/gh-affected.mjs) (and to a convenience
   group if a job should gate on it).
2. **Vercel** — add the app + its subtree (itself + transitive `dependsOn`) to
   `SUBTREES` in [`scripts/vercel-ignore.mjs`](../scripts/vercel-ignore.mjs) and
   set its `vercel.json` `ignoreCommand` to `node ../../scripts/vercel-ignore.mjs <app>`.
3. The **drift guard** in `packages/shared/src/vercel-ignore-scripts.test.ts`
   fails CI if a `SUBTREES` entry doesn't match the package's transitive
   `moon.yml dependsOn` — so an added dep edge can't silently under-deploy.
