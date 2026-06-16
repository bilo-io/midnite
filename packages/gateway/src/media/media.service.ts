import { HttpException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import type { CreateMediaBody, Media, MediaType, UpdateMediaBody } from '@midnite/shared';
import { MediaRepository } from './media.repository';
import type { MediaInsert } from '../db/schema';

@Injectable()
export class MediaService {
  constructor(@Inject(MediaRepository) private readonly repo: MediaRepository) {}

  listMedia(projectId?: string, type?: MediaType): Media[] {
    return this.repo.list(projectId, type).map((r) => this.repo.hydrate(r));
  }

  getMedia(id: string): Media {
    const row = this.repo.get(id);
    if (!row) throw new NotFoundException(`media ${id} not found`);
    return this.repo.hydrate(row);
  }

  createMedia(req: CreateMediaBody): Media {
    const id = randomUUID();
    const now = new Date().toISOString();
    const row = this.repo.insert({
      id,
      projectId: req.projectId ?? null,
      type: req.type,
      title: req.title,
      description: req.description ?? null,
      filePath: req.filePath,
      mimeType: req.mimeType,
      fileSize: req.fileSize,
      width: req.width ?? null,
      height: req.height ?? null,
      duration: req.duration ?? null,
      prompt: req.prompt ?? null,
      tags: JSON.stringify(req.tags),
      createdAt: now,
      updatedAt: now,
    });
    return this.repo.hydrate(row);
  }

  updateMedia(id: string, req: UpdateMediaBody): Media {
    if (!this.repo.get(id)) throw new NotFoundException(`media ${id} not found`);
    const now = new Date().toISOString();
    const patch: Partial<MediaInsert> = { updatedAt: now };
    if (req.title !== undefined) patch.title = req.title;
    if (req.description !== undefined) patch.description = req.description ?? null;
    if (req.projectId !== undefined) patch.projectId = req.projectId ?? null;
    if (req.filePath !== undefined) patch.filePath = req.filePath;
    if (req.mimeType !== undefined) patch.mimeType = req.mimeType;
    if (req.fileSize !== undefined) patch.fileSize = req.fileSize;
    if (req.width !== undefined) patch.width = req.width ?? null;
    if (req.height !== undefined) patch.height = req.height ?? null;
    if (req.duration !== undefined) patch.duration = req.duration ?? null;
    if (req.prompt !== undefined) patch.prompt = req.prompt ?? null;
    if (req.tags !== undefined) patch.tags = JSON.stringify(req.tags);
    this.repo.update(id, patch);
    return this.repo.hydrate(this.repo.get(id)!);
  }

  deleteMedia(id: string): void {
    if (!this.repo.get(id)) throw new NotFoundException(`media ${id} not found`);
    this.repo.delete(id);
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  generateMedia(_id: string): never {
    throw new HttpException('generate not yet implemented', 501);
  }

  getFilePath(id: string): string {
    const row = this.repo.get(id);
    if (!row) throw new NotFoundException(`media ${id} not found`);
    if (!row.filePath) throw new NotFoundException(`media ${id} has no file`);
    return row.filePath;
  }
}
