import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createTestDb, type TestDbHandle } from '../test/db';
import { CouncilsRepository } from './councils.repository';
import { CouncilsService } from './councils.service';

// Phase 60 E (TX-3) — createCouncil must be atomic: a starter-member insert
// throwing must NOT leave a half-seeded council. Real SQLite transaction.
describe('CouncilsService.createCouncil atomicity (Phase 60 E)', () => {
  let handle: TestDbHandle;
  let repo: CouncilsRepository;
  let service: CouncilsService;

  beforeEach(() => {
    handle = createTestDb();
    repo = new CouncilsRepository(handle.db);
    service = new CouncilsService(repo);
  });

  afterEach(() => handle.close());

  it('rolls the council row back when a starter-member insert throws', () => {
    vi.spyOn(repo, 'insertMember').mockImplementation(() => {
      throw new Error('boom: member insert failed');
    });
    expect(() => service.createCouncil({ name: 'Design review' })).toThrow(/boom/);
    // No half-seeded council persisted.
    expect(service.listCouncils()).toHaveLength(0);
  });

  it('persists the council + all starter members on success', () => {
    const council = service.createCouncil({ name: 'Design review' });
    expect(service.listCouncils()).toHaveLength(1);
    expect(council.members.length).toBeGreaterThan(0);
  });
});
