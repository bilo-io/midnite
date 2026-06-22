import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { NotesRepository } from '../notes/notes.repository';
import { NotesService } from '../notes/notes.service';
import { createTestDb, type TestDbHandle } from '../test/db';
import { SearchIndexService } from './search-index.service';

// End-to-end proof that the index stays current from the service write-path —
// no DB trigger involved (CLAUDE.md). NotesService is the leanest domain to
// demonstrate create → update → delete maintenance against the real FTS index.
describe('search write-path maintenance (NotesService)', () => {
  let handle: TestDbHandle;
  let index: SearchIndexService;
  let notes: NotesService;

  beforeEach(() => {
    handle = createTestDb();
    index = new SearchIndexService(handle.sqlite);
    notes = new NotesService(new NotesRepository(handle.db), index);
  });

  afterEach(() => handle.close());

  it('creating a note makes it findable', () => {
    const note = notes.createNote({ content: 'remember to renew the TLS certificate' });
    expect(index.query('certificate').map((h) => h.id)).toEqual([note.id]);
  });

  it('editing the content updates the match', () => {
    const note = notes.createNote({ content: 'remember to renew the TLS certificate' });
    notes.updateNote(note.id, { content: 'renew the kubernetes token' });
    expect(index.query('certificate')).toEqual([]);
    expect(index.query('kubernetes').map((h) => h.id)).toEqual([note.id]);
  });

  it('deleting the note removes it from results', () => {
    const note = notes.createNote({ content: 'remember to renew the TLS certificate' });
    notes.removeNote(note.id);
    expect(index.query('certificate')).toEqual([]);
    expect(index.count()).toBe(0);
  });
});
