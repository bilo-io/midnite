# Phase 29 — Releases, versioning & the change log

> midnite ships as a moon/pnpm monorepo of seven packages (`shared`, `gateway`, `cli`, `web`, `site`, `desktop`, `ui`) but has **no release process**: every `package.json` is pinned at `0.0.0`, the only git tag is `v0.0.0`, there is no root `CHANGELOG.md`, and nothing maps the steady stream of merged PRs to a versioned, documented release. Phase 29 puts that in place — a **lockstep versioning policy**, a curated root change log, and two skills (`/release-prep` for analysis, `/release-complete` for execution) so cutting a release is a repeatable two-step, not a manual scramble.

> **The versioning rule (the core decision, set by the user).** All packages move their **major and minor in lockstep** — at any moment every package shares the same `MAJOR.MINOR`. Only the **patch** advances **independently** per package (a `cli`-only fix can ship `0.3.1` while `web` stays `0.3.0`). So a package version is `‹global major›.‹global minor›.‹per-package patch›`. A minor/major release moves **every** package to the new `MAJOR.MINOR.0`; a patch release bumps only the affected package(s).

> **Scope guardrails (CLAUDE.md).** No new runtime wire shapes — this is tooling + process. Versioning logic lives in a small, unit-tested gateway-independent script (pure `*/lib`-style helper for the bump math) plus the two skills; the skills orchestrate `git`/`gh`/`pnpm`, they don't hide business logic. Conventional commits (already the house style) are the input. Prefer hand-rolled over adopting `changesets`/`semantic-release` — neither models "lockstep major.minor + independent patch" cleanly (Decision §5).

> Effort tags: **S** small · **M** medium · **L** large. Themes are ordered **A → B → C → D** (policy + the version-sync tool gate the skills; `/release-prep` gates `/release-complete`). Every box starts unchecked — net-new work.

---

## Current state (baseline to build on)

- **Versions:** root `midnite` + all 7 `@midnite/*` packages are `0.0.0` (already trivially lockstep). No per-package version drift to reconcile.
- **Tags:** a single `v0.0.0`. No release branches, no GitHub Releases.
- **Change log:** none at the root; history lives only in conventional-commit subjects and `todo/done.md` (which tracks *phase* work, not user-facing releases — distinct artifacts).
- **Commits:** conventional commits enforced by convention (CLAUDE.md): `feat`/`fix`/`refactor`/`docs`/`chore`/`test`, package-scoped (`feat(gateway): …`). This is the categorisation signal for both the changelog and the bump decision.
- **Skills:** project commands live in [`.claude/commands/`](../.claude/commands/) (`brainstorm.md`, `execute-phase.md`) — markdown command files. The two new skills land here.
- **CI:** `moon ci` on every PR. A release must not weaken it; any release-time check (version-lockstep invariant) should also be runnable in CI.

---

## Theme A — Versioning policy + the lockstep tool — **M**

The rule, encoded once so humans and skills agree.

### A1. Document the policy — **S** — ✅ DONE (PR #85, 2026-06-22)
- [x] A short [`docs/RELEASING.md`](../docs/RELEASING.md): the lockstep `MAJOR.MINOR` + independent `PATCH` rule, what triggers each bump (below), the tag scheme (A3), and the two-skill flow. Linked from the README and [`CLAUDE.md`](../CLAUDE.md) (a new "Releases" subsection).
- [x] Bump triggers (from conventional commits since the last release): a `feat` (or any `feat`/`fix` carrying a `BREAKING CHANGE`) → **major**; any other `feat` → **minor** (lockstep, all packages); `fix`-only → **patch** of just the packages whose files changed; `docs`/`chore`/`refactor`/`test`-only → **no release** (unless they touch shipped output). (Decision §1/§2.) Documented as a trigger table.

