import { describe, expect, it } from 'vitest';
import {
  GenerateMemoryArtifactRequestSchema,
  MEMORY_ARTIFACT_KINDS,
  MEMORY_ARTIFACT_META,
  MemoryArtifactSchema,
  MemoryArtifactsResponseSchema,
} from './memory-artifact.js';

describe('memory-artifact schemas', () => {
  const base = {
    id: 'a1',
    memoryId: 'm1',
    kind: 'brief' as const,
    format: 'markdown' as const,
    title: 'Executive brief',
    content: '# Summary',
    status: 'ready' as const,
    error: null,
    createdAt: '2026-07-10T00:00:00.000Z',
    updatedAt: '2026-07-10T00:00:00.000Z',
  };

  it('round-trips a valid artifact', () => {
    expect(MemoryArtifactSchema.parse(base)).toEqual(base);
  });

  it('accepts every kind with an svg infographic', () => {
    for (const kind of MEMORY_ARTIFACT_KINDS) {
      const format = MEMORY_ARTIFACT_META[kind].format;
      expect(() => MemoryArtifactSchema.parse({ ...base, kind, format })).not.toThrow();
    }
  });

  it('requires error to be present (nullable, not optional)', () => {
    const { error: _drop, ...withoutError } = base;
    expect(MemoryArtifactSchema.safeParse(withoutError).success).toBe(false);
  });

  it('rejects an unknown kind', () => {
    expect(GenerateMemoryArtifactRequestSchema.safeParse({ kind: 'poster' }).success).toBe(false);
  });

  it('parses a list response', () => {
    expect(MemoryArtifactsResponseSchema.parse({ artifacts: [base] }).artifacts).toHaveLength(1);
  });

  it('has a meta entry for every kind', () => {
    for (const kind of MEMORY_ARTIFACT_KINDS) {
      expect(MEMORY_ARTIFACT_META[kind]).toBeDefined();
    }
  });
});
