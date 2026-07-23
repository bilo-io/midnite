'use client';

import { useEffect, useRef, useState } from 'react';
import { AlertTriangle, CalendarClock, CheckCircle2, Database, Download, Lock, Upload } from 'lucide-react';
import { useTranslations } from 'next-intl';
import {
  PORTABLE_DOMAINS,
  type BackupStatus,
  type BackupSummary,
  type ImportPreview,
  type ImportResult,
} from '@midnite/shared';
import { downloadBackup, getBackupStatus, importArchive, previewImport } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { useToast } from '@/components/toast';

function errMsg(e: unknown, fallback: string): string {
  return e instanceof Error ? e.message : fallback;
}

function fmtBytes(n: number): string {
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(0)} KB`;
  return `${(n / 1024 / 1024).toFixed(1)} MB`;
}

/** Phase 49 F — read-only auto-backup status (scheduler is config-driven). */
function AutoBackupPanel() {
  const t = useTranslations('settings');
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

  if (state === 'loading') return <p className="text-sm text-muted-foreground">{t('data.autoBackup.loading')}</p>;
  if (state === 'error' || !status) {
    return <p className="text-sm text-muted-foreground">{t('data.autoBackup.error')}</p>;
  }

  if (!status.enabled) {
    return (
      <p className="text-xs text-muted-foreground">
        {t.rich('data.autoBackup.disabled', {
          strong: (chunks) => <span className="font-medium">{chunks}</span>,
          code: (chunks) => <code className="font-mono">{chunks}</code>,
        })}
      </p>
    );
  }

  return (
    <div className="space-y-2">
      <div className="rounded-md border border-border bg-muted/30 p-3 text-xs">
        <p className="flex items-center gap-1.5 font-medium">
          <CalendarClock className="h-3.5 w-3.5" />
          {t.rich('data.autoBackup.schedule', {
            hours: status.intervalHours,
            dir: status.destinationDir,
            retention: status.retention,
            code: (chunks) => <code className="font-mono">{chunks}</code>,
          })}
        </p>
        <p className="mt-1 text-muted-foreground">
          {t('data.autoBackup.last', {
            when: status.lastRunAt ? new Date(status.lastRunAt).toLocaleString() : t('data.autoBackup.never'),
          })}
          {status.nextRunAt ? t('data.autoBackup.next', { when: new Date(status.nextRunAt).toLocaleString() }) : ''}
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
        <p className="text-xs text-muted-foreground">{t('data.autoBackup.noArchives')}</p>
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

/**
 * Phase 49 E — Restore. Upload an archive → auto dry-run preview (per-domain
 * counts, id conflicts, version verdict) → pick merge (default, non-destructive)
 * or replace → for replace, type the confirm word → staged progress → summary.
 * A newer-than-us archive is hard-blocked (no override), mirroring the CLI.
 */
function RestorePanel() {
  const t = useTranslations('settings');
  const toast = useToast();
  const fileRef = useRef<HTMLInputElement>(null);
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<ImportPreview | null>(null);
  const [mode, setMode] = useState<'merge' | 'replace'>('merge');
  const [confirmText, setConfirmText] = useState('');
  const [passphrase, setPassphrase] = useState('');
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
    setPassphrase('');
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
      setError(errMsg(e, t('data.errorFallback')));
      setPhase('error');
      toast.error(errMsg(e, t('data.errorFallback')));
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
      const r = await importArchive(file, mode, passphrase || undefined);
      clearTimers();
      setResult(r);
      setPhase('done');
      const inserted = Object.values(r.inserted).reduce((a, b) => a + b, 0);
      toast.success(t('data.restore.toastRestored', { count: inserted, mode: r.mode }));
    } catch (e) {
      clearTimers();
      setError(errMsg(e, t('data.errorFallback')));
      setPhase('error');
      toast.error(errMsg(e, t('data.errorFallback')));
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
        aria-label={t('data.restore.chooseAria')}
        className="hidden"
        onChange={(e) => void onFile(e.target.files?.[0] ?? null)}
      />
      <Button type="button" variant="outline" onClick={() => fileRef.current?.click()} disabled={inFlight} className="gap-1.5">
        <Upload className="h-4 w-4" />
        {file ? file.name : t('data.restore.choose')}
      </Button>

      {phase === 'previewing' ? <p className="text-xs text-muted-foreground">{t('data.restore.reading')}</p> : null}

      {/* Version-incompatible archive — hard block, no override (mirrors the CLI). */}
      {blocked && preview ? (
        <div className="flex items-start gap-2 rounded-md border border-destructive/40 bg-destructive/10 p-3 text-xs text-destructive">
          <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
          <span>
            {t('data.restore.blocked', {
              schemaVersion: preview.manifest.schemaVersion,
              compat: preview.compat,
            })}
          </span>
        </div>
      ) : null}

      {/* Dry-run preview: per-domain counts + id conflicts. */}
      {preview && preview.importable ? (
        <div className="space-y-3 rounded-md border border-border bg-muted/30 p-3">
          <p className="text-xs font-medium text-muted-foreground">
            {t('data.restore.previewLabel', {
              version: preview.manifest.schemaVersion,
              compat: preview.compat,
              count: Object.values(preview.domainCounts).reduce((a, b) => a + b, 0),
            })}
          </p>
          <ul className="grid grid-cols-2 gap-x-4 gap-y-0.5 text-[11px]">
            {preview.manifest.domains.map((d) => {
              const conflicts = preview.conflicts[d]?.length ?? 0;
              return (
                <li key={d} className="flex justify-between gap-2">
                  <span className="truncate">{d}</span>
                  <span className="shrink-0 text-muted-foreground">
                    {preview.domainCounts[d] ?? 0}
                    {conflicts ? <span className="text-amber-600"> {t('data.restore.conflicts', { count: conflicts })}</span> : null}
                  </span>
                </li>
              );
            })}
          </ul>

          {/* Theme G — advisory warnings (users signed out on replace, secrets present). */}
          {preview.warnings.length > 0 ? (
            <ul className="space-y-1">
              {preview.warnings.map((w) => (
                <li key={w} className="flex items-start gap-1.5 text-[11px] text-amber-600">
                  <AlertTriangle className="mt-0.5 h-3 w-3 shrink-0" />
                  <span>{w}</span>
                </li>
              ))}
            </ul>
          ) : null}

          {/* Theme G — passphrase to unwrap a secrets-bearing archive. */}
          {preview.manifest.secretsMode === 'passphrase' ? (
            <div className="space-y-1">
              <label htmlFor="restore-passphrase" className="block text-[11px] text-muted-foreground">
                {t('data.restore.passphraseLabel')}
              </label>
              <input
                id="restore-passphrase"
                type="password"
                autoComplete="off"
                value={passphrase}
                onChange={(e) => setPassphrase(e.target.value)}
                placeholder={t('data.restore.passphrasePlaceholder')}
                className="w-64 rounded border border-input bg-background px-2 py-1 text-xs"
              />
            </div>
          ) : null}

          {/* Mode — merge is the safe default; replace is guarded below. */}
          <fieldset className="space-y-1.5">
            <legend className="text-[11px] font-medium text-muted-foreground">{t('data.restore.modeLegend')}</legend>
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
                  <span className="font-medium">{m === 'merge' ? t('data.restore.merge') : t('data.restore.replace')}</span>{' '}
                  <span className="text-muted-foreground">
                    {m === 'merge'
                      ? t('data.restore.mergeDesc')
                      : t('data.restore.replaceDesc')}
                  </span>
                </span>
              </label>
            ))}
          </fieldset>

          {/* Typed confirmation for the destructive replace. */}
          {mode === 'replace' ? (
            <div className="space-y-1">
              <label htmlFor="replace-confirm" className="block text-[11px] text-destructive">
                {t.rich('data.restore.confirmLabel', {
                  code: (chunks) => <code className="font-mono font-semibold">{chunks}</code>,
                })}
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
            {inFlight ? t('data.restore.restoring') : t('data.restore.restoreMode', { mode })}
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
          <p className="text-[11px] text-muted-foreground">{t(`data.restore.stage.${phase}`)}</p>
        </div>
      ) : null}

      {/* Result summary. */}
      {phase === 'done' && result ? (
        <div className="flex items-start gap-2 rounded-md border border-emerald-500/40 bg-emerald-500/10 p-3 text-xs">
          <CheckCircle2 className="mt-0.5 h-3.5 w-3.5 shrink-0 text-emerald-600" />
          <div>
            <p className="font-medium">
              {t('data.restore.result.summary', {
                mode: result.mode,
                inserted: Object.values(result.inserted).reduce((a, b) => a + b, 0),
                skipped: Object.values(result.skipped).reduce((a, b) => a + b, 0),
              })}
              {result.secretsRestored || result.secretsSkipped
                ? t('data.restore.result.secrets', { restored: result.secretsRestored }) +
                  (result.secretsSkipped ? t('data.restore.result.secretsSkipped', { skipped: result.secretsSkipped }) : '')
                : ''}
              {result.reindexed ? '' : t('data.restore.result.reindexWarned')}
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
  const t = useTranslations('settings');
  const toast = useToast();
  const [busy, setBusy] = useState(false);
  const [summary, setSummary] = useState<BackupSummary | null>(null);
  const [includeSecrets, setIncludeSecrets] = useState(false);
  const [passphrase, setPassphrase] = useState('');

  const secretsNeedPassphrase = includeSecrets && passphrase.trim().length === 0;

  const onDownload = async (): Promise<void> => {
    if (secretsNeedPassphrase) return;
    setBusy(true);
    try {
      const { blob, filename, summary: s } = await downloadBackup(
        includeSecrets ? { includeSecrets: true, passphrase } : undefined,
      );
      saveBlob(blob, filename);
      setSummary(s);
      toast.success(t('data.download.toastSuccess', { filename }));
    } catch (e) {
      toast.error(errMsg(e, t('data.errorFallback')));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="max-w-lg space-y-8">
      <div>
        <h1 className="text-base font-semibold">{t('data.title')}</h1>
        <p className="mt-0.5 text-xs text-muted-foreground">
          {t('data.description')}
        </p>
      </div>

      {/* Download backup */}
      <section className="space-y-3">
        <div>
          <h2 className="text-sm font-medium">{t('data.download.title')}</h2>
          <p className="mt-0.5 text-xs text-muted-foreground">
            {t.rich('data.download.description', {
              code: (chunks) => <code className="font-mono">{chunks}</code>,
            })}
          </p>
        </div>
        {/* Theme G — opt into including secrets, re-wrapped under a passphrase. */}
        <div className="space-y-2 rounded-md border border-border bg-muted/20 p-3">
          <label className="flex items-start gap-2 text-xs">
            <input
              type="checkbox"
              checked={includeSecrets}
              onChange={(e) => setIncludeSecrets(e.target.checked)}
              className="mt-0.5"
            />
            <span>
              <span className="font-medium">{t('data.download.includeSecrets')}</span>{' '}
              <span className="text-muted-foreground">
                {t('data.download.includeSecretsDesc')}
              </span>
            </span>
          </label>
          {includeSecrets ? (
            <div className="space-y-1 pl-6">
              <label htmlFor="export-passphrase" className="block text-[11px] text-muted-foreground">
                {t('data.download.passphraseLabel')}
              </label>
              <input
                id="export-passphrase"
                type="password"
                autoComplete="new-password"
                value={passphrase}
                onChange={(e) => setPassphrase(e.target.value)}
                placeholder={t('data.download.passphrasePlaceholder')}
                className="w-64 rounded border border-input bg-background px-2 py-1 text-xs"
              />
              {secretsNeedPassphrase ? (
                <p className="text-[11px] text-destructive">{t('data.download.passphraseRequired')}</p>
              ) : null}
            </div>
          ) : null}
        </div>

        <Button type="button" onClick={() => void onDownload()} disabled={busy || secretsNeedPassphrase} className="gap-1.5">
          <Download className="h-4 w-4" />
          {busy ? t('data.download.preparing') : t('data.download.button')}
        </Button>

        <div className="rounded-md border border-border bg-muted/30 p-3">
          <p className="text-xs font-medium text-muted-foreground">{t('data.download.included')}</p>
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
            {includeSecrets
              ? t('data.download.lockNoteIncluded')
              : t('data.download.lockNoteExcluded')}
          </p>
        </div>

        {summary ? (
          <p className="text-xs text-muted-foreground">
            {t('data.download.lastBackup', {
              version: summary.schemaVersion,
              count: Object.values(summary.counts).reduce((a, b) => a + b, 0),
              domains: summary.domains.length,
            })}
          </p>
        ) : null}
      </section>

      {/* Scheduled auto-backup status (Phase 49 F) */}
      <section className="space-y-3">
        <div>
          <h2 className="text-sm font-medium">{t('data.autoBackup.title')}</h2>
          <p className="mt-0.5 text-xs text-muted-foreground">
            {t('data.autoBackup.description')}
          </p>
        </div>
        <AutoBackupPanel />
      </section>

      {/* Restore (Phase 49 E · Theme C import service) */}
      <section className="space-y-3">
        <div className="flex items-center gap-2">
          <Database className="h-4 w-4 text-muted-foreground" />
          <h2 className="text-sm font-medium">{t('data.restore.title')}</h2>
        </div>
        <p className="text-xs text-muted-foreground">
          {t.rich('data.restore.description', {
            strong: (chunks) => <span className="font-medium">{chunks}</span>,
          })}
        </p>
        <RestorePanel />
      </section>
    </div>
  );
}
