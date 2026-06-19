import { resolve } from 'node:path';
import Database from 'better-sqlite3';
import { drizzle } from 'drizzle-orm/better-sqlite3';
import { migrate } from 'drizzle-orm/better-sqlite3/migrator';
import { beforeEach, describe, expect, it } from 'vitest';
import { BRAINSTORM_STARTER_LENSES } from '@midnite/shared';
import * as schema from '../db/schema';
import { BrainstormsRepository } from './brainstorms.repository';
import { BrainstormsService } from './brainstorms.service';

function makeService(): BrainstormsService {
  const sqlite = new Database(':memory:');
  const db = drizzle(sqlite, { schema });
  migrate(db, { migrationsFolder: resolve(process.cwd(), 'drizzle') });
  return new BrainstormsService(new BrainstormsRepository(db));
}

let service: BrainstormsService;

beforeEach(() => {
  service = makeService();
});

describe('BrainstormsService.createBrainstorm', () => {
  it('applies synthProvider + defaultMode defaults', () => {
    const b = service.createBrainstorm({ name: 'Growth' });
    expect(b.synthProvider).toBe('gemini');
    expect(b.defaultMode).toBe('shortlist');
  });

  it('seeds the starter lenses as ordered, editable contributors', () => {
    const b = service.createBrainstorm({ name: 'Growth' });
    expect(b.contributors).toHaveLength(BRAINSTORM_STARTER_LENSES.length);
    expect(b.contributors.map((c) => c.name)).toEqual(
      BRAINSTORM_STARTER_LENSES.map((l) => l.name),
    );
    expect(b.contributors.map((c) => c.position)).toEqual(
      BRAINSTORM_STARTER_LENSES.map((_, i) => i),
    );
    expect(b.contributors.every((c) => c.provider === 'claude')).toBe(true);
  });

  it('seeded contributors are removable like any other', () => {
    const b = service.createBrainstorm({ name: 'Growth' });
    service.deleteContributor(b.id, b.contributors[0]!.id);
    expect(service.getBrainstorm(b.id).contributors).toHaveLength(
      BRAINSTORM_STARTER_LENSES.length - 1,
    );
  });
});
