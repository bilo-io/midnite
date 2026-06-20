import { describe, expect, it } from 'vitest';
import {
  CreateNoteRequestSchema,
  MAX_NOTE_CONTENT,
  NoteSchema,
  UpdateNoteRequestSchema,
} from './note.js';

describe('NoteSchema', () => {
  it('round-trips a note', () => {
    const note = {
      id: 'n1',
      content: 'remember this',
      completed: false,
      position: 0,
      createdAt: '2026-06-20T00:00:00.000Z',
      updatedAt: '2026-06-20T00:00:00.000Z',
    };
    expect(NoteSchema.parse(note)).toEqual(note);
  });

  it('rejects a negative position', () => {
    expect(
      NoteSchema.safeParse({
        id: 'n1',
        content: 'x',
        completed: false,
        position: -1,
        createdAt: '',
        updatedAt: '',
      }).success,
    ).toBe(false);
  });
});

describe('CreateNoteRequestSchema', () => {
  it('trims content and rejects blank', () => {
    expect(CreateNoteRequestSchema.safeParse({ content: '  ' }).success).toBe(false);
  });

  it('rejects content over the max length', () => {
    expect(
      CreateNoteRequestSchema.safeParse({ content: 'a'.repeat(MAX_NOTE_CONTENT + 1) }).success,
    ).toBe(false);
  });
});

describe('UpdateNoteRequestSchema', () => {
  it('accepts a partial update toggling completed', () => {
    expect(UpdateNoteRequestSchema.parse({ completed: true })).toEqual({ completed: true });
  });
});
