import { BadRequestException, NotFoundException } from '@nestjs/common';
import { describe, expect, it, vi } from 'vitest';
import type {
  MemoryInsert,
  MemoryRow,
  MemorySourceInsert,
  MemorySourceRow,
} from '../db/schema';
import { fakeSearchIndex } from '../test/search-index';
import { MemoriesRepository } from './memories.repository';
import { MemoriesService } from './memories.service';

// Keep source adds offline + deterministic: no Open Graph network fetch.
vi.mock('../projects/lib/opengraph', () => ({
  fetchSourceMetadata: async () => ({ title: undefined, faviconUrl: undefined }),
}));

class InMemoryMemoriesRepo extends MemoriesRepository {
  rows: MemoryRow[] = [];
  srcs: MemorySourceRow[] = [];

  constructor() {
    super({} as never);
  }

  override insertMemory(row: MemoryInsert): MemoryRow {
    const full: MemoryRow = {
      id: row.id,
      title: row.title,
      content: row.content ?? '',
      projectId: row.projectId ?? null,
      archivedAt: row.archivedAt ?? null,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
    };
    this.rows.push(full);
    return full;
  }

  override listMemories(): MemoryRow[] {
    return [...this.rows].sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
  }

  override listScoped(projectId: string): MemoryRow[] {
    return this.listMemories().filter(
      (r) => r.projectId === null || r.projectId === projectId,
    );
  }

  override getMemory(id: string): MemoryRow | undefined {
    return this.rows.find((r) => r.id === id);
  }

  override updateMemory(id: string, patch: Partial<MemoryInsert>): MemoryRow | undefined {
    const row = this.rows.find((r) => r.id === id);
    if (!row) return undefined;
    Object.assign(row, patch);
    return row;
  }

  override deleteMemory(id: string): void {
    this.rows = this.rows.filter((r) => r.id !== id);
    this.srcs = this.srcs.filter((s) => s.memoryId !== id);
  }

  override insertSource(row: MemorySourceInsert): MemorySourceRow {
    const full: MemorySourceRow = {
      id: row.id,
      memoryId: row.memoryId,
      url: row.url,
      kind: row.kind,
      title: row.title ?? null,
      faviconUrl: row.faviconUrl ?? null,
      fetchedAt: row.fetchedAt ?? null,
      createdAt: row.createdAt,
      position: row.position ?? 0,
    };
    this.srcs.push(full);
    return full;
  }

  override listSources(memoryId: string): MemorySourceRow[] {
    return this.srcs
      .filter((s) => s.memoryId === memoryId)
      .sort((a, b) => a.position - b.position || a.createdAt.localeCompare(b.createdAt));
  }

  override getSource(memoryId: string, sourceId: string): MemorySourceRow | undefined {
    return this.srcs.find((s) => s.memoryId === memoryId && s.id === sourceId);
  }

  override deleteSource(memoryId: string, sourceId: string): void {
    this.srcs = this.srcs.filter((s) => !(s.memoryId === memoryId && s.id === sourceId));
  }

  override countSources(memoryId: string): number {
    return this.listSources(memoryId).length;
  }

  override nextSourcePosition(memoryId: string): number {
    return this.listSources(memoryId).reduce((max, s) => Math.max(max, s.position), -1) + 1;
  }

  override reorderSources(memoryId: string, orderedIds: string[]): void {
    orderedIds.forEach((id, position) => {
      const row = this.srcs.find((s) => s.memoryId === memoryId && s.id === id);
      if (row) row.position = position;
    });
  }
}

