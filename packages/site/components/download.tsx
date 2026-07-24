'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';

import { InstallCommand } from '@/components/install-command';
import { MAC_INSTALL_COMMAND } from '@/lib/downloads';

// macOS installs via the curl one-liner (no Gatekeeper popup — see
// lib/downloads.ts); we detect the OS only to nudge non-Mac visitors to the
// /download page, which carries the Windows/Linux builds.
export function Download() {
  const [isMac, setIsMac] = useState(true);
  useEffect(() => {
    setIsMac(/Mac/i.test(navigator.userAgent));
  }, []);

  return (
    <section id="download" className="container scroll-mt-20 py-24">
      <div className="mx-auto max-w-2xl text-center">
        <h2 className="bg-gradient-to-br from-foreground to-foreground/60 bg-clip-text text-3xl font-semibold tracking-tight text-transparent sm:text-4xl">
          Install midnite
        </h2>
        <p className="mt-4 text-muted-foreground">
          The gateway and the board, bundled into one desktop app that runs entirely on your
          machine. One command on macOS — paste it into a terminal:
        </p>

        <div className="mx-auto mt-8 max-w-xl">
          <InstallCommand command={MAC_INSTALL_COMMAND} />
        </div>

        <p className="mx-auto mt-4 max-w-md text-xs leading-relaxed text-muted-foreground">
          Installs to /Applications with no Gatekeeper warnings, and links the{' '}
          <code className="rounded bg-muted px-1 py-0.5">midnite</code> CLI. Re-run the same
          command any time to update.
        </p>

        {!isMac && (
          <p className="mt-4 text-sm text-muted-foreground">
            Looks like you&apos;re not on macOS — grab the Windows or Linux build below.
          </p>
        )}

        <p className="mt-6">
          <Link
            href="/download"
            className="text-sm text-foreground underline-offset-4 hover:underline"
          >
            All platforms (Windows &amp; Linux too) →
          </Link>
        </p>
      </div>
    </section>
  );
}
