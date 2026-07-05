'use client';

import { useState } from 'react';
import { Database, Download, Lock } from 'lucide-react';
import { PORTABLE_DOMAINS, type BackupSummary } from '@midnite/shared';
import { downloadBackup } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { useToast } from '@/components/toast';

function errMsg(e: unknown): string {
  return e instanceof Error ? e.message : 'Backup failed';
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
