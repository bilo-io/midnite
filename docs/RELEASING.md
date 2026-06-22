# Releasing midnite

How midnite is versioned, tagged, and released. The process is a repeatable
two-step — `/release-prep` (analyse + draft) then `/release-complete` (execute) —
so cutting a release is deliberate, not a manual scramble. The curated, user-facing
notes live in [`CHANGELOG.md`](../CHANGELOG.md); this file is the *policy*.

> Status: the **versioning policy + the lockstep tooling** (this doc + the
> version-sync helper + `version-check`), the **root changelog**, and **both
> skills** — [`/release-prep`](../.claude/skills/release-prep/SKILL.md) (Theme C) and
> [`/release-complete`](../.claude/skills/release-complete/SKILL.md) (Theme D) — are
> in place. Phase 29's tooling is complete; what remains is cutting the first real
> release (`v0.1.0`) as a deliberate run (Decision §7).

## Versioning rule — lockstep major.minor, independent patch

midnite is a monorepo of seven packages (`shared`, `gateway`, `cli`, `web`, `site`,
`desktop`, `ui`). They version **in lockstep on `MAJOR.MINOR`** — at any moment
every package shares the same `MAJOR.MINOR`. Only the **`PATCH`** advances
**independently** per package:

```
‹global MAJOR›.‹global MINOR›.‹per-package PATCH›
```

So a `cli`-only fix can ship `0.3.1` while `web` stays `0.3.0`. A **minor or major**
release moves **every** package to the new `MAJOR.MINOR.0`; a **patch** release
bumps only the affected package(s).

This is the firm decision (Phase 29 Decision §1). Hand-rolled tooling models it
exactly — `changesets`/`semantic-release` model *fixed* **or** *independent*
versions, not this hybrid (Decision §5).

### The invariant, enforced in CI

`version-check` asserts the lockstep invariant on every PR (it runs in `moon ci`):

```sh
moon run root:version-check     # node scripts/version-check.mjs
```

It compares the **`MAJOR.MINOR` prefix** across all `package.json` files (patches
may differ), names any divergers, and fails if they don't share one `MAJOR.MINOR`.

The bump math is a pure, unit-tested helper — [`packages/shared/src/version.ts`](../packages/shared/src/version.ts):

- `sharesLockstepMajorMinor(versions)` — the invariant the check enforces.
- `planVersionBump(current, { level, changedPackages })` — given the current
  versions and a categorised change set, returns the next version for every
  package: `major`/`minor` move all packages to `X.Y.0`; `patch` bumps only the
  changed packages; `none` is a no-op.

## What triggers which bump

Derived from the **conventional commits** since the last release (the house commit
style — `feat`/`fix`/`refactor`/`docs`/`chore`/`test`, package-scoped). Take the
**strongest** signal across all commits in the range (Phase 29 Decision §2):

| Commits since last release | Bump | Effect |
|---|---|---|
| Any commit with `BREAKING CHANGE` (footer or `!`) | **major** | every package → `(X+1).0.0` |
| Any other `feat` | **minor** | every package → `X.(Y+1).0` (lockstep) |
| `fix`-only (no `feat`) | **patch** | bump only the packages whose files changed |
| `docs` / `chore` / `refactor` / `test` only | **none** | no release (unless they change shipped output) |

`changedPackages` (which packages' files moved in the range) only matters for a
`patch` — it scopes the bump. For `major`/`minor` the whole repo moves together.

## Tag & branch scheme

(Phase 29 Decision §3.)

- **Release branch:** all release work happens on `release/vX.Y.Z`, merged to `main`
  via a release PR — never tag straight off a feature branch.
- **Lockstep release** (minor/major): a single repo tag **`vX.Y.Z`** (always
  `vX.Y.0` for a minor/major, since patch is `0` when everything moves together).
- **Independent package patch:** a scoped tag **`@midnite/‹pkg›@X.Y.Z`** for the
  bumped package, so the repo-wide `v*` tag isn't moved for a one-package fix.

Pushing a `v*` tag triggers [`.github/workflows/release.yml`](../.github/workflows/release.yml),
which builds the desktop installers on every OS and publishes a **draft** GitHub
Release with them attached.

## The two-step flow

### 1. `/release-prep` — analyse + draft (read-mostly, reversible)

1. Find the last release — the latest `v*` tag (and any scoped tags); compute the
   diff base.
2. Gather changes since — `git log ‹base›..HEAD` parsed as conventional commits,
   categorised by type + scope (→ which packages changed); cross-reference merged
   PRs for titles/context.
3. Propose the version — run `planVersionBump` to compute the next version(s) under
   the lockstep rule, and show the reasoning (what triggered major/minor/patch).
4. Draft the changelog — write the new `CHANGELOG.md` section (grouped Added /
   Changed / Fixed / Removed, curated — not a raw `git log` dump) and bump the
   `package.json` versions on a fresh `release/vX.Y.Z` branch.
5. Confirm follow-ups — surface anything ambiguous (uncategorised commits, a `feat`
   that's really a fix, notes to add); let the human edit wording.
6. Stop before finalising — leave the prepped branch as a draft. **No tag, no
   push-to-main, nothing irreversible.**

### 2. `/release-complete` — execute (irreversible, after human review)

1. Preconditions — on a `release/vX.Y.Z` branch, working tree clean,
   `root:version-check` + `moon ci` green, the `## [X.Y.Z]` changelog section
   present and dated.
2. Finalise — re-run `planVersionBump` to confirm the bumps are applied lockstep;
   move `## [Unreleased]` → the dated `## [X.Y.Z] - YYYY-MM-DD` section.
3. Commit + tag — `chore(release): vX.Y.Z`, then the tag(s) per the scheme above.
4. Publish — push the branch + tags, merge the release PR to `main`, and create the
   GitHub Release from the changelog section (`gh release create`).
5. Confirm — print the released version, the tag, the release URL, and re-seed the
   next `## [Unreleased]` stub.

## Out of scope

- **Publishing to npm / a registry** — packages are private; releases tag + cut a
  GitHub Release only. Add a publish step when a package goes public.
- **Auto-deploy on tag** — deploying web/site/gateway on release is a separate ops
  concern.
- **Backport / release-train branches** — single-track releases off `main` for now.