### A2. Version-sync helper + check — **M** — ✅ DONE (PR #66, 2026-06-21)
- [x] Pure helper [`packages/shared/src/version.ts`](../packages/shared/src/version.ts) — `planVersionBump(current, { level, changedPackages })` (major/minor move all packages in lockstep; patch bumps only the changed packages; idempotent on `none`; throws if input isn't in lockstep) + `sharesLockstepMajorMinor`. 12 unit tests.
- [x] [`scripts/version-check.mjs`](../scripts/version-check.mjs) + a workspace-root `root:version-check` moon task (new root [`moon.yml`](../moon.yml), registered in [`.moon/workspace.yml`](../.moon/workspace.yml)) — asserts every `package.json` shares one `MAJOR.MINOR` (patch may differ), names divergers, runs once in `moon ci`. Passes on the current all-`0.0.0` tree.

### A3. Tag & branch scheme — **S** — ✅ DONE (PR #85, 2026-06-22)
- [x] **Decision §3:** a minor/major release cuts a single repo tag `vMAJOR.MINOR.0` (lockstep); an independent package patch cuts a scoped tag `@midnite/‹pkg›@MAJOR.MINOR.PATCH`. Release work happens on a `release/vX.Y.Z` branch, merged via a release PR. Documented in [`docs/RELEASING.md`](../docs/RELEASING.md), including that a `v*` tag push triggers the desktop-build + draft GitHub Release workflow.

> **Theme A complete** (A1 + A2 + A3); with Theme B (PR #80) the **policy half of Phase 29 is done**. Remaining: the `/release-prep` (C) + `/release-complete` (D) skills.

---

## Theme B — Root `CHANGELOG.md` — **S–M** — ✅ DONE (PR #80, 2026-06-22)

The curated, user-facing history. Seeded; per-release curation lands with `/release-prep` (Theme C).

- [x] A root [`CHANGELOG.md`](../CHANGELOG.md) in **Keep a Changelog** format, seeded with an `## [Unreleased]` section (curated highlights heading toward `0.1.0`) and a `## [0.0.0] - 2026-06-18` scaffold baseline + compare/tag links. Single root changelog (lockstep); the lockstep versioning note + the `/release-prep`→`/release-complete` flow are stated in the preamble. Linked from the README. (Decision §4.)
- [x] Entries are **curated from conventional commits**, not a raw `git log` dump. The Theme-B seed is high-level; `/release-prep` (Theme C) drafts the precise per-release section at release time. `done.md` (phase tracker) and `CHANGELOG.md` (release notes) stay **separate**.

---

## Theme C — `/release-prep` skill (analysis + prepare) — **M**

Everything up to (but not including) the irreversible commit/tag. Read-mostly; ends by handing the human a ready-to-finish release branch.

- [ ] New [`.claude/commands/release-prep.md`](../.claude/commands/release-prep.md). Flow:
  1. **Find the last release** — latest `v*` tag (and any scoped tags); compute the diff base.
  2. **Gather changes since** — `git log ‹base›..HEAD` parsed as conventional commits, categorised by type + scope → which packages changed; cross-reference **merged PRs** (`gh pr list --state merged --search 'merged:>‹tag-date›'`) for titles/context.
  3. **Propose the version** — run the A2 helper to compute the next version(s) under the lockstep rule; show the reasoning (what triggered major/minor/patch).
  4. **Draft the changelog** — write the new `CHANGELOG.md` section (grouped, curated) + bump the `package.json` versions on a fresh **`release/vX.Y.Z`** branch.
  5. **Ask follow-ups** — confirm the proposed version, surface anything ambiguous (uncategorised commits, a `feat` that's really a fix, notable user-facing notes to add), let the human adjust the changelog wording.
  6. **Stop before finalising** — leave the release branch with the changelog + version bumps committed as a **draft**, ready for `/release-complete`. No tag, no push-to-main, nothing irreversible.

## Theme D — `/release-complete` skill (execute) — **M**

The irreversible half, run after a human has reviewed the prepped branch.

- [ ] New [`.claude/commands/release-complete.md`](../.claude/commands/release-complete.md). Flow:
  1. **Preconditions** — on a `release/vX.Y.Z` branch, working tree clean, `version:check` + `moon ci` green, changelog `## [X.Y.Z]` section present and dated.
  2. **Finalise** — ensure version bumps are applied lockstep (re-run the A2 helper to be safe), move `Unreleased` → the dated section.
  3. **Commit + tag** — `chore(release): vX.Y.Z`, then the tag(s) per A3 (`vX.Y.Z` + any scoped patch tags).
  4. **Publish** — push the branch + tags, open/merge the release PR to `main`, and create a **GitHub Release** from the changelog section (`gh release create`). (Package **publishing to a registry** is out of scope — private monorepo; revisit if/when packages go public.)
  5. **Confirm** — print the released version, the tag, the release URL, and the next `Unreleased` stub re-seeded.

---

## Out of scope (named, not built here)

- **Publishing to npm / a registry** — packages aren't public; `/release-complete` tags + GitHub-Releases only. Add a publish step when a package goes public.
- **Adopting `changesets`/`semantic-release`** — evaluated and rejected (Decision §5): neither models lockstep-major.minor-with-independent-patch without fighting the tool.
- **Auto-deploy on tag** — CD wiring (deploy web/site/gateway on release) is a separate ops concern.
- **Backporting / release-train branches** — single-track releases off `main` for now.

---

## Files this phase touches (map)

- **docs:** new [`docs/RELEASING.md`](../docs/RELEASING.md); link from README + [`CLAUDE.md`](../CLAUDE.md). New root [`CHANGELOG.md`](../CHANGELOG.md).
- **tooling:** version-sync helper + tests (`scripts/version.ts` or `packages/shared/src/version/`); a `version:check` moon task wired into `moon ci` ([`.moon/tasks.yml`](../.moon/tasks.yml) + the relevant `moon.yml`).
- **skills:** [`.claude/commands/release-prep.md`](../.claude/commands/release-prep.md), [`.claude/commands/release-complete.md`](../.claude/commands/release-complete.md).
- **versions:** the seven `package.json` files (bumped by the skills, not by hand — `version:check` guards drift).
- **tracker:** append to [`done.md`](done.md) as slices land.

---

## Verification

- [ ] `version:check` fails when a `package.json` is hand-edited to break the shared `MAJOR.MINOR`, and passes on a clean lockstep set; it runs in `moon ci`.
- [ ] The A2 helper's unit tests cover: lockstep minor (all → `X.Y+1.0`), `fix`-only patch (only affected packages bump), mixed major>minor>patch precedence, empty set → no-op.
- [ ] `/release-prep` on a repo with commits since the last tag produces: a correct proposed version, a drafted `CHANGELOG.md` section, version bumps on a `release/vX.Y.Z` branch, and stops for confirmation without tagging.
- [ ] `/release-complete` on a prepped branch commits `chore(release): vX.Y.Z`, creates the tag(s), pushes, and opens a GitHub Release from the changelog — and refuses to run if preconditions (clean tree, green CI, dated changelog section) aren't met.
- [ ] `moon run :typecheck` · `:lint` · `:test` + `moon ci` green.

---

## Decisions / open questions

1. **Lockstep major.minor, independent patch** *(set by user — firm).* Every package shares `MAJOR.MINOR`; `PATCH` is per-package. A minor/major release moves all packages to `X.Y.0`.
2. **Bump trigger from conventional commits** *(recommend).* `BREAKING CHANGE` → major; `feat` → minor (lockstep); `fix`-only → patch of affected packages; docs/chore/refactor/test-only → no release. Confirm the exact mapping in the A1 PR.
3. **Tag scheme** *(recommend).* Lockstep release → `vX.Y.Z`; independent package patch → `@midnite/‹pkg›@X.Y.Z`. Release branch `release/vX.Y.Z`.
4. **One root changelog** *(set by user — firm).* Single `CHANGELOG.md` at the root; per-package patch notes inline. Keep separate from `todo/done.md`.
5. **Hand-rolled vs changesets** *(recommend: hand-rolled).* The lockstep+independent-patch hybrid doesn't map onto `changesets` (fixed *or* independent) or `semantic-release` cleanly; a small tested helper + the two skills is simpler and exact. Revisit only if releases get frequent enough to want a tool.
6. **Patch independence vs the `version:check` invariant** *(open).* `version:check` asserts shared `MAJOR.MINOR` only — it must *allow* differing patches. Confirm the check compares the `MAJOR.MINOR` prefix, not the full version.
7. **First real release** *(open).* Whether Phase 29 itself cuts `v0.1.0` (the first non-zero release) once the tooling exists, or leaves that to a follow-up once more phases land. Recommend: ship the tooling, then cut `v0.1.0` as a deliberate, separate run.
