'use client';

import { useEffect, useState } from 'react';

import { InstallCommand } from '@/components/install-command';
import {
  DOWNLOAD_TARGETS,
  PLATFORM_INSTALL_COMMAND,
  PLATFORM_LABELS,
  PLATFORM_ORDER,
  assetUrl,
  type Platform,
} from '@/lib/downloads';
import { detectPlatform } from '@/lib/platform';

/** Per-platform caption under the copyable command — why this beats a raw download. */
const PLATFORM_CAPTION: Record<Platform, string> = {
  mac: 'Paste into a terminal — installs to /Applications with no Gatekeeper warnings, and re-running it updates in place. Apple Silicon only.',
  windows:
    'Paste into PowerShell — installs silently with no SmartScreen prompt, and re-running it updates in place. x64 only.',
  linux:
    'Paste into a terminal — installs to ~/.local/bin with a desktop-menu entry, and re-running it updates in place. x86_64 only.',
};

/**
 * Every platform installs via its own copyable one-liner instead of a direct
 * download link — mac/Linux avoid Gatekeeper quarantine / an unintegrated
 * bare .AppImage, Windows avoids the SmartScreen warning an unsigned .exe
 * triggers when downloaded through a browser. See lib/downloads.ts.
 */
function PlatformInstall({ platform }: { platform: Platform }) {
  return (
    <div className="text-left">
      <InstallCommand command={PLATFORM_INSTALL_COMMAND[platform]} />
      <p className="mt-3 text-xs leading-relaxed text-muted-foreground">
        {PLATFORM_CAPTION[platform]}
      </p>
    </div>
  );
}

export function DownloadPicker() {
  // null until mounted (SSR-safe): no platform is highlighted server-side.
  const [detected, setDetected] = useState<Platform | null>(null);

  useEffect(() => {
    const uaData = (navigator as Navigator & { userAgentData?: { platform?: string } })
      .userAgentData;
    setDetected(detectPlatform(navigator.userAgent, uaData?.platform));
  }, []);

  const featured: Platform = detected ?? 'mac';

  return (
    <div className="mx-auto max-w-3xl">
      {/* Detected platform — featured action. */}
      <div
        data-testid="featured"
        data-platform={featured}
        className="gradient-border overflow-hidden rounded-2xl"
      >
        <div className="rounded-2xl border border-border/60 bg-card/50 p-8 text-center backdrop-blur">
          <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
            {detected ? 'Recommended for you' : 'Choose your platform'}
          </p>
          <p className="mt-1 text-lg font-semibold tracking-tight">{PLATFORM_LABELS[featured]}</p>

          <div className="mx-auto mt-6 max-w-xl">
            <PlatformInstall platform={featured} />
          </div>
        </div>
      </div>

      {/* Every platform, so nobody is locked to the one they're on. */}
      <div className="mt-12">
        <h3 className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
          All platforms
        </h3>
        <ul className="mt-4 divide-y divide-border/60 overflow-hidden rounded-xl border border-border/60 bg-card/30">
          {PLATFORM_ORDER.map((p) => (
            <li key={p} data-platform={p} className="flex flex-col gap-2 p-4 transition-colors hover:bg-card/60">
              <span className="font-medium">{PLATFORM_LABELS[p]}</span>
              <InstallCommand command={PLATFORM_INSTALL_COMMAND[p]} />
            </li>
          ))}
        </ul>
      </div>

      <p className="mx-auto mt-8 max-w-lg text-center text-xs leading-relaxed text-muted-foreground">
        Prefer a manual download? Raw installers are on the{' '}
        {DOWNLOAD_TARGETS.map((t, i) => (
          <span key={t.platform}>
            {i > 0 && ' · '}
            <a
              href={assetUrl(t.assetName)}
              target="_blank"
              rel="noreferrer"
              className="text-foreground underline-offset-4 hover:underline"
            >
              {t.label} {t.ext}
            </a>
          </span>
        ))}
        . Browser downloads aren&apos;t blessed the same way the command above is, though: macOS
        quarantines the .dmg (allow it under{' '}
        <strong className="text-foreground">System Settings → Privacy &amp; Security → Open Anyway</strong>
        , or run{' '}
        <code className="rounded bg-muted px-1 py-0.5">
          xattr -dr com.apple.quarantine /Applications/midnite.app
        </code>
        ); Windows SmartScreen may block the unsigned .exe (right-click → Properties → Unblock, or
        run <code className="rounded bg-muted px-1 py-0.5">Unblock-File</code>); the Linux
        .AppImage just needs <code className="rounded bg-muted px-1 py-0.5">chmod +x</code> before
        you run it directly.
      </p>
    </div>
  );
}
