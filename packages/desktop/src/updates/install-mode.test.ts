import { describe, expect, it } from 'vitest';

import { isManualInstallCodesign } from './install-mode';

// Trimmed real-world shapes of `codesign --display --verbose=2` output (it
// prints to stderr). Only the lines the parser reads are kept.

const ADHOC_OUTPUT = `Executable=/Applications/midnite.app/Contents/MacOS/midnite
Identifier=earth.ekko.midnite
Format=app bundle with Mach-O thin (arm64)
CodeDirectory v=20400 size=764 flags=0x2(adhoc) hashes=13+7 location=embedded
Signature=adhoc
Info.plist entries=27
Sealed Resources version=2 rules=13 files=1234`;

const LINKER_SIGNED_OUTPUT = `Executable=/Applications/midnite.app/Contents/MacOS/midnite
CodeDirectory v=20400 size=764 flags=0x20002(adhoc,linker-signed) hashes=13+7 location=embedded
Signature=adhoc`;

const DEVELOPER_ID_OUTPUT = `Executable=/Applications/midnite.app/Contents/MacOS/midnite
Identifier=earth.ekko.midnite
Format=app bundle with Mach-O thin (arm64)
CodeDirectory v=20400 size=764 flags=0x10000(runtime) hashes=13+7 location=embedded
Signature size=8980
Authority=Developer ID Application: Example Dev (A1B2C3D4E5)
Authority=Developer ID Certification Authority
Authority=Apple Root CA
Timestamp=24 Jul 2026 at 10:00:00
Info.plist entries=27`;

const UNSIGNED_OUTPUT = `/Applications/midnite.app: code object is not signed at all`;

describe('isManualInstallCodesign', () => {
  it('classifies an ad-hoc signature as manual-install', () => {
    expect(isManualInstallCodesign(ADHOC_OUTPUT)).toBe(true);
  });

  it('classifies a linker-signed (adhoc-flagged) build as manual-install', () => {
    expect(isManualInstallCodesign(LINKER_SIGNED_OUTPUT)).toBe(true);
  });

  it('classifies a completely unsigned bundle as manual-install', () => {
    expect(isManualInstallCodesign(UNSIGNED_OUTPUT)).toBe(true);
  });

  it('classifies a Developer ID signature as auto-updatable (not manual)', () => {
    expect(isManualInstallCodesign(DEVELOPER_ID_OUTPUT)).toBe(false);
  });

  it('treats empty/unreadable output as auto-updatable (fail-soft)', () => {
    expect(isManualInstallCodesign('')).toBe(false);
  });
});
