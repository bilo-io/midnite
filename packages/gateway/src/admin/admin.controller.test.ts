import { BadRequestException } from '@nestjs/common';
import { describe, expect, it, vi } from 'vitest';
import type { AdminTeamSummary, AdminUserSummary, BackupResponse, PlatformOverview } from '@midnite/shared';
import type { AdminReadService } from './admin-read.service';
import type { BackupService } from './backup.service';
import { AdminController } from './admin.controller';

const fakeBackup = { dir: '/backups/x', dbBytes: 1, uploadsCopied: 0 } as unknown as BackupResponse;
const fakeUsers: AdminUserSummary[] = [
  { id: 'u1', email: 'a@x.io', name: 'A', createdAt: '2026-01-01T00:00:00Z', teamCount: 2 },
];
const fakeTeams: AdminTeamSummary[] = [
  { id: 't1', slug: 'acme', name: 'Acme', createdAt: '2026-01-01T00:00:00Z', memberCount: 3 },
];
const fakeOverview: PlatformOverview = {
  users: 1,
  teams: 1,
  projects: 4,
  tasks: { backlog: 0, todo: 2, wip: 1, waiting: 0, done: 5, abandoned: 1 },
  activeSessions: 1,
  costUsd: 12.5,
};

function build(overrides: Partial<Record<keyof BackupService, unknown>> = {}) {
  const backup = { backup: vi.fn(async () => fakeBackup), ...overrides } as unknown as BackupService;
  const read = {
    listUsers: vi.fn(() => fakeUsers),
    listTeams: vi.fn(() => fakeTeams),
    overview: vi.fn(() => fakeOverview),
  } as unknown as AdminReadService;
  return { controller: new AdminController(backup, read), backup, read };
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

  it('delegates the operator read routes to AdminReadService', () => {
    const { controller, read } = build();
    expect(controller.listUsers()).toBe(fakeUsers);
    expect(controller.listTeams()).toBe(fakeTeams);
    expect(controller.overview()).toBe(fakeOverview);
    expect(read.listUsers).toHaveBeenCalledOnce();
    expect(read.listTeams).toHaveBeenCalledOnce();
    expect(read.overview).toHaveBeenCalledOnce();
  });
});