describe('MemoriesService', () => {
  it('creates a global memory when no project is given', async () => {
    const service = new MemoriesService(new InMemoryMemoriesRepo(), fakeSearchIndex());
    const memory = await service.createMemory({ title: 'Conventions', content: '# Rules' });
    expect(memory.projectId).toBeNull();
    expect(memory.title).toBe('Conventions');
    expect(memory.sources).toEqual([]);
    expect(service.listMemories().map((m) => m.id)).toEqual([memory.id]);
  });

  it('creates a memory with staged sources in order', async () => {
    const service = new MemoriesService(new InMemoryMemoriesRepo(), fakeSearchIndex());
    const memory = await service.createMemory({
      title: 'API notes',
      content: '',
      sources: ['https://a.example/1', 'https://b.example/2', 'https://c.example/3'],
    });
    expect(memory.sources.map((s) => s.url)).toEqual([
      'https://a.example/1',
      'https://b.example/2',
      'https://c.example/3',
    ]);
  });

  it('updates only the provided fields and re-scopes on explicit null', async () => {
    const service = new MemoriesService(new InMemoryMemoriesRepo(), fakeSearchIndex());
    const created = await service.createMemory({ title: 'API notes', content: 'v1', projectId: 'p1' });

    const renamed = service.updateMemory(created.id, { title: 'API notes v2' });
    expect(renamed.title).toBe('API notes v2');
    expect(renamed.content).toBe('v1');
    expect(renamed.projectId).toBe('p1');

    const globalised = service.updateMemory(created.id, { projectId: null });
    expect(globalised.projectId).toBeNull();
  });

  it('throws when updating or removing a memory that does not exist', () => {
    const service = new MemoriesService(new InMemoryMemoriesRepo(), fakeSearchIndex());
    expect(() => service.updateMemory('nope', { title: 'x' })).toThrow(NotFoundException);
    expect(() => service.removeMemory('nope')).toThrow(NotFoundException);
  });

  it('removes a memory and cascades its sources', async () => {
    const service = new MemoriesService(new InMemoryMemoriesRepo(), fakeSearchIndex());
    const a = await service.createMemory({
      title: 'a',
      content: '',
      sources: ['https://a.example/1'],
    });
    const b = await service.createMemory({ title: 'b', content: '' });
    service.removeMemory(a.id);
    expect(service.listMemories().map((m) => m.id)).toEqual([b.id]);
    // The removed memory's sources are gone too — re-adding scopes cleanly.
    expect(() => service.getMemory(a.id)).toThrow(NotFoundException);
  });

  it('adds, lists and removes sources, enforcing the limit', async () => {
    const repo = new InMemoryMemoriesRepo();
    const service = new MemoriesService(repo, fakeSearchIndex());
    const memory = await service.createMemory({ title: 'm', content: '' });

    // Seed at the limit directly so addSource rejects before any fetch.
    for (let i = 0; i < 10; i++) {
      repo.insertSource({
        id: `s${i}`,
        memoryId: memory.id,
        url: `https://example.com/${i}`,
        kind: 'link',
        createdAt: new Date().toISOString(),
        position: i,
      });
    }
    await expect(service.addSource(memory.id, 'https://example.com/extra')).rejects.toThrow(
      /at most 10 sources/,
    );

    const afterRemove = service.removeSource(memory.id, 's3');
    expect(afterRemove.sources.find((s) => s.id === 's3')).toBeUndefined();
    expect(afterRemove.sources).toHaveLength(9);
  });

  it('reorders sources and rejects an incomplete id set', async () => {
    const repo = new InMemoryMemoriesRepo();
    const service = new MemoriesService(repo, fakeSearchIndex());
    const memory = await service.createMemory({
      title: 'm',
      content: '',
      sources: ['https://a.example/1', 'https://b.example/2', 'https://c.example/3'],
    });
    const ids = memory.sources.map((s) => s.id);

    const reordered = service.reorderSources(memory.id, [ids[2]!, ids[0]!, ids[1]!]);
    expect(reordered.sources.map((s) => s.id)).toEqual([ids[2], ids[0], ids[1]]);

    expect(() => service.reorderSources(memory.id, [ids[0]!])).toThrow(BadRequestException);
  });

  it('listScoped returns global plus the project memories', async () => {
    const service = new MemoriesService(new InMemoryMemoriesRepo(), fakeSearchIndex());
    const g = await service.createMemory({ title: 'global', content: '' });
    const p1 = await service.createMemory({ title: 'p1', content: '', projectId: 'p1' });
    await service.createMemory({ title: 'p2', content: '', projectId: 'p2' });

    const scoped = service.listScoped('p1').map((m) => m.id).sort();
    expect(scoped).toEqual([g.id, p1.id].sort());
  });
});
