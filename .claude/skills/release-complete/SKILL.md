---
name: release-complete
description: Finalise a prepped release/vX.Y.Z branch — verify preconditions, commit chore(release), create the tag(s) per the scheme, push, merge the release PR to main, and cut the GitHub Release from the changelog. The IRREVERSIBLE half of the two-step flow; run only after a human has reviewed the /release-prep branch.
argument-hint: "(run on the release/vX.Y.Z branch that /release-prep prepared)"
allowed-tools: Bash, Read, Edit, AskUserQuestion, Agent
---

Execute a prepped midnite release: the irreversible half of the two-step flow
([`docs/RELEASING.md`](../../../docs/RELEASING.md) §2). Runs **after** a human has
reviewed the `release/vX.Y.Z` branch that [`/release-prep`](../release-prep/SKILL.md)
left. Tags, pushes, merges to `main`, and cuts a GitHub Release — so it **stops for
explicit confirmation before the first irreversible step** and refuses to run if
preconditions aren't met.

**Policy + math are fixed**, in the tested helpers — don't re-derive them:
- tag scheme = `planReleaseTags` (lockstep `vX.Y.Z` vs scoped `‹pkg›@X.Y.Z`);
- bump math = `planVersionBump`; lockstep invariant = `sharesLockstepMajorMinor`;
- changelog section = `extractChangelogSection`; branch→version = `versionFromReleaseBranch`.
All in [`packages/shared/src/release.ts`](../../../packages/shared/src/release.ts) +
[`version.ts`](../../../packages/shared/src/version.ts).

**Style:** terse — report the checks + the plan, then act once confirmed.

## 1 · Preconditions — refuse if any fail
Gather, and **stop with a clear message** on the first failure (nothing has changed yet):
- **On a release branch:** current branch = `release/vX.Y.Z`; derive `X.Y.Z` with `versionFromReleaseBranch` (`git rev-parse --abbrev-ref HEAD`). Not a release branch → tell the user to run `/release-prep` first.
- **Clean tree:** `git status --porcelain` empty.
- **In sync:** `git fetch origin`; the branch's `main` base isn't ahead in a way that conflicts (rebase/merge `main` first if so).
- **Versions match the branch:** read every `package.json`; for a lockstep release every package is `X.Y.0`; for a patch the bumped package(s) are `X.Y.Z`. `moon run root:version-check` passes (shared MAJOR.MINOR).
- **Changelog ready:** `extractChangelogSection(CHANGELOG.md, 'X.Y.Z')` returns a section with a non-null `date` (a dated `## [X.Y.Z] - YYYY-MM-DD`) and a non-empty body. An undated/`Unreleased`-only changelog means `/release-prep` wasn't finished — stop.
- **Green:** `moon ci` passes. (Run it; don't trust a stale cache for the gate.)

## 2 · Plan the tags & show the go/no-go — STOP for the human
- Compute the tag(s): `planReleaseTags(previousVersions, currentVersions)` — `previousVersions` from the last `v*` tag's tree (`git show ‹lastTag›:package.json` etc.), `currentVersions` from the working tree. Expect `['vX.Y.Z']` for a lockstep release or `['‹pkg›@X.Y.Z', …]` for a patch.
- **AskUserQuestion** with the full plan and an explicit go/no-go (recommended option = proceed only if every precondition passed): the version, the tag(s), the changelog section that will become the GitHub Release body, and that this will tag + push + merge to `main` + publish a Release. Do **not** proceed without an affirmative.

## 3 · Commit + tag (first irreversible step)
- **Emit the version manifest** (Phase 71 Theme G): run `moon run root:emit-version-manifest` (or `node scripts/emit-version-manifest.mjs`). It rewrites [`packages/web/public/version.json`](../../../packages/web/public/version.json) to the bumped **web** version — the runtime "latest version" a running client polls. The release flow is the **single writer** of this file; `moon run root:version-check` fails if it's left stale. Stage it so it lands in the **same** `chore(release)` commit as the version bump (amend that commit if the prep branch already created it without the manifest), keeping the manifest and the version atomic.
- If `/release-prep` left version bumps uncommitted (it shouldn't), or the changelog still shows `## [Unreleased]` instead of the dated section, finalise: re-run `planVersionBump` to confirm the bumps are lockstep, move `## [Unreleased]` → `## [X.Y.Z] - YYYY-MM-DD` (today). Commit `chore(release): vX.Y.Z` (including `packages/web/public/version.json`) with the required `Co-Authored-By` trailer. (Usually the prep branch already has this commit — if so, re-emit the manifest and amend it in.)
- Create the tag(s) from `planReleaseTags`: `git tag vX.Y.Z` (annotated: `-a -m "vX.Y.Z"`), or each scoped `git tag '‹pkg›@X.Y.Z'`.

## 4 · Publish
- **Push** the branch and the tag(s): `git push origin release/vX.Y.Z` then `git push origin ‹tag›` (pushing a `v*` tag triggers [`release.yml`](../../../.github/workflows/release.yml) — the desktop build + a **draft** GitHub Release; see below).
- **Merge to main:** open the release PR if one isn't open (`gh pr create --base main --title 'chore(release): vX.Y.Z' --body …`), wait for CI, then `gh pr merge --squash` (or `--merge` to preserve the release commit — prefer **merge** here so the tagged commit stays on `main`).
- **GitHub Release:** create it from the changelog section — `gh release create vX.Y.Z --title 'vX.Y.Z' --notes "‹extractChangelogSection body›"`. If `release.yml` already opened a **draft** Release for the pushed tag, **edit** that draft instead (`gh release edit vX.Y.Z --draft=false --notes …`) so the desktop installers it attached are kept. For scoped patch tags (no `v*`), cut the Release against the scoped tag.

## 5 · Re-seed + confirm
- Re-seed an empty `## [Unreleased]` stub above the released section in `CHANGELOG.md` and refresh the compare link (`[Unreleased]: …/compare/vX.Y.Z...HEAD`), if `/release-prep` didn't. Commit on `main` (`docs(changelog): re-seed Unreleased after vX.Y.Z`).
- Report, terse: the **released version**, the **tag(s)**, the **Release URL** (`gh release view vX.Y.Z --json url`), the merge commit, and that `## [Unreleased]` is reset. Note the desktop-build workflow status if a `v*` tag was pushed.

## Notes
- **Out of scope:** publishing packages to a registry (private monorepo) — tags + GitHub Release only.
- **Abort cleanly before §3:** nothing is irreversible until the first tag/push. If the human says no at §2, leave the branch as-is.
- **If a push or merge fails midway:** report exactly what landed (tag created? pushed? merged?) so the human can finish by hand — never silently retry a partial publish.
