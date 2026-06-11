import { describe, expect, it } from 'vitest';
import {
  CouncilDoesNotExistError,
  CouncilParticipantDoesNotExistError,
  CouncilsService,
} from './councils.service';
import { InMemoryCouncilsRepo } from './test-fixtures';

function makeService(): { service: CouncilsService; repo: InMemoryCouncilsRepo } {
  const repo = new InMemoryCouncilsRepo();
  return { service: new CouncilsService(repo), repo };
}

describe('CouncilsService', () => {
  it('creates and lists councils with embedded participants', () => {
    const { service } = makeService();
    const council = service.createCouncil({ name: 'Tech direction', description: 'arch calls' });
    service.createParticipant(council.id, { name: 'Optimist', provider: 'claude' });
    service.createParticipant(council.id, { name: 'Skeptic', provider: 'gemini' });

    const listed = service.listCouncils();
    expect(listed).toHaveLength(1);
    expect(listed[0]!.participants.map((p) => p.name)).toEqual(['Optimist', 'Skeptic']);
  });

  it('coalesces a blank participant to defaults', () => {
    const { service } = makeService();
    const council = service.createCouncil({ name: 'c' });
    const p = service.createParticipant(council.id, {});
    expect(p.name).toBe('');
    expect(p.provider).toBe('claude');
    expect(p.perspective).toBe('');
  });

  it('updates and deletes participants, touching the council updatedAt', () => {
    const { service } = makeService();
    const council = service.createCouncil({ name: 'c' });
    const p = service.createParticipant(council.id, { name: 'a' });

    const updated = service.updateParticipant(council.id, p.id, {
      perspective: 'argue for caution',
      provider: 'codex',
    });
    expect(updated.perspective).toBe('argue for caution');
    expect(updated.provider).toBe('codex');

    service.deleteParticipant(council.id, p.id);
    expect(service.getCouncil(council.id).participants).toHaveLength(0);
  });

  it('throws DoesNotExist errors for unknown ids', () => {
    const { service } = makeService();
    expect(() => service.getCouncil('nope')).toThrow(CouncilDoesNotExistError);
    expect(() => service.updateCouncil('nope', { name: 'x' })).toThrow(CouncilDoesNotExistError);
    expect(() => service.createParticipant('nope', {})).toThrow(CouncilDoesNotExistError);

    const council = service.createCouncil({ name: 'c' });
    expect(() => service.updateParticipant(council.id, 'nope', {})).toThrow(
      CouncilParticipantDoesNotExistError,
    );
    // A participant of another council is not reachable through this one.
    const other = service.createCouncil({ name: 'other' });
    const p = service.createParticipant(other.id, {});
    expect(() => service.deleteParticipant(council.id, p.id)).toThrow(
      CouncilParticipantDoesNotExistError,
    );
  });

  it('deleting a council removes its participants and run history', () => {
    const { service, repo } = makeService();
    const council = service.createCouncil({ name: 'c' });
    service.createParticipant(council.id, {});
    repo.insertRun({
      id: 'r1',
      councilId: council.id,
      topic: 't',
      status: 'completed',
      startedAt: new Date().toISOString(),
    });
    repo.insertRunParticipant({
      id: 'rp1',
      runId: 'r1',
      participantId: 'p1',
      name: '',
      provider: 'claude',
      perspective: '',
      status: 'succeeded',
      terminalId: 'council-r1-p1',
      startedAt: new Date().toISOString(),
    });

    service.deleteCouncil(council.id);
    expect(repo.councils).toHaveLength(0);
    expect(repo.participants).toHaveLength(0);
    expect(repo.runs).toHaveLength(0);
    expect(repo.runParticipants).toHaveLength(0);
  });
});
