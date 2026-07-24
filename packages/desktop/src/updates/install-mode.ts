// Detecting whether this macOS build can auto-update (Phase 71 Theme E follow-up).
// Squirrel.Mac only installs an update signed with the SAME identity as the
// running app — an ad-hoc signature (what afterpack.cjs applies to unsigned
// builds) has no identity, so electron-updater's install step always fails.
// Those builds are distributed via the curl installer instead
// (bilo-io/midnite-app install.sh), and the banner offers that command.
//
// Pure parser (no electron import) so the classification is unit-testable in
// plain node; the main process feeds it `codesign --display --verbose=2` output.

/** `Signature=adhoc` — how codesign reports an ad-hoc (identity-less) signature. */
const ADHOC_SIGNATURE = /^Signature=adhoc\b/m;
/** The CodeDirectory flags also carry it, e.g. `flags=0x20002(adhoc,linker-signed)`. */
const ADHOC_FLAGS = /^CodeDirectory\b.*flags=0x[0-9a-f]+\([^)]*\badhoc\b[^)]*\)/im;
/** codesign's error for a bundle with no signature whatsoever. */
const UNSIGNED = /not signed at all/;

/**
 * True when `codesign --display --verbose=2` output describes a build that
 * electron-updater cannot update in place: ad-hoc signed or not signed at all.
 * A real Developer ID signature (an `Authority=…` chain) returns false.
 */
export function isManualInstallCodesign(output: string): boolean {
  return ADHOC_SIGNATURE.test(output) || ADHOC_FLAGS.test(output) || UNSIGNED.test(output);
}
