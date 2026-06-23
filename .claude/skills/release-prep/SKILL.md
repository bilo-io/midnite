---
name: release-prep
description: Analyse the commits since the last release and prepare a release/vX.Y.Z branch — propose the version under the lockstep rule, draft the curated CHANGELOG section, bump the package.json versions, then STOP before anything irreversible (no tag, no push to main). Hand off to /release-complete.
argument-hint: "[major | minor | patch]   (optional — override the auto-detected bump)"
allowed-tools: Bash, Read, Edit, Write, AskUserQuestion, Agent
---

Prepare a midnite release: the read-mostly, reversible half of the two-step flow
([`docs/RELEASING.md`](../../../docs/RELEASING.md)). Ends with a `release/vX.Y.Z`
branch holding the changelog + version bumps as a draft, ready for
`/release-complete`. **Never tags, never pushes to `main`, nothing irreversible.**

**Policy is fixed, don't re-derive it:** lockstep `MAJOR.MINOR` (every package
shares it) + independent `PATCH` (per package). The bump math is the tested
[`packages/shared/src/version.ts`](../../../packages/shared/src/version.ts)
(`planVersionBump`); the commit→bump categorisation is the tested
[`packages/shared/src/release.ts`](../../../packages/shared/src/release.ts). Those
two modules are the source of truth — apply their rules, don't invent new ones.

**Style:** terse — report findings + decisions, don't narrate the gathering.

## 1 · Preconditions
- `git fetch origin --tags --quiet`. Work from an up-to-date `main`: `git switch main && git pull --ff-only` (or note if the user is intentionally elsewhere).
- Working tree must be **clean** — `git status --porcelain` empty. If dirty, stop and say so.
- If `$ARGUMENTS` names a level (`major`/`minor`/`patch`), treat it as a hard override of step 3's auto-detect (still show the auto-detect reasoning so the user can sanity-check the override).

## 2 · Find the last release & gather changes
- **Base:** latest lockstep tag — `git describe --tags --abbrev=0 --match 'v*'` (fall back to the root commit if there is none). Note any scoped `@midnite/*@*` tags newer than it.
- **Commits since:** `git log <base>..HEAD --no-merges --format='%H%x09%s%x09%b'` — one record per commit (subject + body, so `BREAKING CHANGE` footers are visible).
- **Changed files:** `git diff --name-only <base>..HEAD` — feeds package attribution (step 3).
- **PR context (optional but preferred):** `gh pr list --state merged --search "merged:>$(git log -1 --format=%cs <base>)" --json number,title,url --limit 200` for human-readable titles. If `gh` is unauthed, skip it — don't fail.

## 3 · Propose the version
Apply the [`release.ts`](../../../packages/shared/src/release.ts) rules to the
gathered commits (this is exactly what its unit tests pin):

- **Categorise** each commit subject with `parseConventionalCommit` (type / scope / `!` / `BREAKING CHANGE`).
- **Bump level** = `bumpLevelFromCommits` — strongest signal wins (Decision §2):

  | Found in range | Level | Effect |
  |---|---|---|
  | any `BREAKING CHANGE` (`!` or footer) | **major** | every package → `(X+1).0.0` |
  | any other `feat` | **minor** | every package → `X.(Y+1).0` (lockstep) |
  | `fix`-only | **patch** | bump only the changed packages |
  | docs/chore/refactor/test only | **none** | no release |

- **Changed packages** (only matters for `patch`) = `packagesForChangedPaths` over the `git diff` paths and the repo's `package.json` list (`midnite` = root; `@midnite/*` = `packages/*`).
- **Next versions** = `planVersionBump(current, { level, changedPackages })`, where `current` is read from every `package.json`.

To compute exactly rather than by hand, build shared once and call the helpers:
`moon run shared:build` then a small `node --input-type=module` snippet that imports
from `packages/shared/dist/` and prints `planVersionBump(...)`. (Worth it for a
patch with several changed packages; for a clean minor/major the rule is obvious.)

**Show the reasoning:** the base tag, the bump level + the commit(s) that triggered
it, and the resulting version(s). If the level is `none`, stop — there's nothing to
release; say which commits were seen.

## 4 · Confirm follow-ups — STOP for the human
Before writing anything, **AskUserQuestion** to confirm the proposed version and
surface ambiguity:
- the proposed level/version (recommended option first);
- any **uncategorised** commits (subjects `parseConventionalCommit` returned `null` for) — a `feat` that's really a `fix`? a stray non-conventional subject?
- user-facing notes worth adding that the commit subjects don't capture.

Honour an explicit `$ARGUMENTS` override but still show what auto-detect picked.

## 5 · Prepare the branch (draft — reversible)
- Branch off the gathered `main`: `git switch -c release/vX.Y.Z` (for an independent package patch use the lockstep `vX.Y.Z` the bumped package lands on as the branch name).
- **Bump versions:** set each affected `package.json` `"version"` to the planned value (lockstep minor/major → all packages; patch → only the changed ones). Edit the `version` field only.
- **Draft the changelog** in [`CHANGELOG.md`](../../../CHANGELOG.md), **Keep a Changelog** style:
  - Move the curated `## [Unreleased]` content into a new `## [X.Y.Z] - YYYY-MM-DD` section (today's date), grouped **Added / Changed / Fixed / Removed** via `changelogGroupForCommit` (feat→Added, fix→Fixed, refactor/perf→Changed, revert→Removed; the non-user-facing types — docs/chore/test/build/ci/style — map to `null` and are omitted). **Curate** — merge related commits into one readable line, drop noise; this is release notes, not a `git log` dump.
  - Flag any **breaking** change prominently in the section.
  - Re-seed an empty `## [Unreleased]` stub above it, and update the compare/tag link refs at the bottom (`[Unreleased]: …compare/vX.Y.Z...HEAD`, add `[X.Y.Z]: …/releases/tag/vX.Y.Z`).
  - Keep this separate from `todo/done.md` (phase tracker, not release notes).
- **Sanity-check:** `moon run root:version-check` (lockstep invariant still holds — patches may differ, `MAJOR.MINOR` must not).
- **Commit the draft:** `chore(release): prepare vX.Y.Z` (changelog + version bumps), with the required `Co-Authored-By` trailer. Do **not** tag, do **not** push.

## 6 · Hand off
Report, terse:
- the proposed **version** + the bump level and what triggered it;
- the **branch** name and that the bumps + changelog are committed as a draft;
- a preview of the drafted changelog section;
- anything still ambiguous the human should eyeball;
- the next step: review the branch, then run **`/release-complete`** to finalise
  (tag, push, GitHub Release). Nothing irreversible has happened yet — `git switch main && git branch -D release/vX.Y.Z` discards it cleanly.
