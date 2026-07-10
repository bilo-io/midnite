import { describe, expect, it } from 'vitest';
import {
  CreateMemoryRequestSchema,
  MAX_MEMORY_TITLE,
  MAX_SOURCES_PER_MEMORY,
  MemorySchema,
  UpdateMemoryRequestSchema,
} from './memory.js';

const baseMemory = {
  id: 'mem1',
  title: 'Deploy steps',
  content: '# steps',
  projectId: null,
  sources: [
    {
      id: 's1',
      memoryId: 'mem1',
      url: 'https://example.com/doc',
      kind: 'link' as const,
      createdAt: '2026-06-20T00:00:00.000Z',
    },
  ],
  createdAt: '2026-06-20T00:00:00.000Z',
  updatedAt: '2026-06-20T00:00:00.000Z',
};

describe('MemorySchema — Phase 65 B sources', () => {
  it('accepts a file source (no url) with ingest metadata', () => {
    const fileMemory = {
      ...baseMemory,
      sources: [
        {
          id: 'f1',
          memoryId: 'mem1',
          kind: 'file' as const,
          fileName: 'notes.pdf',
          mimeType: 'application/pdf',
          ingestState: 'ready' as const,
          createdAt: '2026-06-20T00:00:00.000Z',
        },
      ],
    };
    const parsed = MemorySchema.parse(fileMemory);
    expect(parsed.sources[0]!.url).toBeUndefined();
    expect(parsed.sources[0]!.kind).toBe('file');
    expect(parsed.sources[0]!.ingestState).toBe('ready');
  });

  it('accepts a null ingestState (not-yet-ingested link)', () => {
    const m = { ...baseMemory, sources: [{ ...baseMemory.sources[0], ingestState: null }] };
    expect(MemorySchema.parse(m).sources[0]!.ingestState).toBeNull();
  });
});

describe('MemorySchema', () => {
  it('round-trips a global memory with a source', () => {
    expect(MemorySchema.parse(baseMemory)).toEqual(baseMemory);
  });

  it('rejects a source with a non-url', () => {
    expect(
      MemorySchema.safeParse({
        ...baseMemory,
        sources: [{ ...baseMemory.sources[0], url: 'not-a-url' }],
      }).success,
    ).toBe(false);
  });

  it('requires projectId to be present (nullable, not optional)', () => {
    const { projectId: _omit, ...withoutProject } = baseMemory;
    expect(MemorySchema.safeParse(withoutProject).success).toBe(false);
  });
});

describe('CreateMemoryRequestSchema', () => {
  it('defaults content to empty string', () => {
    expect(CreateMemoryRequestSchema.parse({ title: 'T' }).content).toBe('');
  });

  it('rejects a blank title', () => {
    expect(CreateMemoryRequestSchema.safeParse({ title: '   ' }).success).toBe(false);
  });

  it('rejects a title over the max length', () => {
    expect(
      CreateMemoryRequestSchema.safeParse({ title: 'a'.repeat(MAX_MEMORY_TITLE + 1) }).success,
    ).toBe(false);
  });

  it('caps the number of staged sources', () => {
    const sources = Array.from(
      { length: MAX_SOURCES_PER_MEMORY + 1 },
      (_v, i) => `https://example.com/${i}`,
    );
    expect(CreateMemoryRequestSchema.safeParse({ title: 'T', sources }).success).toBe(false);
  });
});

describe('UpdateMemoryRequestSchema', () => {
  it('allows explicit null projectId to re-scope to global', () => {
    expect(UpdateMemoryRequestSchema.parse({ projectId: null }).projectId).toBeNull();
  });
});
