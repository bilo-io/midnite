'use client';

import { useEffect, useRef, useState } from 'react';
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
import { cn } from '@/lib/utils';
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

/** The synthetic restore stages. The server import is one atomic POST (no
 *  per-stage signal), so the bar advances client-side while the request is
 *  in-flight, then snaps to `done` on the result. */
const RESTORE_STAGES = ['uploading', 'restoring', 'reindexing'] as const;
type RestorePhase = 'idle' | 'previewing' | (typeof RESTORE_STAGES)[number] | 'done' | 'error';
const STAGE_LABEL: Record<(typeof RESTORE_STAGES)[number] | 'done', string> = {
  uploading: 'Uploading archive…',
  restoring: 'Restoring records…',
  reindexing: 'Rebuilding search index…',
  done: 'Done',
};

/**
 * Phase 49 E — Restore. Upload an archive → auto dry-run preview (per-domain
 * counts, id conflicts, version verdict) → pick merge (default, non-destructive)
 * or replace → for replace, type the confirm word → staged progress → summary.
 * A newer-than-us archive is hard-blocked (no override), mirroring the CLI.
 */
function RestorePanel() {
  const toast = useToast();
  const fileRef = useRef<HTMLInputElement>(null);
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<ImportPreview | null>(null);
  const [mode, setMode] = useState<'merge' | 'replace'>('merge');
  const [confirmText, setConfirmText] = useState('');
  const [phase, setPhase] = useState<RestorePhase>('idle');
  const [result, setResult] = useState<ImportResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const clearTimers = (): void => {
    for (const t of timers.current) clearTimeout(t);
    timers.current = [];
  };
  useEffect(() => clearTimers, []);

  const inFlight = phase === 'previewing' || RESTORE_STAGES.includes(phase as (typeof RESTORE_STAGES)[number]);
  const blocked = preview !== null && !preview.importable;
  const replaceUnconfirmed = mode === 'replace' && confirmText.trim().toLowerCase() !== 'replace';
  const canRestore = !!file && !!preview && preview.importable && !inFlight && !replaceUnconfirmed;

  const reset = (): void => {
    clearTimers();
    setPreview(null);
    setResult(null);
    setError(null);
    setConfirmText('');
    setPhase('idle');
  };

  const onFile = async (f: File | null): Promise<void> => {
    reset();
    setFile(f);
    if (!f) return;
    setPhase('previewing');
    try {
      const p = await previewImport(f);
      setPreview(p);
      setPhase('idle');
    } catch (e) {
      setError(errMsg(e));
      setPhase('error');
      toast.error(errMsg(e));
    }
  };

  const onRestore = async (): Promise<void> => {
    if (!file || !preview) return;
    setError(null);
    setResult(null);
    setPhase('uploading');
    timers.current.push(setTimeout(() => setPhase((p) => (p === 'uploading' ? 'restoring' : p)), 400));
    timers.current.push(setTimeout(() => setPhase((p) => (p === 'restoring' ? 'reindexing' : p)), 1200));
    try {
      const r = await importArchive(file, mode);
      clearTimers();
      setResult(r);
      setPhase('done');
      const inserted = Object.values(r.inserted).reduce((a, b) => a + b, 0);
      toast.success(`Restored ${inserted} records (${r.mode}).`);
    } catch (e) {
      clearTimers();
      setError(errMsg(e));
      setPhase('error');
      toast.error(errMsg(e));
    }
  };

  const stageIndex = RESTORE_STAGES.indexOf(phase as (typeof RESTORE_STAGES)[number]);
  const barPct = phase === 'done' ? 100 : stageIndex >= 0 ? ((stageIndex + 1) / RESTORE_STAGES.length) * 100 : 0;

  return (
    <div className="space-y-3">
      <input
        ref={fileRef}
        type="file"
        accept=".zip,application/zip"
        aria-label="Choose backup archive"
        className="hidden"
        onChange={(e) => void onFile(e.target.files?.[0] ?? null)}
      />
      <Button type="button" variant="outline" onClick={() => fileRef.current?.click()} disabled={inFlight} className="gap-1.5">
        <Upload className="h-4 w-4" />
        {file ? file.name : 'Choose archive…'}
      </Button>

      {phase === 'previewing' ? <p className="text-xs text-muted-foreground">Reading archive…</p> : null}

      {/* Version-incompatible archive — hard block, no override (mirrors the CLI). */}
      {blocked && preview ? (
        <div className="flex items-start gap-2 rounded-md border border-destructive/40 bg-destructive/10 p-3 text-xs text-destructive">
          <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
          <span>
            This archive was made by a newer midnite (schema v{preview.manifest.schemaVersion}, {preview.compat}) than
            this instance understands. Upgrade midnite, then retry — it can’t be imported safely.
          </span>
        </div>
      ) : null}

      {/* Dry-run preview: per-domain counts + id conflicts. */}
      {preview && preview.importable ? (
        <div className="space-y-3 rounded-md border border-border bg-muted/30 p-3">
          <p className="text-xs font-medium text-muted-foreground">
            Preview — schema v{preview.manifest.schemaVersion} ({preview.compat}):{' '}
            {Object.values(preview.domainCounts).reduce((a, b) => a + b, 0)} records
          </p>
          <ul className="grid grid-cols-2 gap-x-4 gap-y-0.5 text-[11px]">
            {preview.manifest.domains.map((d) => {
              const conflicts = preview.conflicts[d]?.length ?? 0;
              return (
                <li key={d} className="flex justify-between gap-2">
                  <span className="truncate">{d}</span>
                  <span className="shrink-0 text-muted-foreground">
                    {preview.domainCounts[d] ?? 0}
                    {conflicts ? <span className="text-amber-600"> · {conflicts} existing</span> : null}
                  </span>
                </li>
              );
            })}
          </ul>

          {/* Mode — merge is the safe default; replace is guarded below. */}
          <fieldset className="space-y-1.5">
            <legend className="text-[11px] font-medium text-muted-foreground">Restore mode</legend>
            {(['merge', 'replace'] as const).map((m) => (
              <label key={m} className="flex items-start gap-2 text-xs">
                <input
                  type="radio"
                  name="restore-mode"
                  value={m}
                  checked={mode === m}
                  onChange={() => {
                    setMode(m);
                    setConfirmText('');
                  }}
                  className="mt-0.5"
                />
                <span>
                  <span className="font-medium">{m === 'merge' ? 'Merge' : 'Replace'}</span>{' '}
                  <span className="text-muted-foreground">
                    {m === 'merge'
                      ? '— insert new records, keep existing ones.'
                      : '— wipe the listed domains, then restore. Destructive.'}
                  </span>
                </span>
              </label>
            ))}
          </fieldset>

          {/* Typed confirmation for the destructive replace. */}
          {mode === 'replace' ? (
            <div className="space-y-1">
              <label htmlFor="replace-confirm" className="block text-[11px] text-destructive">
                Type <code className="font-mono font-semibold">replace</code> to confirm wiping existing data:
              </label>
              <input
                id="replace-confirm"
                type="text"
                autoComplete="off"
                value={confirmText}
                onChange={(e) => setConfirmText(e.target.value)}
                className="w-40 rounded border border-input bg-background px-2 py-1 text-xs"
              />
            </div>
          ) : null}

          <Button type="button" onClick={() => void onRestore()} disabled={!canRestore} className="gap-1.5">
            <Download className="h-4 w-4 rotate-180" />
            {inFlight ? 'Restoring…' : `Restore (${mode})`}
          </Button>
        </div>
      ) : null}

      {/* Staged progress while the (atomic) import runs. */}
      {inFlight && stageIndex >= 0 ? (
        <div className="space-y-1">
          <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
            <div
              className="h-full rounded-full bg-primary transition-all duration-300"
              style={{ width: `${barPct}%` }}
            />
          </div>
          <p className="text-[11px] text-muted-foreground">{STAGE_LABEL[phase as (typeof RESTORE_STAGES)[number]]}</p>
        </div>
      ) : null}

      {/* Result summary. */}
      {phase === 'done' && result ? (
        <div className="flex items-start gap-2 rounded-md border border-emerald-500/40 bg-emerald-500/10 p-3 text-xs">
          <CheckCircle2 className="mt-0.5 h-3.5 w-3.5 shrink-0 text-emerald-600" />
          <div>
            <p className="font-medium">
              Restored ({result.mode}): {Object.values(result.inserted).reduce((a, b) => a + b, 0)} inserted,{' '}
              {Object.values(result.skipped).reduce((a, b) => a + b, 0)} skipped
              {result.reindexed ? '' : ' · search reindex warned'}
            </p>
          </div>
        </div>
      ) : null}

      {phase === 'error' && error ? (
        <p className="text-xs text-destructive">{error}</p>
      ) : null}
    </div>
  );
}

/**
 * Phase 49 E — Settings → Data (admin-gated backup/restore). Download a full-store
 * backup (authed fetch → save) with a per-domain summary, view scheduled
 * auto-backup status (Phase 49 F), and **restore** an archive (upload → dry-run
 * preview → merge/replace → staged progress → summary; Theme C's import service).
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

      {/* Restore (Phase 49 E · Theme C import service) */}
      <section className="space-y-3">
        <div className="flex items-center gap-2">
          <Database className="h-4 w-4 text-muted-foreground" />
          <h2 className="text-sm font-medium">Restore from a backup</h2>
        </div>
        <p className="text-xs text-muted-foreground">
          Upload an archive to preview it, then restore — <span className="font-medium">merge</span> keeps existing
          records, <span className="font-medium">replace</span> wipes them first.
        </p>
        <RestorePanel />
      </section>
    </div>
  );
}
