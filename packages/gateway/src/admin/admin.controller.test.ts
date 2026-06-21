import { BadRequestException } from '@nestjs/common';
import { describe, expect, it, vi } from 'vitest';
import type { BackupResponse } from '@midnite/shared';
import type { BackupService } from './backup.service';
import { AdminController } from './admin.controller';

const fakeBackup = { dir: '/backups/x', dbBytes: 1, uploadsCopied: 0 } as unknown as BackupResponse;

function build(overrides: Partial<Record<keyof BackupService, unknown>> = {}) {
  const backup = { backup: vi.fn(async () => fakeBackup), ...overrides } as unknown as BackupService;
  return { controller: new AdminController(backup), backup };
}

describe('AdminController', () => {
  it('rejects a non-string dir (400)', async () => {
    const { controller } = build();
    await expect(controller.createBackup({ dir: 42 })).rejects.toThrow(BadRequestException);
  });

  it('defaults an empty body and delegates with undefined dir', async () => {
    const { controller, backup } = build();
    expect(await controller.createBackup(undefined)).toEqual(fakeBackup);
    expect(backup.backup).toHaveBeenCalledWith(undefined);
  });

  it('passes a valid dir through', async () => {
    const { controller, backup } = build();
    await controller.createBackup({ dir: '/tmp/b' });
    expect(backup.backup).toHaveBeenCalledWith('/tmp/b');
  });
});
