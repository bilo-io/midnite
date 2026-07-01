import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { InboundSourceRow } from '../../db/schema';
import { InboundSourcesRepository } from './inbound-sources.repository';
import {
  InboundSourceDoesNotExistError,
  InboundSourceForbiddenError,
  InboundSourcesService,
} from './inbound-sources.service';

// In-memory fake of the repository — no DB. Mirrors the webhooks service specs.
class FakeRepo {
  rows: InboundSourceRow[] = [];
  list(teamId: string | null): InboundSourceRow[] {
    return this.rows.filter((r) => (r.teamId ?? null) === teamId);
  }
  findById(id: string): InboundSourceRow | undefined {
    return this.rows.find((r) => r.id === id);
  }
  insert(row: InboundSourceRow): InboundSourceRow {
    this.rows.push(row);
    return row;
  }
  update(id: string, fields: Partial<InboundSourceRow>): InboundSourceRow | undefined {
    const row = this.rows.find((r) => r.id === id);
    if (!row) return undefined;
    Object.assign(row, fields);
    return row;
  }
  remove(id: string): void {
    this.rows = this.rows.filter((r) => r.id !== id);
  }
}

function makeService(teams?: { getMembership: (t: string, u: string) => string | null }) {
  const repo = new FakeRepo();
  // Default to a permissive admin stub so the team-scoping tests aren't gated by
  // RBAC; the dedicated RBAC test passes its own stub.
  const teamsStub = teams ?? { getMembership: () => 'admin' };
  const service = new InboundSourcesService(
    repo as unknown as InboundSourcesRepository,
    undefined, // no crypto → secret stored raw (test)
    teamsStub as never,
  );
  return { repo, service };
}

describe('InboundSourcesService', () => {
  let ctx: ReturnType<typeof makeService>;
  beforeEach(() => {
    ctx = makeService();
  });

  it('create returns the source + a prefixed secret (revealed once), stores it, hides it on read', () => {
    const { service, repo } = ctx;
    const { source, secret } = service.create(null, null, {
      provider: 'github',
      eventFilter: { events: ['issues.opened'] },
      enabled: true,
    });
    expect(secret).toMatch(/^insec_/);
    expect(source.provider).toBe('github');
    expect(source.eventFilter.events).toEqual(['issues.opened']);
    // The read shape never carries the secret; the stored row does.
    expect((source as Record<string, unknown>).secret).toBeUndefined();
    expect(repo.rows[0]!.secret).toBe(secret);
  });

  it('list is team-scoped and secret-free', () => {
    const { service } = ctx;
    service.create('team-a', 'u1', { provider: 'generic', eventFilter: { events: [] }, enabled: true });
    service.create('team-b', 'u2', { provider: 'linear', eventFilter: { events: [] }, enabled: true });
    const a = service.list('team-a');
    expect(a).toHaveLength(1);
    expect(a[0]!.provider).toBe('generic');
  });

  it('update mutates fields and 404s on unknown id', () => {
    const { service } = ctx;
    const { source } = service.create(null, null, { provider: 'github', eventFilter: { events: [] }, enabled: true });
    const updated = service.update(source.id, null, null, { enabled: false, defaultRepo: 'web' });
    expect(updated.enabled).toBe(false);
    expect(updated.defaultRepo).toBe('web');
    expect(() => service.update('nope', null, null, { enabled: true })).toThrow(InboundSourceDoesNotExistError);
  });

  it('rotateSecret issues a new secret and keeps the source', () => {
    const { service, repo } = ctx;
    const { source, secret } = service.create(null, null, { provider: 'github', eventFilter: { events: [] }, enabled: true });
    const rotated = service.rotateSecret(source.id, null, null);
    expect(rotated.secret).not.toBe(secret);
    expect(repo.rows[0]!.secret).toBe(rotated.secret);
  });

  it('remove deletes within scope', () => {
    const { service, repo } = ctx;
    const { source } = service.create(null, null, { provider: 'generic', eventFilter: { events: [] }, enabled: true });
    service.remove(source.id, null, null);
    expect(repo.rows).toHaveLength(0);
  });

  it('a non-team-owned source is invisible / 404 to another team', () => {
    const { service } = ctx;
    const { source } = service.create('team-a', 'u1', { provider: 'github', eventFilter: { events: [] }, enabled: true });
    expect(() => service.update(source.id, 'team-b', 'u2', { enabled: false })).toThrow(
      InboundSourceDoesNotExistError,
    );
  });

  it('mutations require team-admin when a team is present', () => {
    const teams = { getMembership: vi.fn().mockReturnValue('member') };
    const { service } = makeService(teams);
    expect(() =>
      service.create('team-a', 'u1', { provider: 'github', eventFilter: { events: [] }, enabled: true }),
    ).toThrow(InboundSourceForbiddenError);
    teams.getMembership.mockReturnValue('admin');
    expect(() =>
      service.create('team-a', 'u1', { provider: 'github', eventFilter: { events: [] }, enabled: true }),
    ).not.toThrow();
  });
});
