'use client';

import { useQuery } from '@tanstack/react-query';
import { Card } from '@midnite/ui';
import {
  isBelowFloor,
  isUpdateAvailable,
  type UpdateChannel,
  type VersionManifest,
} from '@midnite/shared';
import { fetchVersionManifest, versionManifestUrl } from '@/lib/api';
import { PageHeader } from '@/components/page-header';
import { KpiTile } from '@/components/kpi-tile';
import { Changelog } from '@/components/changelog';
import { ErrorState, Skeleton } from '@/components/query-states';
import { formatDateTime } from '@/lib/format';

const RUNNING_VERSION = process.env['NEXT_PUBLIC_APP_VERSION'] ?? '0.0.0';

const CHANNELS: readonly { channel: UpdateChannel; label: string }[] = [
  { channel: 'stable', label: 'Stable' },
  { channel: 'beta', label: 'Beta' },
];

/** One channel's published-version panel, backed by its mirrored manifest. */
function ChannelCard({ channel, label }: { channel: UpdateChannel; label: string }) {
  const manifest = useQuery({
    queryKey: ['admin', 'versions', 'manifest', channel],
    queryFn: ({ signal }) => fetchVersionManifest(channel, signal),
    // Manifests move only on release — no need to refetch on focus/mount churn.
    staleTime: 5 * 60 * 1000,
    retry: false,
  });

  return (
    <Card className="flex flex-col gap-3 p-5">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold text-foreground">{label} channel</h2>
        <a
          href={versionManifestUrl(channel)}
          target="_blank"
          rel="noopener noreferrer"
          className="font-mono text-xs text-muted-foreground underline underline-offset-2 hover:text-foreground"
        >
          manifest
        </a>
      </div>

      {manifest.isPending ? (
        <Skeleton className="h-16" />
      ) : manifest.isError ? (
        <p className="text-sm text-muted-foreground">
          {channel === 'beta'
            ? 'No beta manifest published.'
            : 'Manifest unavailable — could not reach the public mirror.'}
        </p>
      ) : (
        <ChannelDetail channel={channel} manifest={manifest.data} />
      )}
    </Card>
  );
}

function ChannelDetail({ channel, manifest }: { channel: UpdateChannel; manifest: VersionManifest }) {
  const behind = isUpdateAvailable(RUNNING_VERSION, manifest.version);
  const belowFloor = isBelowFloor(RUNNING_VERSION, manifest.minSupported);
  return (
    <div className="flex flex-col gap-3">
      <div className="grid grid-cols-2 gap-3">
        <div>
          <span className="text-xs uppercase tracking-wide text-muted-foreground">Latest</span>
          <p className="text-xl font-semibold tabular-nums text-foreground">{manifest.version}</p>
        </div>
        <div>
          <span className="text-xs uppercase tracking-wide text-muted-foreground">Force-update floor</span>
          <p className="text-xl font-semibold tabular-nums text-foreground">{manifest.minSupported ?? '—'}</p>
        </div>
      </div>
      {manifest.releasedAt ? (
        <p className="text-xs text-muted-foreground">Released {formatDateTime(manifest.releasedAt)}</p>
      ) : null}
      <div className="flex flex-wrap gap-2">
        {channel === 'stable' && belowFloor ? (
          <span className="rounded-full bg-destructive/15 px-2.5 py-0.5 text-xs font-medium text-destructive">
            Running build below floor
          </span>
        ) : behind ? (
          <span className="rounded-full bg-amber-500/15 px-2.5 py-0.5 text-xs font-medium text-amber-600 dark:text-amber-400">
            Update available
          </span>
        ) : (
          <span className="rounded-full bg-emerald-500/15 px-2.5 py-0.5 text-xs font-medium text-emerald-600 dark:text-emerald-400">
            Up to date
          </span>
        )}
        {manifest.notesUrl ? (
          <a
            href={manifest.notesUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs text-primary underline underline-offset-2 hover:no-underline"
          >
            Release notes
          </a>
        ) : null}
      </div>
    </div>
  );
}

/**
 * Versions & releases (Phase 73 Theme F, view-only). Shows this admin build's
 * running version (`NEXT_PUBLIC_APP_VERSION`, baked at build), the live stable +
 * beta channel versions and their force-update floors (fetched at runtime from the
 * public mirror's `version.json` over GitHub-raw), and the bundled `CHANGELOG.md`
 * rendered as readable Markdown. The changelog string is read from disk at build
 * by the server-component page and handed in — see `../app/(main)/versions/page.tsx`.
 */
export function VersionsView({ changelog }: { changelog: string }) {
  return (
    <div className="mx-auto flex max-w-6xl flex-col gap-8 px-6 py-8">
      <PageHeader
        title="Versions"
        description="This console's running build, the live release channels, and the changelog."
      />

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <KpiTile label="Running build" value={RUNNING_VERSION} hint="this admin console" />
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {CHANNELS.map((c) => (
          <ChannelCard key={c.channel} channel={c.channel} label={c.label} />
        ))}
      </div>

      <Card className="flex flex-col gap-4 p-5">
        <h2 className="text-sm font-semibold text-foreground">Changelog</h2>
        {changelog.trim() ? (
          <Changelog markdown={changelog} />
        ) : (
          <ErrorState error={new Error('CHANGELOG.md was not bundled into this build.')} />
        )}
      </Card>
    </div>
  );
}
