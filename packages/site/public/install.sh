#!/bin/sh
# midnite installer — macOS (Apple Silicon) and Linux (x86_64)
#
#   curl -fsSL https://midnite-app.vercel.app/install.sh | sh
#
# Windows: irm https://midnite-app.vercel.app/install.ps1 | iex
#
# macOS: downloads the latest release .zip with curl and installs it to
# /Applications. Because curl (unlike a browser) never sets the
# com.apple.quarantine attribute, the app opens normally on first launch — no
# Gatekeeper "unverified app" popup.
#
# Robust by design: the app is staged and integrity-checked (Info.plist +
# full-size Electron Framework) BEFORE it replaces the installed copy, then
# swapped in atomically with the previous version kept as a backup until the new
# one verifies. An interrupted download or copy can never leave a broken app in
# /Applications — the exact failure that a plain `ditto` install can silently
# produce (missing Frameworks → dyld "Library not loaded" crash on launch).
#
# Linux: downloads the latest release .AppImage, installs it to
# ~/.local/bin/midnite.AppImage, and writes a small `midnite` launcher wrapper
# alongside it (falls back to `--appimage-extract-and-run` when FUSE isn't
# available — common on distros that dropped libfuse2 by default) plus a
# best-effort .desktop entry so it shows up in app launchers.
#
# Options (environment variables):
#   MIDNITE_VERSION=0.5.0   install a specific version instead of the latest
#   MIDNITE_NO_OPEN=1       don't launch the app after installing

set -eu

REPO="bilo-io/midnite-app"
APP="midnite.app"
DEST="/Applications"
# The framework binary is ~150MB; a truncated copy is the failure we guard
# against, so treat anything under 100MB as incomplete.
MIN_FRAMEWORK_BYTES=104857600

say() { printf '%s\n' "$*"; }
fail() {
  printf 'error: %s\n' "$*" >&2
  exit 1
}

OS="$(uname -s)"
case "$OS" in
  Darwin | Linux) : ;;
  *) fail "this installer supports macOS and Linux only. Windows: irm https://midnite-app.vercel.app/install.ps1 | iex" ;;
esac

# Verify a .app bundle is structurally complete. $1 = bundle path.
# Returns non-zero (logging what's missing) for a partial/truncated bundle.
verify_bundle() {
  _b="$1"
  [ -f "$_b/Contents/Info.plist" ] || { echo "  missing Contents/Info.plist" >&2; return 1; }
  [ -x "$_b/Contents/MacOS/midnite" ] || { echo "  missing Contents/MacOS/midnite" >&2; return 1; }
  _fw="$_b/Contents/Frameworks/Electron Framework.framework/Versions/A/Electron Framework"
  [ -f "$_fw" ] || { echo "  missing Electron Framework" >&2; return 1; }
  _sz=$(stat -f%z "$_fw" 2>/dev/null || echo 0)
  [ "$_sz" -gt "$MIN_FRAMEWORK_BYTES" ] ||
    { echo "  Electron Framework is only ${_sz} bytes — incomplete copy" >&2; return 1; }
  return 0
}

# ── Preflight (shared) ───────────────────────────────────────────────────────
command -v curl >/dev/null 2>&1 || fail "curl is required."

# ── Resolve version (shared) ─────────────────────────────────────────────────
if [ -n "${MIDNITE_VERSION:-}" ]; then
  version="${MIDNITE_VERSION#v}"
else
  # releases/latest redirects to releases/tag/vX.Y.Z — read the final URL.
  latest_url=$(curl -fsSL -o /dev/null -w '%{url_effective}' "https://github.com/$REPO/releases/latest") ||
    fail "could not reach github.com to resolve the latest release."
  tag="${latest_url##*/}"
  version="${tag#v}"
  [ -n "$version" ] && [ "$version" != "latest" ] || fail "could not determine the latest version from $latest_url"
fi

if [ "$OS" = "Linux" ]; then
  [ "$(uname -m)" = "x86_64" ] || fail "midnite ships x86_64 Linux builds only, and this machine reports $(uname -m)."

  asset="midnite-${version}-x86_64.AppImage"
  url="https://github.com/$REPO/releases/download/v${version}/${asset}"

  bindir="$HOME/.local/bin"
  mkdir -p "$bindir"
  tmp=$(mktemp -d)
  trap 'rm -rf "$tmp"' EXIT

  say "Downloading midnite v${version} …"
  curl -fL --progress-bar "$url" -o "$tmp/$asset" || fail "download failed: $url"
  chmod +x "$tmp/$asset"

  appimage="$bindir/midnite.AppImage"
  # Quit a running copy first so the file can be replaced.
  pkill -f "$appimage" >/dev/null 2>&1 || true
  mv -f "$tmp/$asset" "$appimage"

  # A thin wrapper (not the raw AppImage) is what we put on PATH as `midnite`,
  # so a system without FUSE (common on distros that dropped libfuse2 by
  # default) falls back to --appimage-extract-and-run instead of just failing.
  wrapper="$bindir/midnite"
  cat > "$wrapper" <<WRAPPER
#!/bin/sh
exec "$appimage" --no-sandbox "\$@" || exec "$appimage" --appimage-extract-and-run --no-sandbox "\$@"
WRAPPER
  chmod +x "$wrapper"

  # Best-effort desktop-menu integration: extract the AppImage's own icon so the
  # launcher entry doesn't need a separately-hosted asset.
  apps_dir="$HOME/.local/share/applications"
  icons_dir="$HOME/.local/share/icons"
  mkdir -p "$apps_dir" "$icons_dir"
  (
    cd "$tmp" && "$appimage" --appimage-extract >/dev/null 2>&1
  ) || true
  if [ -f "$tmp/squashfs-root/.DirIcon" ]; then
    cp "$tmp/squashfs-root/.DirIcon" "$icons_dir/midnite.png" 2>/dev/null || true
  fi
  cat > "$apps_dir/midnite.desktop" <<DESKTOP
