import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import type { CreateNoteRequest, Note, UpdateNoteRequest } from '@midnite/shared';
import { SearchIndexService } from '../search/search-index.service';
import { NotesRepository } from './notes.repository';

/** A note has no title field, so derive a short label from its first line for the
 *  search index (the full content is indexed as the body). Shared with the
 *  backfill so a backfilled note and a freshly-created one get the same title. */
export function noteIndexTitle(content: string): string {
  const firstLine = content.split('\n').find((l) => l.trim().length > 0)?.trim() ?? '';
  return firstLine.slice(0, 80);
}

@Injectable()
export class NotesService {
  constructor(
    @Inject(NotesRepository) private readonly repo: NotesRepository,
    @Inject(SearchIndexService) private readonly searchIndex: SearchIndexService,
  ) {}

  listNotes(): Note[] {
    return this.repo.list().map((r) => this.repo.hydrate(r));
  }

  createNote(req: CreateNoteRequest): Note {
    const id = randomUUID();
    const now = new Date().toISOString();
    const position = this.repo.maxPosition() + 1;
    const row = this.repo.insert({ id, content: req.content, completed: 0, position, createdAt: now, updatedAt: now });
    this.searchIndex.upsert('note', id, noteIndexTitle(req.content), req.content);
    return this.repo.hydrate(row);
  }

  updateNote(id: string, req: UpdateNoteRequest): Note {
    if (!this.repo.get(id)) throw new NotFoundException(`note ${id} not found`);
    const now = new Date().toISOString();
    const patch: Parameters<NotesRepository['update']>[1] = { updatedAt: now };
    if (req.content !== undefined) patch.content = req.content;
    if (req.completed !== undefined) patch.completed = req.completed ? 1 : 0;
    this.repo.update(id, patch);
    const note = this.repo.hydrate(this.repo.get(id)!);
    // Re-index from the current content so edited text stays findable (toggling
    // `completed` re-indexes the same text — harmless).
    this.searchIndex.upsert('note', id, noteIndexTitle(note.content), note.content);
    return note;
  }

  removeNote(id: string): void {
    if (!this.repo.get(id)) throw new NotFoundException(`note ${id} not found`);
    this.repo.delete(id);
    this.searchIndex.remove('note', id);
  }
}
