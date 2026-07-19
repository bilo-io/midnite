# Desktop downloads (public distribution from a private repo)

`bilo-io/midnite` is **private**, so its own GitHub Release assets are **not**
anonymously downloadable — a `releases/latest/download/…` link 404s for anyone
without repo access. To give the public site working per-platform downloads while
keeping the source private, desktop installers are published to a separate **public**
companion repo:

> **[`bilo-io/midnite-app`](https://github.com/bilo-io/midnite-app)** — holds only the
> built binaries (no source) and doubles as the public **issue tracker**.

```
private bilo-io/midnite (source)
  └─ tag vX.Y.Z pushed → .github/workflows/release.yml
        builds .dmg / .exe / .AppImage on macOS / Windows / Linux
        └─ publishes a GitHub Release → PUBLIC bilo-io/midnite-app
                                          releases/latest/download/midnite-X.Y.Z-*.dmg
site download buttons → github.com/bilo-io/midnite-app/releases/latest/download/…
```

The site funnels every public GitHub link through `GITHUB_URL` in
[`packages/site/lib/site.ts`](../packages/site/lib/site.ts) (now `…/midnite-app`), and
the per-platform asset names come from `DESKTOP_VERSION` in
[`packages/site/lib/downloads.ts`](../packages/site/lib/downloads.ts) — keep that in
step with the released tag.

---

## One-time setup

Done once; thereafter only the per-release steps matter.

### 1. Create the public companion repo

```bash
gh repo create bilo-io/midnite-app --public \
  --description "midnite — desktop downloads & issue tracker" \
  --add-readme
```

Issues are on by default. The release needs a default branch (the README commit)
for its auto-created tag to attach to.

### 2. Mint a fine-grained PAT (browser only — can't be done from the CLI)

The default `GITHUB_TOKEN` in Actions is scoped to the current (private) repo, so it
can't publish into `midnite-app`. Create a token that can:

1. <https://github.com/settings/tokens?type=beta> → **Generate new token**.
2. **Resource owner:** `bilo-io`.
3. **Repository access:** *Only select repositories* → **`midnite-app`**.
4. **Repository permissions:** **Contents → Read and write**.
5. Generate and copy the token.

### 3. Store it as a secret on the private repo

```bash
gh secret set RELEASES_REPO_TOKEN --repo bilo-io/midnite   # paste the PAT when prompted
```

[`release.yml`](../.github/workflows/release.yml) reads this as
`secrets.RELEASES_REPO_TOKEN`.

---

## Cutting a release (per release)

Releases follow the two-step flow in [`RELEASING.md`](./RELEASING.md)
(`/release-prep` → `/release-complete`). The download-specific parts:

1. Bump every `package.json` to the new `X.Y.0` (lockstep — `node scripts/version-check.mjs`
   must pass) **and** set `DESKTOP_VERSION` in
   [`packages/site/lib/downloads.ts`](../packages/site/lib/downloads.ts) to match, so the
   asset filenames (`midnite-X.Y.Z-arm64.dmg`, …) line up.
2. Merge the release PR to `main`.
3. Tag and push — this is what triggers the build + publish:
   ```bash
   git fetch origin && git tag -a vX.Y.Z origin/main -m "vX.Y.Z"
   git push origin vX.Y.Z
   gh run watch --repo bilo-io/midnite
   ```
4. The workflow builds on all four runners and publishes a **published** (non-draft)
   Release with the installers to `bilo-io/midnite-app`. Optionally replace the
   auto-generated notes with the curated changelog section:
   ```bash
   gh release edit vX.Y.Z --repo bilo-io/midnite-app --notes "$(…changelog section…)"
   ```

## Verify

Logged out / incognito (the original failure mode):

```bash
curl -IL https://github.com/bilo-io/midnite-app/releases/latest/download/midnite-X.Y.Z-arm64.dmg   # → 200, not 404
# repeat for -x64.dmg, -x64.exe, -x64.AppImage
gh release view vX.Y.Z --repo bilo-io/midnite-app --json url,assets
```

Then load the deployed site `/download` page — platform detection picks the visitor's
OS and every button resolves to a real installer.

---

## Public raw-asset mirror

A few files are fetched anonymously over **GitHub-raw** by shipped clients, so they must
stay reachable even after this repo goes private:

| File | Fetched by |
| --- | --- |
| `CHANGELOG.md` | web release-notes popover |
| `packages/web/public/version.json` | CLI update check · desktop force-update floor |
| `packages/web/public/version.beta.json` (when present) | desktop beta-channel floor |

[`sync-public-assets.yml`](../.github/workflows/sync-public-assets.yml) mirrors these into
**`bilo-io/midnite-app`** (path-preserving) on every `main` push that touches them — so the
raw URLs differ from the source only by the repo slug and keep resolving anonymously. It
reuses the same **`RELEASES_REPO_TOKEN`** PAT as `release.yml` (no new secret). Run it once
via **Actions → Sync public assets → Run workflow** to seed the initial backfill; thereafter
it's automatic. The client fetch URLs already point at the public mirror
([`site-links.ts`](../packages/web/lib/site-links.ts), [`version-check.ts`](../packages/cli/src/lib/version-check.ts),
[`floor.ts`](../packages/desktop/src/updates/floor.ts)).

---

## Notes & follow-ups

- **Builds are unsigned.** macOS shows a Gatekeeper warning on first open; the site
  documents the `xattr -dr com.apple.quarantine …` workaround. Signing + notarization
  (`CSC_LINK` / `APPLE_ID` / …) is stubbed in
  [`packages/desktop/electron-builder.yml`](../packages/desktop/electron-builder.yml).
- **Auto-update** (electron-updater) would point its GitHub provider at `midnite-app`
  once wired.
- **`/release-complete` skill:** `.claude/skills/release-complete/SKILL.md` §4–§5 still
  describe creating/editing a Release in *this* repo. Update them to
  `gh release … --repo bilo-io/midnite-app` and to never create a Release in the private
  repo. (`RELEASING.md` already reflects the cross-repo flow.)
- **Site copy:** the home `Download` section still reads "macOS only for now" while the
  build + `/download` page cover Windows + Linux — update once a release is confirmed.
