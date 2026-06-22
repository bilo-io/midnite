import { describe, expect, it } from 'vitest';
import { COUNCIL_STARTER_MEMBERS } from '@midnite/shared';
import {
  CouncilDoesNotExistError,
  CouncilMemberDoesNotExistError,
  CouncilsService,
} from './councils.service';
import { fakeSearchIndex } from '../test/search-index';
import { InMemoryCouncilsRepo } from './test-fixtures';

function makeService(): { service: CouncilsService; repo: InMemoryCouncilsRepo } {
  const repo = new InMemoryCouncilsRepo();
  return { service: new CouncilsService(repo, fakeSearchIndex()), repo };
}

describe('CouncilsService', () => {
  it('creates a council with starter members and persists its settings', () => {
    const { service } = makeService();
    const council = service.createCouncil({
      name: 'Tech direction',
      description: 'arch calls',
      synthProvider: 'codex',
      defaultFormat: 'debate',
      customPrompt: 'Summarize as a memo.',
    });
    expect(council.synthProvider).toBe('codex');
    expect(council.defaultFormat).toBe('debate');
    expect(council.customPrompt).toBe('Summarize as a memo.');
    expect(council.members.map((m) => m.name)).toEqual(COUNCIL_STARTER_MEMBERS.map((m) => m.name));
  });

  it('defaults provider + format and seeds starter members on a bare create', () => {
    const { service } = makeService();
    const c = service.createCouncil({ name: 'c' });
    expect(c.synthProvider).toBe('gemini');
    expect(c.defaultFormat).toBe('brainstorm');
    expect(c.members).toHaveLength(COUNCIL_STARTER_MEMBERS.length);
  });

  it('updates the default format and custom prompt', () => {
    const { service } = makeService();
    const c = service.createCouncil({ name: 'c' });
    const u = service.updateCouncil(c.id, { defaultFormat: 'analyse', customPrompt: 'x' });
    expect(u.defaultFormat).toBe('analyse');
    expect(u.customPrompt).toBe('x');
  });

  it('coalesces a blank member to defaults and appends it last', () => {
    const { service } = makeService();
    const c = service.createCouncil({ name: 'c' });
    const m = service.createMember(c.id, {});
    expect(m.name).toBe('');
    expect(m.provider).toBe('claude');
    expect(m.role).toBe('');
    const members = service.getCouncil(c.id).members;
    expect(members[members.length - 1]!.id).toBe(m.id);
  });

  it('updates and deletes members, touching the council updatedAt', () => {
    const { service } = makeService();
    const c = service.createCouncil({ name: 'c' });
    const m = service.createMember(c.id, { name: 'a' });

    const updated = service.updateMember(c.id, m.id, {
      role: 'argue for caution',
      provider: 'codex',
    });
    expect(updated.role).toBe('argue for caution');
    expect(updated.provider).toBe('codex');

    const before = service.getCouncil(c.id).members.length;
    service.deleteMember(c.id, m.id);
    expect(service.getCouncil(c.id).members).toHaveLength(before - 1);
  });

  it('reorders members, and new ones append to the end', () => {
    const { service } = makeService();
    const c = service.createCouncil({ name: 'c' });
    const ids = service.getCouncil(c.id).members.map((m) => m.id);
    const reversed = [...ids].reverse();

    const reordered = service.reorderMembers(c.id, reversed);
    expect(reordered.members.map((m) => m.id)).toEqual(reversed);

    // A freshly added member lands last, regardless of the new order.
    const fresh = service.createMember(c.id, { name: 'New' });
    const after = service.getCouncil(c.id).members.map((m) => m.id);
    expect(after[after.length - 1]).toBe(fresh.id);
  });

  it('rejects a reorder that is not exactly the current member set', () => {
    const { service } = makeService();
    const c = service.createCouncil({ name: 'c' });
    const ids = service.getCouncil(c.id).members.map((m) => m.id);

    expect(() => service.reorderMembers(c.id, ids.slice(1))).toThrow(CouncilMemberDoesNotExistError);
    expect(() =>
      service.reorderMembers(c.id, [ids[0]!, ids[0]!, ids[2]!, ids[3]!]),
    ).toThrow(CouncilMemberDoesNotExistError);
    expect(() => service.reorderMembers(c.id, [...ids, 'ghost'])).toThrow(
      CouncilMemberDoesNotExistError,
    );
  });

  it('throws DoesNotExist errors for unknown ids', () => {
    const { service } = makeService();
    expect(() => service.getCouncil('nope')).toThrow(CouncilDoesNotExistError);
    expect(() => service.updateCouncil('nope', { name: 'x' })).toThrow(CouncilDoesNotExistError);
    expect(() => service.createMember('nope', {})).toThrow(CouncilDoesNotExistError);

    const council = service.createCouncil({ name: 'c' });
    expect(() => service.updateMember(council.id, 'nope', {})).toThrow(
      CouncilMemberDoesNotExistError,
    );
    // A member of another council is not reachable through this one.
    const other = service.createCouncil({ name: 'other' });
    const m = service.createMember(other.id, {});
    expect(() => service.deleteMember(council.id, m.id)).toThrow(CouncilMemberDoesNotExistError);
  });

  it('deleting a council removes its members and run history', () => {
    const { service, repo } = makeService();
    const council = service.createCouncil({ name: 'c' });
    repo.insertRun({
      id: 'r1',
      councilId: council.id,
      prompt: 't',
      format: 'brainstorm',
      status: 'completed',
      startedAt: new Date().toISOString(),
    });
    repo.insertRunMember({
      id: 'rm1',
      runId: 'r1',
      memberId: 'm1',
      name: '',
      provider: 'claude',
      role: '',
      status: 'succeeded',
      terminalId: 'council-r1-m1',
      startedAt: new Date().toISOString(),
    });

    service.deleteCouncil(council.id);
    expect(repo.councils).toHaveLength(0);
    expect(repo.members).toHaveLength(0);
    expect(repo.runs).toHaveLength(0);
    expect(repo.runMembers).toHaveLength(0);
  });
});
