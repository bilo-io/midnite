'use client';

import { useEffect, useState } from 'react';
import { Download as DownloadIcon } from 'lucide-react';

import { Button } from '@/components/ui/button';
import {
  DOWNLOAD_TARGETS,
  PLATFORM_LABELS,
  PLATFORM_ORDER,
  assetUrl,
  platformAvailable,
  targetsFor,
  type DownloadTarget,
  type Platform,
} from '@/lib/downloads';
import { detectPlatform } from '@/lib/platform';

function ComingSoon() {
  return (
    <span className="rounded bg-muted px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
      Coming soon
    </span>
  );
}

function DownloadButton({ target, primary }: { target: DownloadTarget; primary?: boolean }) {
  const text = `${target.label} (${target.ext})`;

  if (!target.available || !target.assetName) {
    return (
      <Button size="lg" variant="outline" disabled aria-label={`${target.label} — coming soon`}>
        <DownloadIcon className="h-4 w-4" />
        {target.label}
        <ComingSoon />
      </Button>
    );
  }

  const button = (
    <Button size="lg" variant={primary ? 'default' : 'outline'}>
      <DownloadIcon className="h-4 w-4" />
      {text}
    </Button>
  );

  return (
    <a
      href={assetUrl(target.assetName)}
      target="_blank"
      rel="noreferrer"
      className={primary ? 'gradient-border rounded-md' : undefined}
    >
      {button}
    </a>
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
  const featuredTargets = targetsFor(featured);
  const featuredAvailable = platformAvailable(featured);
  // The unsigned-app note is relevant whenever a macOS build is on the page.
  const showMacNote = DOWNLOAD_TARGETS.some((t) => t.platform === 'mac' && t.available);

  return (
    <div className="mx-auto max-w-3xl">
      {/* Detected platform — featured action(s). */}
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

          {featuredAvailable ? (
            <div className="mt-6 flex flex-col items-center justify-center gap-3 sm:flex-row">
              {featuredTargets.map((t, i) => (
                <DownloadButton key={t.label} target={t} primary={i === 0} />
              ))}
            </div>
          ) : (
            <div className="mt-6">
              <Button size="lg" variant="outline" disabled>
                <DownloadIcon className="h-4 w-4" />
                {PLATFORM_LABELS[featured]}
                <ComingSoon />
              </Button>
              <p className="mt-3 text-sm text-muted-foreground">
                {PLATFORM_LABELS[featured]} builds aren&apos;t ready yet — grab macOS below, or check
                back soon.
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Every platform, so nobody is locked to the one they're on. */}
      <div className="mt-12">
        <h3 className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
          All platforms
        </h3>
        <ul className="mt-4 divide-y divide-border/60 overflow-hidden rounded-xl border border-border/60 bg-card/30">
          {PLATFORM_ORDER.map((p) => (
            <li
              key={p}
              data-platform={p}
              className="flex flex-col gap-3 p-4 transition-colors hover:bg-card/60 sm:flex-row sm:items-center sm:justify-between"
            >
              <span className="font-medium">{PLATFORM_LABELS[p]}</span>
              <div className="flex flex-wrap gap-2">
                {targetsFor(p).map((t) => (
                  <DownloadButton key={t.label} target={t} />
                ))}
              </div>
            </li>
          ))}
        </ul>
      </div>

      {showMacNote && (
        <p className="mx-auto mt-8 max-w-md text-center text-xs leading-relaxed text-muted-foreground">
          macOS builds are currently unsigned. On first open, right-click the app and choose{' '}
          <strong className="text-foreground">Open</strong>, or run{' '}
          <code className="rounded bg-muted px-1 py-0.5">
            xattr -dr com.apple.quarantine /Applications/midnite.app
          </code>
          .
        </p>
      )}
    </div>
  );
}
