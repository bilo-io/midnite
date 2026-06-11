import { NotFoundException } from '@nestjs/common';
import { describe, expect, it } from 'vitest';
import { MAX_GLOBAL_SOURCES } from '@midnite/shared';
import type { GlobalSourceInsert, GlobalSourceRow } from '../db/schema';
import { KnowledgeRepository } from './knowledge.repository';
import { KnowledgeService } from './knowledge.service';

class InMemoryKnowledgeRepo extends KnowledgeRepository {
  rows: GlobalSourceRow[] = [];

  constructor() {
    super({} as never);
  }

  override insertSource(row: GlobalSourceInsert): GlobalSourceRow {
    const full: GlobalSourceRow = {
      id: row.id,
      url: row.url,
      kind: row.kind,
      title: row.title ?? null,
      faviconUrl: row.faviconUrl ?? null,
      fetchedAt: row.fetchedAt ?? null,
      createdAt: row.createdAt,
    };
    this.rows.push(full);
    return full;
  }

  override listSources(): GlobalSourceRow[] {
    return this.rows;
  }

  override getSource(id: string): GlobalSourceRow | undefined {
    return this.rows.find((r) => r.id === id);
  }

  override deleteSource(id: string): void {
    this.rows = this.rows.filter((r) => r.id !== id);
  }

  override count(): number {
    return this.rows.length;
  }
}

function seed(repo: InMemoryKnowledgeRepo, n: number): void {
  for (let i = 0; i < n; i++) {
    repo.insertSource({
      id: `s${i}`,
      url: `https://example.com/${i}`,
      kind: 'link',
      createdAt: new Date().toISOString(),
    });
  }
}

describe('KnowledgeService', () => {
  it('rejects adding past the limit before any network fetch', async () => {
    const repo = new InMemoryKnowledgeRepo();
    seed(repo, MAX_GLOBAL_SOURCES);
    const service = new KnowledgeService(repo);
    await expect(service.addSource('https://example.com/extra')).rejects.toThrow(
      /at most 20 sources/,
    );
  });

  it('removes a source and returns the updated list', () => {
    const repo = new InMemoryKnowledgeRepo();
    seed(repo, 3);
    const service = new KnowledgeService(repo);
    const after = service.removeSource('s1');
    expect(after.map((s) => s.id)).toEqual(['s0', 's2']);
  });

  it('throws when removing a source that does not exist', () => {
    const repo = new InMemoryKnowledgeRepo();
    const service = new KnowledgeService(repo);
    expect(() => service.removeSource('nope')).toThrow(NotFoundException);
  });
});
