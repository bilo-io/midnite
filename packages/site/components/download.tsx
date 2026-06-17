'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Download as DownloadIcon } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { RELEASES_URL } from '@/lib/site';

// Apple Silicon vs Intel can't be told apart reliably from the browser (both
// report "MacIntel"), so we offer both builds and only detect the OS to nudge
// non-Mac visitors.
export function Download() {
  const [isMac, setIsMac] = useState(true);
  useEffect(() => {
    setIsMac(/Mac/i.test(navigator.userAgent));
  }, []);

  return (
    <section id="download" className="container scroll-mt-20 py-24">
      <div className="mx-auto max-w-2xl text-center">
        <h2 className="bg-gradient-to-br from-foreground to-foreground/60 bg-clip-text text-3xl font-semibold tracking-tight text-transparent sm:text-4xl">
          Download midnite
        </h2>
        <p className="mt-4 text-muted-foreground">
          The gateway and the board, bundled into one desktop app that runs entirely on your
          machine. macOS only for now.
        </p>

        <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
          <a href={RELEASES_URL} target="_blank" rel="noreferrer">
            <Button size="lg">
              <DownloadIcon className="mr-2 h-4 w-4" />
              Apple Silicon (.dmg)
            </Button>
          </a>
          <a href={RELEASES_URL} target="_blank" rel="noreferrer">
            <Button size="lg" variant="outline">
              <DownloadIcon className="mr-2 h-4 w-4" />
              Intel (.dmg)
            </Button>
          </a>
        </div>

        {!isMac && (
          <p className="mt-4 text-sm text-muted-foreground">
            Looks like you&apos;re not on macOS — desktop builds are macOS-only for now.
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

        <p className="mx-auto mt-8 max-w-md text-xs leading-relaxed text-muted-foreground">
          Builds are currently unsigned. On first open, right-click the app and choose{' '}
          <strong className="text-foreground">Open</strong>, or run{' '}
          <code className="rounded bg-muted px-1 py-0.5">
            xattr -dr com.apple.quarantine /Applications/midnite.app
          </code>
          .
        </p>
      </div>
    </section>
  );
}
