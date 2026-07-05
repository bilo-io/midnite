'use client';

import { useEffect, useState } from 'react';
import { AlertTriangle, CalendarClock, CheckCircle2, Database, Download, Lock, Upload } from 'lucide-react';
import {
  PORTABLE_DOMAINS,
  type BackupStatus,
  type BackupSummary,
  type ImportPreview,
  type ImportResult,
} from '@midnite/shared';
import { downloadBackup, getBackupStatus, importArchive, previewImport } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
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

type PreviewState = 'idle' | 'loading' | 'ready' | 'error';

const sumValues = (r: Record<string, number>): number => Object.values(r).reduce((a, b) => a + b, 0);

/**
 * Phase 49 E — restore flow: upload → dry-run preview (auto on select) → pick
 * mode → (replace: type-to-confirm) → restore → summary. The import is a single
 * atomic server transaction, so "progress" is an honest busy state, not a bar.
 */
function RestorePanel() {
  const toast = useToast();
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<ImportPreview | null>(null);
  const [previewState, setPreviewState] = useState<PreviewState>('idle');
  const [previewError, setPreviewError] = useState('');
  const [mode, setMode] = useState<'merge' | 'replace'>('merge');
  const [confirmText, setConfirmText] = useState('');
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<ImportResult | null>(null);

  const onPick = async (picked: File | null): Promise<void> => {
    setFile(picked);
    setPreview(null);
    setResult(null);
    setPreviewError('');
    setConfirmText('');
    if (!picked) {
      setPreviewState('idle');
      return;
    }
    setPreviewState('loading');
    try {
      setPreview(await previewImport(picked));
      setPreviewState('ready');
    } catch (e) {
      setPreviewError(errMsg(e));
      setPreviewState('error');
    }
  };

  const onRestore = async (): Promise<void> => {
    if (!file || !preview) return;
    setBusy(true);
    try {
      const r = await importArchive(file, { mode });
      setResult(r);
      toast.success(`Restored ${sumValues(r.inserted)} record(s) (${r.mode})`);
    } catch (e) {
      toast.error(errMsg(e));
    } finally {
      setBusy(false);
    }
  };

  const total = preview ? sumValues(preview.domainCounts) : 0;
  const conflictTotal = preview
    ? Object.values(preview.conflicts).reduce((a, ids) => a + ids.length, 0)
    : 0;
  const blockedByVersion = preview != null && !preview.importable;
  const confirmOk = mode !== 'replace' || confirmText.trim() === 'replace';
  const canRestore = preview != null && !blockedByVersion && confirmOk && !busy;

  return (
    <section className="space-y-3">
      <div className="flex items-center gap-2">
        <Database className="h-4 w-4 text-muted-foreground" />
        <h2 className="text-sm font-medium">Restore from a backup</h2>
      </div>
      <p className="text-xs text-muted-foreground">
        Upload an archive to preview its contents, then restore it.{' '}
        <span className="font-medium">Replace</span> wipes existing data first;{' '}
        <span className="font-medium">merge</span> only inserts records you don’t already have.
      </p>

      <label className="block">
        <span className="sr-only">Choose a backup archive</span>
        <input
          type="file"
          accept=".zip,application/zip"
          aria-label="Choose a backup archive"
          onChange={(e) => void onPick(e.target.files?.[0] ?? null)}
          className="block w-full text-xs file:mr-3 file:rounded-md file:border-0 file:bg-muted file:px-3 file:py-1.5 file:text-xs file:font-medium hover:file:bg-muted/70"
        />
      </label>

      {previewState === 'loading' ? (
        <p className="text-xs text-muted-foreground">Inspecting archive…</p>
      ) : null}
      {previewState === 'error' ? <p className="text-xs text-destructive">{previewError}</p> : null}

      {preview && previewState === 'ready' ? (
        <>
          <div className="rounded-md border border-border bg-muted/30 p-3 text-xs">
            <p className="font-medium text-muted-foreground">
              Archive: schema v{preview.manifest.schemaVersion} · {total} records · {conflictTotal} id
              conflict(s)
            </p>
            <div className="mt-1.5 space-y-0.5">
              {Object.keys(preview.domainCounts)
                .sort()
                .map((d) => {
                  const conf = preview.conflicts[d]?.length ?? 0;
                  return (
                    <p key={d} className="flex items-center gap-2">
                      <span className="font-mono">{d}</span>
                      <span className="ml-auto text-muted-foreground">
                        {preview.domainCounts[d] ?? 0}
                        {conf ? ` · ${conf} conflict${conf === 1 ? '' : 's'}` : ''}
                      </span>
                    </p>
                  );
                })}
            </div>
          </div>

          {blockedByVersion ? (
            <p className="flex items-start gap-1.5 text-xs text-destructive">
              <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
              This archive is from a newer midnite schema (v{preview.manifest.schemaVersion}) — upgrade this
              instance before restoring.
            </p>
          ) : (
            <>
              <fieldset className="space-y-1.5" disabled={busy}>
                <legend className="text-xs font-medium text-muted-foreground">Restore mode</legend>
                <label className="flex items-center gap-2 text-xs">
                  <input
                    type="radio"
                    name="restore-mode"
                    value="merge"
                    checked={mode === 'merge'}
                    onChange={() => setMode('merge')}
                  />
                  <span>
                    <span className="font-medium">Merge</span> — keep existing records, add new ones
                  </span>
                </label>
                <label className="flex items-center gap-2 text-xs">
                  <input
                    type="radio"
                    name="restore-mode"
                    value="replace"
                    checked={mode === 'replace'}
                    onChange={() => setMode('replace')}
                  />
                  <span>
                    <span className="font-medium">Replace</span> — wipe existing data, then restore
                  </span>
                </label>
              </fieldset>

              {mode === 'replace' ? (
                <label className="block space-y-1">
                  <span className="text-xs text-destructive">
                    Replace wipes existing data. Type <code className="font-mono font-semibold">replace</code>{' '}
                    to confirm.
                  </span>
                  <Input
                    value={confirmText}
                    onChange={(e) => setConfirmText(e.target.value)}
                    placeholder="replace"
                    aria-label="Type replace to confirm"
                    disabled={busy}
                    className="max-w-[12rem]"
                  />
                </label>
              ) : null}

              <Button type="button" onClick={() => void onRestore()} disabled={!canRestore} className="gap-1.5">
                <Upload className="h-4 w-4" />
                {busy ? 'Restoring…' : `Restore (${mode})`}
              </Button>
            </>
          )}
        </>
      ) : null}

      {result ? (
        <div className="rounded-md border border-border bg-muted/30 p-3 text-xs">
          <p className="flex items-center gap-1.5 font-medium">
            <CheckCircle2 className="h-3.5 w-3.5 text-green-600" />
            Restored ({result.mode}) — {sumValues(result.inserted)} inserted
            {sumValues(result.skipped) > 0 ? `, ${sumValues(result.skipped)} skipped` : ''}
          </p>
          {!result.reindexed ? (
            <p className="mt-1 text-muted-foreground">
              Search reindex warned — search may be briefly stale.
            </p>
          ) : null}
        </div>
      ) : null}
    </section>
  );
}

/**
 * Phase 49 E — Settings → Data (admin-gated backup/restore): a one-click
 * full-store **download** (authed fetch → save) with a per-domain summary, the
 * read-only auto-backup status (Theme F), and the **restore** flow (upload →
 * preview → confirm → summary) against the Theme C import endpoints.
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

      {/* Restore (Phase 49 E — wired to the Theme C import endpoints) */}
      <RestorePanel />
    </div>
  );
}
