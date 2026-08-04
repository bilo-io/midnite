'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';

import { InstallCommand } from '@/components/install-command';
import { PLATFORM_INSTALL_COMMAND, type Platform } from '@/lib/downloads';
import { detectPlatform } from '@/lib/platform';

const PLATFORM_INTRO: Record<Platform, string> = {
  mac: 'One command on macOS — paste it into a terminal:',
  windows: 'One command on Windows — paste it into PowerShell:',
  linux: 'One command on Linux — paste it into a terminal:',
};

const PLATFORM_CAPTION: Record<Platform, string> = {
  mac: 'Installs to /Applications with no Gatekeeper warnings, and links the Midnite CLI. Re-run the same command any time to update.',
  windows: 'Installs silently, no SmartScreen prompt. Re-run the same command any time to update.',
  linux: 'Installs to ~/.local/bin with a desktop-menu entry. Re-run the same command any time to update.',
};

// Every platform installs via its own copyable one-liner (see lib/downloads.ts)
// — detect the OS so the landing page shows the right one instead of always
// defaulting to macOS.
export function Download() {
  // null until mounted (SSR-safe) so the server-rendered markup always shows macOS.
  const [detected, setDetected] = useState<Platform | null>(null);
  useEffect(() => {
    const uaData = (navigator as Navigator & { userAgentData?: { platform?: string } })
      .userAgentData;
    setDetected(detectPlatform(navigator.userAgent, uaData?.platform));
  }, []);

  const platform: Platform = detected ?? 'mac';

  return (
    <section id="download" className="container scroll-mt-20 py-24">
      <div className="mx-auto max-w-2xl text-center">
        <h2 className="bg-gradient-to-br from-foreground to-foreground/60 bg-clip-text text-3xl font-semibold tracking-tight text-transparent sm:text-4xl">
          Install Midnite
        </h2>
        <p className="mt-4 text-muted-foreground">
          The gateway and the board, bundled into one desktop app that runs entirely on your
          machine. {PLATFORM_INTRO[platform]}
        </p>

        <div className="mx-auto mt-8 max-w-xl">
          <InstallCommand command={PLATFORM_INSTALL_COMMAND[platform]} />
        </div>

        <p className="mx-auto mt-4 max-w-md text-xs leading-relaxed text-muted-foreground">
          {PLATFORM_CAPTION[platform]}
        </p>

        <p className="mt-6">
          <Link
            href="/download"
            className="text-sm text-foreground underline-offset-4 hover:underline"
          >
            All platforms →
          </Link>
        </p>
      </div>
    </section>
  );
}
