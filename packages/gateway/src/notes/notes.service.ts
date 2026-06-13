import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import type { CreateNoteRequest, Note, UpdateNoteRequest } from '@midnite/shared';
import { NotesRepository } from './notes.repository';

@Injectable()
export class NotesService {
  constructor(@Inject(NotesRepository) private readonly repo: NotesRepository) {}

  listNotes(): Note[] {
    return this.repo.list().map((r) => this.repo.hydrate(r));
  }

  createNote(req: CreateNoteRequest): Note {
    const id = randomUUID();
    const now = new Date().toISOString();
    const position = this.repo.maxPosition() + 1;
    const row = this.repo.insert({ id, content: req.content, completed: 0, position, createdAt: now, updatedAt: now });
    return this.repo.hydrate(row);
  }

  updateNote(id: string, req: UpdateNoteRequest): Note {
    if (!this.repo.get(id)) throw new NotFoundException(`note ${id} not found`);
    const now = new Date().toISOString();
    const patch: Parameters<NotesRepository['update']>[1] = { updatedAt: now };
    if (req.content !== undefined) patch.content = req.content;
    if (req.completed !== undefined) patch.completed = req.completed ? 1 : 0;
    this.repo.update(id, patch);
    return this.repo.hydrate(this.repo.get(id)!);
  }

  removeNote(id: string): void {
    if (!this.repo.get(id)) throw new NotFoundException(`note ${id} not found`);
    this.repo.delete(id);
  }
}
