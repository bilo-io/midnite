'use client';

import { useEffect, useState } from 'react';
import { CalendarClock, Database, Download, Lock } from 'lucide-react';
import { PORTABLE_DOMAINS, type BackupStatus, type BackupSummary } from '@midnite/shared';
import { downloadBackup, getBackupStatus } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { useToast } from '@/components/toast';

function errMsg(e: unknown): string {
  return e instanceof Error ? e.message : 'Backup failed';
}

function fmtBytes(n: number): string {
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(0)} KB`;
  return `${(n / 1024 / 1024).toFixed(1)} MB`;
}

/** Phase 49 F — read-only auto-backup status (scheduler is config-driven). */
function AutoBackupPanel() {
  const [status, setStatus] = useState<BackupStatus | null>(null);
  const [state, setState] = useState<'loading' | 'ready' | 'error'>('loading');

  useEffect(() => {
    let alive = true;
    getBackupStatus()
      .then((s) => {
        if (!alive) return;
        setStatus(s);
        setState('ready');
      })
      .catch(() => alive && setState('error'));
    return () => {
      alive = false;
    };
  }, []);

  if (state === 'loading') return <p className="text-sm text-muted-foreground">Loading auto-backup status…</p>;
  if (state === 'error' || !status) {
    return <p className="text-sm text-muted-foreground">Couldn’t load auto-backup status.</p>;
  }

  if (!status.enabled) {
    return (
      <p className="text-xs text-muted-foreground">
        Scheduled auto-backup is <span className="font-medium">off</span>. Enable it by setting{' '}
        <code className="font-mono">backup.enabled</code> in <code className="font-mono">midnite.json</code>.
      </p>
    );
  }

  return (
    <div className="space-y-2">
      <div className="rounded-md border border-border bg-muted/30 p-3 text-xs">
        <p className="flex items-center gap-1.5 font-medium">
          <CalendarClock className="h-3.5 w-3.5" />
          Every {status.intervalHours}h → <code className="font-mono">{status.destinationDir}</code> (keep{' '}
          {status.retention})
        </p>
        <p className="mt-1 text-muted-foreground">
          Last: {status.lastRunAt ? new Date(status.lastRunAt).toLocaleString() : 'never'}
          {status.nextRunAt ? ` · next ~${new Date(status.nextRunAt).toLocaleString()}` : ''}
        </p>
      </div>
      {status.recent.length > 0 ? (
        <ul className="divide-y divide-border/60">
          {status.recent.map((a) => (
            <li key={a.filename} className="flex items-center gap-2 py-1 text-xs">
              <span className="truncate font-mono">{a.filename}</span>
              <span className="ml-auto shrink-0 text-muted-foreground">{fmtBytes(a.sizeBytes)}</span>
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-xs text-muted-foreground">No archives written yet.</p>
      )}
    </div>
  );
}

/** Save a Blob to disk under `filename` (the export-menu download pattern). */
function saveBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
}

/**
 * Phase 49 E — Settings → Data (admin-gated backup/restore). This slice ships the
 * **download** half: a one-click full-store backup (authed fetch → save) with a
 * per-domain summary read from the export response. Restore lands with the import
 * service (Theme C); its section is shown disabled so the page reads complete.
 */
export function DataView() {
  const toast = useToast();
  const [busy, setBusy] = useState(false);
  const [summary, setSummary] = useState<BackupSummary | null>(null);

  const onDownload = async (): Promise<void> => {
    setBusy(true);
    try {
      const { blob, filename, summary: s } = await downloadBackup();
      saveBlob(blob, filename);
      setSummary(s);
      toast.success(`Backup downloaded — ${filename}`);
    } catch (e) {
      toast.error(errMsg(e));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="max-w-lg space-y-8">
      <div>
        <h1 className="text-base font-semibold">Data</h1>
        <p className="mt-0.5 text-xs text-muted-foreground">
          Back up and restore your whole midnite store — for disaster recovery or moving instances.
        </p>
      </div>

      {/* Download backup */}
      <section className="space-y-3">
        <div>
          <h2 className="text-sm font-medium">Download a backup</h2>
          <p className="mt-0.5 text-xs text-muted-foreground">
            A portable <code className="font-mono">.zip</code> archive of every work domain, restorable onto this
            or a fresh instance.
          </p>
        </div>
        <Button type="button" onClick={() => void onDownload()} disabled={busy} className="gap-1.5">
          <Download className="h-4 w-4" />
          {busy ? 'Preparing…' : 'Download backup'}
        </Button>

        <div className="rounded-md border border-border bg-muted/30 p-3">
          <p className="text-xs font-medium text-muted-foreground">Included in a backup</p>
          <div className="mt-1.5 flex flex-wrap gap-1.5">
            {PORTABLE_DOMAINS.map((d) => (
              <span key={d.name} className="rounded bg-muted px-1.5 py-0.5 text-[11px] font-medium">
                {d.label}
                {summary ? <span className="ml-1 text-muted-foreground">{summary.counts[d.name] ?? 0}</span> : null}
              </span>
            ))}
          </div>
          <p className="mt-2 flex items-center gap-1 text-[11px] text-muted-foreground">
            <Lock className="h-3 w-3" />
            Secrets (API keys, tokens) are excluded — reconfigure integrations after a restore.
          </p>
        </div>

        {summary ? (
          <p className="text-xs text-muted-foreground">
            Last backup: schema v{summary.schemaVersion} · {Object.values(summary.counts).reduce((a, b) => a + b, 0)}{' '}
            records across {summary.domains.length} domains.
          </p>
        ) : null}
      </section>

      {/* Scheduled auto-backup status (Phase 49 F) */}
      <section className="space-y-3">
        <div>
          <h2 className="text-sm font-medium">Scheduled auto-backup</h2>
          <p className="mt-0.5 text-xs text-muted-foreground">
            Automatic timestamped backups on an interval, pruned to a retention count.
          </p>
        </div>
        <AutoBackupPanel />
      </section>

      {/* Restore — lands with the import service (Theme C) */}
      <section className="space-y-3 opacity-60">
        <div className="flex items-center gap-2">
          <Database className="h-4 w-4 text-muted-foreground" />
          <h2 className="text-sm font-medium">Restore from a backup</h2>
        </div>
        <p className="text-xs text-muted-foreground">
          Upload an archive to preview and restore it (replace or merge). Available once import ships.
        </p>
        <Button type="button" disabled className="gap-1.5">
          <Download className="h-4 w-4 rotate-180" />
          Restore…
        </Button>
      </section>
    </div>
  );
}
