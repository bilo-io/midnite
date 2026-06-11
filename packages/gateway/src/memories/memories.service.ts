import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import type { CreateMemoryRequest, Memory, UpdateMemoryRequest } from '@midnite/shared';
import { MemoriesRepository } from './memories.repository';

@Injectable()
export class MemoriesService {
  constructor(@Inject(MemoriesRepository) private readonly repo: MemoriesRepository) {}

  listMemories(): Memory[] {
    return this.repo.listMemories().map((r) => this.repo.toMemory(r));
  }

  createMemory(req: CreateMemoryRequest): Memory {
    const now = new Date().toISOString();
    const row = this.repo.insertMemory({
      id: randomUUID(),
      title: req.title,
      content: req.content,
      projectId: req.projectId ?? null,
      createdAt: now,
      updatedAt: now,
    });
    return this.repo.toMemory(row);
  }

  updateMemory(id: string, req: UpdateMemoryRequest): Memory {
    if (!this.repo.getMemory(id)) throw new NotFoundException(`memory ${id} not found`);
    const row = this.repo.updateMemory(id, {
      ...(req.title !== undefined ? { title: req.title } : {}),
      ...(req.content !== undefined ? { content: req.content } : {}),
      ...(req.projectId !== undefined ? { projectId: req.projectId } : {}),
      updatedAt: new Date().toISOString(),
    });
    if (!row) throw new NotFoundException(`memory ${id} not found`);
    return this.repo.toMemory(row);
  }

  removeMemory(id: string): void {
    if (!this.repo.getMemory(id)) throw new NotFoundException(`memory ${id} not found`);
    this.repo.deleteMemory(id);
  }
}
