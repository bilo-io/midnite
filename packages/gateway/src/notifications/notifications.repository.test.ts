import { beforeEach, describe, expect, it } from 'vitest';
import { createTestDb } from '../test';
import { NotificationsRepository } from './notifications.repository';
import type { NotificationInsert } from '../db/schema';

const NOW = '2026-01-01T00:00:00.000Z';

function note(id: string, overrides: Partial<NotificationInsert> = {}): NotificationInsert {
  return {
    id,
    kind: 'task_done',
    severity: 'info',
    title: id,
    body: '',
    entityType: 'task',
    entityId: id,
    route: `/tasks/${id}`,
    readAt: null,
    createdAt: NOW,
    teamId: null,
    ...overrides,
  };
}

describe('NotificationsRepository — TeamScope', () => {
  let repo: NotificationsRepository;

  beforeEach(() => {
    const { db } = createTestDb();
    repo = new NotificationsRepository(db);

    // team-1 notification
    repo.insert(note('n-team1', { teamId: 'team-1' }));
    // team-2 notification
    repo.insert(note('n-team2', { teamId: 'team-2' }));
    // legacy (system) notification — no team, visible to all
    repo.insert(note('n-legacy', { teamId: null }));
  });

  it('no scope → returns all notifications (backward compat)', () => {
    const ids = repo.list(100, 0, undefined).map((n) => n.id);
    expect(ids).toContain('n-team1');
    expect(ids).toContain('n-team2');
    expect(ids).toContain('n-legacy');
  });

  it('scope with team-1 → returns team-1 + legacy, excludes team-2', () => {
    const ids = repo.list(100, 0, { userId: 'user-a', teamId: 'team-1' }).map((n) => n.id);
    expect(ids).toContain('n-team1');
    expect(ids).toContain('n-legacy');
    expect(ids).not.toContain('n-team2');
  });

  it('scope with team-2 → returns team-2 + legacy, excludes team-1', () => {
    const ids = repo.list(100, 0, { userId: 'user-b', teamId: 'team-2' }).map((n) => n.id);
    expect(ids).toContain('n-team2');
    expect(ids).toContain('n-legacy');
    expect(ids).not.toContain('n-team1');
  });

  it('scope with teamId null → no team filter applied, returns all (backward compat)', () => {
    // A user with no team (teamId = null) is treated as a legacy single-user install;
    // the WHERE clause is omitted and all notifications are visible — same as no scope.
    const ids = repo.list(100, 0, { userId: 'user-c', teamId: null }).map((n) => n.id);
    expect(ids).toContain('n-legacy');
    expect(ids).toContain('n-team1');
    expect(ids).toContain('n-team2');
  });

  describe('countUnread', () => {
    beforeEach(() => {
      // Clear and add fresh unread entries per scope
      const { db } = createTestDb();
      repo = new NotificationsRepository(db);
      repo.insert(note('u-team1', { teamId: 'team-1', readAt: null }));
      repo.insert(note('u-team2', { teamId: 'team-2', readAt: null }));
      repo.insert(note('u-legacy', { teamId: null, readAt: null }));
      repo.insert(note('u-read', { teamId: 'team-1', readAt: NOW }));
    });

    it('no scope counts all unread', () => {
      expect(repo.countUnread(undefined)).toBe(3);
    });

    it('team-1 scope counts team-1 + legacy unread only', () => {
      expect(repo.countUnread({ userId: 'u', teamId: 'team-1' })).toBe(2);
    });

    it('team-2 scope counts team-2 + legacy unread only', () => {
      expect(repo.countUnread({ userId: 'u', teamId: 'team-2' })).toBe(2);
    });

    it('null-team scope counts all unread (no filter — backward compat)', () => {
      // teamId = null → WHERE is omitted, same as no scope.
      expect(repo.countUnread({ userId: 'u', teamId: null })).toBe(3);
    });

    it('read notifications are excluded', () => {
      // u-read is in team-1 but already read
      expect(repo.countUnread({ userId: 'u', teamId: 'team-1' })).toBe(2); // u-team1 + u-legacy, not u-read
    });
  });
});
