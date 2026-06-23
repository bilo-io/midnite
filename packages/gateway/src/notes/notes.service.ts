import { Inject, Injectable, NotFoundException, Optional } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import type { CreateNoteRequest, Note, UpdateNoteRequest } from '@midnite/shared';
import { noteToIndexDoc } from '../search/lib/index-mappers';
import { SearchIndexService } from '../search/search-index.service';
import { NotesRepository } from './notes.repository';

@Injectable()
export class NotesService {
  constructor(
    @Inject(NotesRepository) private readonly repo: NotesRepository,
    // Optional so unit specs that construct the service directly keep working;
    // Nest injects the global index in production to keep search fresh.
    @Optional() @Inject(SearchIndexService) private readonly searchIndex?: SearchIndexService,
  ) {}

  listNotes(): Note[] {
    return this.repo.list().map((r) => this.repo.hydrate(r));
  }

  createNote(req: CreateNoteRequest): Note {
    const id = randomUUID();
    const now = new Date().toISOString();
    const position = this.repo.maxPosition() + 1;
    const row = this.repo.insert({ id, content: req.content, completed: 0, position, createdAt: now, updatedAt: now });
    const note = this.repo.hydrate(row);
    this.searchIndex?.upsert(noteToIndexDoc(note));
    return note;
  }

  updateNote(id: string, req: UpdateNoteRequest): Note {
    if (!this.repo.get(id)) throw new NotFoundException(`note ${id} not found`);
    const now = new Date().toISOString();
    const patch: Parameters<NotesRepository['update']>[1] = { updatedAt: now };
    if (req.content !== undefined) patch.content = req.content;
    if (req.completed !== undefined) patch.completed = req.completed ? 1 : 0;
    this.repo.update(id, patch);
    const note = this.repo.hydrate(this.repo.get(id)!);
    this.searchIndex?.upsert(noteToIndexDoc(note));
    return note;
  }

  removeNote(id: string): void {
    if (!this.repo.get(id)) throw new NotFoundException(`note ${id} not found`);
    this.repo.delete(id);
    this.searchIndex?.remove('note', id);
  }
}
