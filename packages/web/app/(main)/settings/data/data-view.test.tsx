import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, screen, waitFor } from '@testing-library/react';
import { renderWithIntl as render } from '../../../../vitest.render-intl';
import type { BackupStatus, BackupSummary, ImportPreview, ImportResult } from '@midnite/shared';

const downloadBackup = vi.fn();
const getBackupStatus = vi.fn();
const previewImport = vi.fn();
const importArchive = vi.fn();
vi.mock('@/lib/api', () => ({
  downloadBackup: (opts?: unknown) => downloadBackup(opts),
  getBackupStatus: () => getBackupStatus(),
  previewImport: (f: File) => previewImport(f),
  importArchive: (f: File, mode: string, passphrase?: string) => importArchive(f, mode, passphrase),
}));
const toast = { success: vi.fn(), error: vi.fn() };
vi.mock('@/components/toast', () => ({ useToast: () => toast }));

import { DataView } from './data-view';

afterEach(cleanup);
beforeEach(() => {
  vi.clearAllMocks();
  // jsdom lacks these — stub so saveBlob doesn't throw.
  URL.createObjectURL = vi.fn(() => 'blob:x');
  URL.revokeObjectURL = vi.fn();
  // Default: auto-backup off (the AutoBackupPanel fetches on mount).
  getBackupStatus.mockResolvedValue({
    enabled: false,
    intervalHours: 24,
    destinationDir: './.midnite/backups',
    retention: 7,
    lastRunAt: null,
    nextRunAt: null,
    recent: [],
  } satisfies BackupStatus);
});

const summary: BackupSummary = {
  schemaVersion: 67,
  appVersion: '1.2.0',
  createdAt: '2026-07-05T00:00:00.000Z',
  domains: ['tasks', 'projects'],
  secretsMode: 'excluded',
  counts: { tasks: 12, projects: 3 },
};

const importPreview: ImportPreview = {
  manifest: {
    schemaVersion: 67,
    appVersion: '1.2.0',
    createdAt: '2026-07-05T00:00:00.000Z',
    domains: ['tasks', 'projects'],
    secretsMode: 'excluded',
  },
  domainCounts: { tasks: 12, projects: 3 },
  conflicts: { tasks: ['t1', 't2'] },
  compat: 'ok',
  importable: true,
  warnings: [],
};

/** Select a file on the hidden archive input, triggering the auto-preview. */
function chooseArchive(): void {
  const input = screen.getByLabelText('Choose backup archive') as HTMLInputElement;
  const file = new File(['PKzip'], 'backup.zip', { type: 'application/zip' });
  fireEvent.change(input, { target: { files: [file] } });
}

describe('DataView (Phase 49 E)', () => {
  it('lists the included domains + a secrets-excluded note, restore ready', () => {
    render(<DataView />);
    expect(screen.getByText('Included in a backup')).toBeInTheDocument();
    expect(screen.getByText('Tasks')).toBeInTheDocument();
    expect(screen.getByText('Workflows')).toBeInTheDocument();
    expect(screen.getByText(/Secrets .* are excluded/)).toBeInTheDocument();
    // Restore section ships enabled now that import (Theme C) is available.
    expect(screen.getByRole('button', { name: /Choose archive/ })).toBeEnabled();
  });

  it('downloads a backup and surfaces the per-domain summary', async () => {
    downloadBackup.mockResolvedValue({ blob: new Blob(['x']), filename: 'midnite-backup-2026.zip', summary });
    render(<DataView />);
    fireEvent.click(screen.getByRole('button', { name: /Download backup/ }));

    await waitFor(() => expect(downloadBackup).toHaveBeenCalledOnce());
    await waitFor(() => expect(toast.success).toHaveBeenCalledWith(expect.stringContaining('midnite-backup-2026.zip')));
    // Per-domain counts from the summary render next to the domain chips.
    expect(screen.getByText('12')).toBeInTheDocument();
    expect(screen.getByText(/schema v67/)).toBeInTheDocument();
  });

  it('surfaces a download failure via a toast', async () => {
    downloadBackup.mockRejectedValue(new Error('403 admin only'));
    render(<DataView />);
    fireEvent.click(screen.getByRole('button', { name: /Download backup/ }));
    await waitFor(() => expect(toast.error).toHaveBeenCalledWith('403 admin only'));
  });
});

describe('DataView — auto-backup status (Phase 49 F)', () => {
  it('shows the off state + how to enable when auto-backup is disabled', async () => {
    render(<DataView />); // default mock → disabled
    await waitFor(() => expect(screen.getByText(/Scheduled auto-backup is/)).toBeInTheDocument());
    expect(screen.getByText('backup.enabled')).toBeInTheDocument();
  });

  it('renders interval + recent archives when enabled', async () => {
    getBackupStatus.mockResolvedValue({
      enabled: true,
      intervalHours: 6,
      destinationDir: '/srv/backups',
      retention: 5,
      lastRunAt: '2026-07-05T00:00:00.000Z',
      nextRunAt: '2026-07-05T06:00:00.000Z',
      recent: [{ filename: 'midnite-backup-x.zip', sizeBytes: 2048, createdAt: '2026-07-05T00:00:00.000Z' }],
    } satisfies BackupStatus);
    render(<DataView />);
    await waitFor(() => expect(screen.getByText('midnite-backup-x.zip')).toBeInTheDocument());
    expect(screen.getByText(/\/srv\/backups/)).toBeInTheDocument();
    expect(screen.getByText('2 KB')).toBeInTheDocument();
  });
});

