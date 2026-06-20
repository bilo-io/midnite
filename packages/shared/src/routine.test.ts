import { describe, expect, it } from 'vitest';
import {
  CreateRoutineRequestSchema,
  RecordProgressRequestSchema,
  RoutineSchema,
} from './routine.js';

describe('RoutineSchema', () => {
  it('round-trips a routine with one group and item', () => {
    const routine = {
      id: 'r1',
      name: 'Morning',
      groups: [
        {
          id: 'g1',
          routineId: 'r1',
          name: 'Health',
          position: 0,
          items: [
            {
              id: 'i1',
              groupId: 'g1',
              title: 'Stretch',
              position: 0,
              createdAt: '2026-06-20T00:00:00.000Z',
              updatedAt: '2026-06-20T00:00:00.000Z',
            },
          ],
          createdAt: '2026-06-20T00:00:00.000Z',
          updatedAt: '2026-06-20T00:00:00.000Z',
        },
      ],
      createdAt: '2026-06-20T00:00:00.000Z',
      updatedAt: '2026-06-20T00:00:00.000Z',
    };
    expect(RoutineSchema.parse(routine)).toEqual(routine);
  });
});

describe('CreateRoutineRequestSchema', () => {
  it('defaults a group\'s items to an empty array', () => {
    const parsed = CreateRoutineRequestSchema.parse({
      name: 'Morning',
      groups: [{ name: 'Health' }],
    });
    expect(parsed.groups?.[0]?.items).toEqual([]);
  });

  it('rejects a blank routine name', () => {
    expect(CreateRoutineRequestSchema.safeParse({ name: '  ' }).success).toBe(false);
  });
});

describe('RecordProgressRequestSchema', () => {
  it('accepts a well-formed date and itemStatus map', () => {
    const parsed = RecordProgressRequestSchema.parse({
      date: '2026-06-20',
      itemStatus: { i1: true, i2: false },
    });
    expect(parsed.itemStatus.i1).toBe(true);
  });

  it('rejects a malformed date', () => {
    expect(
      RecordProgressRequestSchema.safeParse({ date: '20/06/2026', itemStatus: {} }).success,
    ).toBe(false);
  });
});
