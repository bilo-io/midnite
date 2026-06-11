import { NotFoundException } from '@nestjs/common';
import { describe, expect, it } from 'vitest';
import type { MemoryInsert, MemoryRow } from '../db/schema';
import { MemoriesRepository } from './memories.repository';
import { MemoriesService } from './memories.service';

class InMemoryMemoriesRepo extends MemoriesRepository {
  rows: MemoryRow[] = [];

  constructor() {
    super({} as never);
  }

  override insertMemory(row: MemoryInsert): MemoryRow {
    const full: MemoryRow = {
      id: row.id,
      title: row.title,
      content: row.content ?? '',
      projectId: row.projectId ?? null,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
    };
    this.rows.push(full);
    return full;
  }

  override listMemories(): MemoryRow[] {
    return [...this.rows].sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
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
  }
}

describe('MemoriesService', () => {
  it('creates a global memory when no project is given', () => {
    const repo = new InMemoryMemoriesRepo();
    const service = new MemoriesService(repo);
    const memory = service.createMemory({ title: 'Conventions', content: '# Rules' });
    expect(memory.projectId).toBeNull();
    expect(memory.title).toBe('Conventions');
    expect(service.listMemories().map((m) => m.id)).toEqual([memory.id]);
  });

  it('updates only the provided fields and re-scopes on explicit null', () => {
    const repo = new InMemoryMemoriesRepo();
    const service = new MemoriesService(repo);
    const created = service.createMemory({ title: 'API notes', content: 'v1', projectId: 'p1' });

    const renamed = service.updateMemory(created.id, { title: 'API notes v2' });
    expect(renamed.title).toBe('API notes v2');
    expect(renamed.content).toBe('v1');
    expect(renamed.projectId).toBe('p1');

    const globalised = service.updateMemory(created.id, { projectId: null });
    expect(globalised.projectId).toBeNull();
  });

  it('throws when updating or removing a memory that does not exist', () => {
    const service = new MemoriesService(new InMemoryMemoriesRepo());
    expect(() => service.updateMemory('nope', { title: 'x' })).toThrow(NotFoundException);
    expect(() => service.removeMemory('nope')).toThrow(NotFoundException);
  });

  it('removes a memory', () => {
    const repo = new InMemoryMemoriesRepo();
    const service = new MemoriesService(repo);
    const a = service.createMemory({ title: 'a', content: '' });
    const b = service.createMemory({ title: 'b', content: '' });
    service.removeMemory(a.id);
    expect(service.listMemories().map((m) => m.id)).toEqual([b.id]);
  });
});