describe('DataView — restore (Phase 49 E)', () => {
  it('previews on file select, then merges (default) and shows the summary', async () => {
    previewImport.mockResolvedValue(importPreview);
    importArchive.mockResolvedValue({
      ok: true,
      mode: 'merge',
      inserted: { tasks: 10, projects: 3 },
      skipped: { tasks: 2 },
      reindexed: true,
      secretsRestored: 0,
      secretsSkipped: 0,
    } satisfies ImportResult);
    render(<DataView />);

    chooseArchive();
    await waitFor(() => expect(previewImport).toHaveBeenCalledOnce());
    // Preview surfaces the version verdict + per-domain counts.
    expect(await screen.findByText(/schema v67/)).toBeInTheDocument();
    expect(screen.getByText(/2 existing/)).toBeInTheDocument(); // conflicts for tasks

    // Merge is the default → Restore is enabled immediately.
    const restore = screen.getByRole('button', { name: /Restore \(merge\)/ });
    expect(restore).toBeEnabled();
    fireEvent.click(restore);

    await waitFor(() => expect(importArchive).toHaveBeenCalledWith(expect.any(File), 'merge', undefined));
    expect(await screen.findByText(/13 inserted, 2 skipped/)).toBeInTheDocument();
  });

  it('gates replace behind a typed confirmation', async () => {
    previewImport.mockResolvedValue(importPreview);
    render(<DataView />);
    chooseArchive();
    await screen.findByText(/schema v67/);

    // Switch to replace → Restore disabled until the confirm word is typed.
    fireEvent.click(screen.getByRole('radio', { name: /Replace/ }));
    const restore = screen.getByRole('button', { name: /Restore \(replace\)/ });
    expect(restore).toBeDisabled();

    fireEvent.change(screen.getByLabelText(/Type .* to confirm/), { target: { value: 'replace' } });
    expect(restore).toBeEnabled();
  });

  it('hard-blocks a newer-than-us archive with no restore path', async () => {
    previewImport.mockResolvedValue({
      ...importPreview,
      compat: 'newer-archive',
      importable: false,
    } satisfies ImportPreview);
    render(<DataView />);
    chooseArchive();

    expect(await screen.findByText(/newer midnite/)).toBeInTheDocument();
    // No restore button is offered for an un-importable archive.
    expect(screen.queryByRole('button', { name: /^Restore/ })).not.toBeInTheDocument();
  });

  it('surfaces a preview failure via a toast', async () => {
    previewImport.mockRejectedValue(new Error('403 admin only'));
    render(<DataView />);
    chooseArchive();
    await waitFor(() => expect(toast.error).toHaveBeenCalledWith('403 admin only'));
  });

  it('offers a passphrase field for a secrets-bearing archive + forwards it', async () => {
    previewImport.mockResolvedValue({
      ...importPreview,
      manifest: { ...importPreview.manifest, secretsMode: 'passphrase' },
      warnings: ['Archive holds 2 secret(s); provide the passphrase to restore them.'],
    } satisfies ImportPreview);
    importArchive.mockResolvedValue({
      ok: true, mode: 'merge', inserted: { tasks: 1 }, skipped: {}, reindexed: true, secretsRestored: 2, secretsSkipped: 0,
    } satisfies ImportResult);
    render(<DataView />);
    chooseArchive();

    // Warning + passphrase input appear.
    expect(await screen.findByText(/provide the passphrase/)).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText(/to restore this archive’s secrets/), { target: { value: 'pw123' } });
    fireEvent.click(screen.getByRole('button', { name: /Restore \(merge\)/ }));

    await waitFor(() => expect(importArchive).toHaveBeenCalledWith(expect.any(File), 'merge', 'pw123'));
    expect(await screen.findByText(/secrets: 2 restored/)).toBeInTheDocument();
  });
});

describe('DataView — export secrets (Phase 49 G)', () => {
  it('requires a passphrase before downloading with secrets, then forwards it', async () => {
    downloadBackup.mockResolvedValue({ blob: new Blob(['x']), filename: 'b.zip', summary });
    render(<DataView />);

    fireEvent.click(screen.getByLabelText(/Include secrets/));
    // Download is blocked until a passphrase is entered.
    expect(screen.getByRole('button', { name: /Download backup/ })).toBeDisabled();

    fireEvent.change(screen.getByLabelText(/Passphrase/), { target: { value: 'secret-pw' } });
    fireEvent.click(screen.getByRole('button', { name: /Download backup/ }));

    await waitFor(() =>
      expect(downloadBackup).toHaveBeenCalledWith({ includeSecrets: true, passphrase: 'secret-pw' }),
    );
  });
});
