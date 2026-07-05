import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import type { BackupSummary } from '@midnite/shared';

const downloadBackup = vi.fn();
vi.mock('@/lib/api', () => ({ downloadBackup: () => downloadBackup() }));
const toast = { success: vi.fn(), error: vi.fn() };
vi.mock('@/components/toast', () => ({ useToast: () => toast }));

import { DataView } from './data-view';

afterEach(cleanup);
beforeEach(() => {
  vi.clearAllMocks();
  // jsdom lacks these — stub so saveBlob doesn't throw.
  URL.createObjectURL = vi.fn(() => 'blob:x');
  URL.revokeObjectURL = vi.fn();
});

const summary: BackupSummary = {
  schemaVersion: 67,
  appVersion: '1.2.0',
  createdAt: '2026-07-05T00:00:00.000Z',
  domains: ['tasks', 'projects'],
  secretsMode: 'excluded',
  counts: { tasks: 12, projects: 3 },
};

describe('DataView (Phase 49 E)', () => {
  it('lists the included domains + a secrets-excluded note, restore disabled', () => {
    render(<DataView />);
    expect(screen.getByText('Included in a backup')).toBeInTheDocument();
    expect(screen.getByText('Tasks')).toBeInTheDocument();
    expect(screen.getByText('Workflows')).toBeInTheDocument();
    expect(screen.getByText(/Secrets .* are excluded/)).toBeInTheDocument();
    // Restore section is present but disabled (import lands with Theme C).
    expect(screen.getByRole('button', { name: /Restore/ })).toBeDisabled();
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
