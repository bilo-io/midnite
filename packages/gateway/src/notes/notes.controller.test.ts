import { BadRequestException } from '@nestjs/common';
import { describe, expect, it, vi } from 'vitest';
import type { Note } from '@midnite/shared';
import type { NotesService } from './notes.service';
import { NotesController } from './notes.controller';

const fakeNote = {
  id: 'n1',
  content: 'hi',
  completed: false,
  position: 0,
  createdAt: '',
  updatedAt: '',
} as Note;

function build() {
  const service = {
    listNotes: vi.fn(() => [fakeNote]),
    createNote: vi.fn(() => fakeNote),
    updateNote: vi.fn(() => fakeNote),
    removeNote: vi.fn(),
  } as unknown as NotesService;
  return { controller: new NotesController(service), service };
}

describe('NotesController — body validation (400)', () => {
  it('rejects a create with blank content', () => {
    const { controller } = build();
    expect(() => controller.createNote({ content: '   ' })).toThrow(BadRequestException);
  });

  it('rejects an update with blank content', () => {
    const { controller } = build();
    expect(() => controller.updateNote('n1', { content: '' })).toThrow(BadRequestException);
  });
});

describe('NotesController — valid input delegates to the service', () => {
  it('creates with the parsed request and wraps the note', () => {
    const { controller, service } = build();
    expect(controller.createNote({ content: 'remember' })).toEqual({ note: fakeNote });
    expect(service.createNote).toHaveBeenCalledWith({ content: 'remember' });
  });

  it('toggles completed via a valid update', () => {
    const { controller, service } = build();
    controller.updateNote('n1', { completed: true });
    expect(service.updateNote).toHaveBeenCalledWith('n1', { completed: true });
  });

  it('returns { ok: true } after delete', () => {
    const { controller, service } = build();
    expect(controller.removeNote('n1')).toEqual({ ok: true });
    expect(service.removeNote).toHaveBeenCalledWith('n1');
  });
});