[Desktop Entry]
Type=Application
Name=midnite
Exec=$wrapper %U
Icon=$icons_dir/midnite.png
Terminal=false
Categories=Development;
DESKTOP

  case ":$PATH:" in
    *":$bindir:"*) ;;
    *) say "Add $bindir to your PATH to run 'midnite' from a terminal (e.g. add 'export PATH=\"$bindir:\$PATH\"' to your shell profile)." ;;
  esac

  say ""
  say "✓ midnite v${version} installed: $wrapper"
  if [ -z "${MIDNITE_NO_OPEN:-}" ]; then
    "$wrapper" >/dev/null 2>&1 &
    disown 2>/dev/null || true
  else
    say "Launch it with: $wrapper"
  fi
  exit 0
fi

# ── macOS ────────────────────────────────────────────────────────────────────
[ "$(uname -m)" = "arm64" ] || fail "midnite ships Apple Silicon (arm64) builds only, and this Mac reports $(uname -m)."

asset="midnite-${version}-arm64.zip"
url="https://github.com/$REPO/releases/download/v${version}/${asset}"

tmp=$(mktemp -d)
staged="$DEST/.$APP.new.$$"
backup="$DEST/.$APP.old.$$"
# Best-effort cleanup of the temp dir and any staging leftovers on exit.
cleanup() {
  rm -rf "$tmp" 2>/dev/null || true
  [ -e "$staged" ] && { rm -rf "$staged" 2>/dev/null || sudo rm -rf "$staged" 2>/dev/null || true; }
}
trap cleanup EXIT

say "Downloading midnite v${version} …"
curl -fL --progress-bar "$url" -o "$tmp/$asset" || fail "download failed: $url"

# ditto (not unzip/cp) preserves the code-signing seal and extended attributes.
ditto -xk "$tmp/$asset" "$tmp/extracted" || fail "could not extract $asset — the download may be corrupt. Re-run the installer."
[ -d "$tmp/extracted/$APP" ] || fail "archive did not contain $APP"

# Gate on a complete download BEFORE touching /Applications — a truncated
# download/extract stops here instead of installing a broken app.
say "Verifying download …"
verify_bundle "$tmp/extracted/$APP" ||
  fail "the downloaded app is incomplete (interrupted download?). Nothing was installed — re-run the installer."

# ── Install (staged + atomic) ────────────────────────────────────────────────
# Quit a running copy so the bundle can be replaced (best-effort).
if pgrep -xq "midnite" 2>/dev/null; then
  say "Quitting the running midnite …"
  osascript -e 'tell application "midnite" to quit' >/dev/null 2>&1 || true
  sleep 2
fi

# Elevate only if /Applications isn't writable by this user.
SUDO=""
if [ -w "$DEST" ] && { [ ! -e "$DEST/$APP" ] || [ -w "$DEST/$APP" ]; }; then
  :
else
  say "(administrator password needed to write to $DEST)"
  SUDO="sudo"
fi
run() { if [ -n "$SUDO" ]; then sudo "$@"; else "$@"; fi; }

say "Installing to $DEST/$APP …"
run rm -rf "$staged" "$backup"
# Stage on the SAME volume as $DEST so the final swap is an atomic rename.
run ditto "$tmp/extracted/$APP" "$staged"
verify_bundle "$staged" || { run rm -rf "$staged"; fail "staged copy is incomplete — $DEST left untouched."; }

# Swap: move the old copy aside, rename the staged one into place.
if [ -e "$DEST/$APP" ]; then run mv "$DEST/$APP" "$backup"; fi
if ! run mv "$staged" "$DEST/$APP"; then
  [ -e "$backup" ] && run mv "$backup" "$DEST/$APP"
  fail "could not move the new app into place — previous copy restored."
fi

# Final integrity check on the live bundle; restore the backup if it fails.
if ! verify_bundle "$DEST/$APP"; then
  run rm -rf "$DEST/$APP"
  [ -e "$backup" ] && run mv "$backup" "$DEST/$APP"
  fail "installed bundle failed verification — previous copy restored."
fi
run rm -rf "$backup"

# curl doesn't quarantine, but clear the bit defensively (e.g. re-runs over a
# browser-downloaded copy). Best-effort: the attribute usually isn't there.
run xattr -dr com.apple.quarantine "$DEST/$APP" 2>/dev/null || true

# ── Optional CLI symlink ─────────────────────────────────────────────────────
cli="$DEST/$APP/Contents/Resources/bin/midnite"
if [ -e "$cli" ]; then
  if [ -d /usr/local/bin ] && [ -w /usr/local/bin ]; then
    ln -sf "$cli" /usr/local/bin/midnite
    say "Linked the midnite CLI: /usr/local/bin/midnite"
  else
    say "To put the midnite CLI on your PATH:"
    say "  sudo ln -sf \"$cli\" /usr/local/bin/midnite"
  fi
fi

say ""
say "✓ midnite v${version} installed."
if [ -z "${MIDNITE_NO_OPEN:-}" ]; then
  open "$DEST/$APP"
else
  say "Launch it with: open -a midnite"
fi
