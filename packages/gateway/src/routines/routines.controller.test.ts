import { BadRequestException, NotFoundException } from '@nestjs/common';
import { describe, expect, it, vi } from 'vitest';
import type { Routine, RoutineProgress } from '@midnite/shared';
import type { RoutinesService } from './routines.service';
import { RoutinesController } from './routines.controller';

const fakeRoutine = { id: 'rt1', name: 'Morning', groups: [] } as unknown as Routine;
const fakeProgress = { date: '2026-06-21', itemStatus: {} } as unknown as RoutineProgress;

function build(overrides: Partial<Record<keyof RoutinesService, unknown>> = {}) {
  const service = {
    listRoutines: vi.fn(() => [fakeRoutine]),
    createRoutine: vi.fn(() => fakeRoutine),
    getRoutine: vi.fn(() => fakeRoutine),
    updateRoutine: vi.fn(() => fakeRoutine),
    removeRoutine: vi.fn(),
    addGroup: vi.fn(() => fakeRoutine),
    updateGroup: vi.fn(() => fakeRoutine),
    removeGroup: vi.fn(() => fakeRoutine),
    addItem: vi.fn(() => fakeRoutine),
    updateItem: vi.fn(() => fakeRoutine),
    removeItem: vi.fn(() => fakeRoutine),
    recordProgress: vi.fn(() => fakeProgress),
    listProgress: vi.fn(() => [fakeProgress]),
    ...overrides,
  } as unknown as RoutinesService;
  return { controller: new RoutinesController(service), service };
}

describe('RoutinesController — body validation (400)', () => {
  it('rejects a routine with a blank name', () => {
    const { controller } = build();
    expect(() => controller.createRoutine({ name: '   ' })).toThrow(BadRequestException);
  });

  it('rejects a group with a missing name', () => {
    const { controller } = build();
    expect(() => controller.addGroup('rt1', {})).toThrow(BadRequestException);
  });

  it('rejects an item with a blank title', () => {
    const { controller } = build();
    expect(() => controller.addItem('rt1', 'g1', { title: '' })).toThrow(BadRequestException);
  });

  it('rejects progress with a malformed date', () => {
    const { controller } = build();
    expect(() => controller.recordProgress('rt1', { date: '21-06-2026', itemStatus: {} })).toThrow(
      BadRequestException,
    );
  });
});

describe('RoutinesController — valid input delegates to the service', () => {
  it('creates with the parsed body', () => {
    const { controller, service } = build();
    expect(controller.createRoutine({ name: 'Evening' })).toEqual({ routine: fakeRoutine });
    expect(service.createRoutine).toHaveBeenCalledWith({ name: 'Evening' });
  });

  it('records progress with the parsed body', () => {
    const { controller, service } = build();
    const body = { date: '2026-06-21', itemStatus: { i1: true } };
    expect(controller.recordProgress('rt1', body)).toEqual({ progress: fakeProgress });
    expect(service.recordProgress).toHaveBeenCalledWith('rt1', body);
  });

  it('forwards optional from/to query on list progress', () => {
    const { controller, service } = build();
    controller.listProgress('rt1', '2026-06-01', '2026-06-30');
    expect(service.listProgress).toHaveBeenCalledWith('rt1', '2026-06-01', '2026-06-30');
  });

  it('returns { ok: true } after delete', () => {
    const { controller, service } = build();
    expect(controller.removeRoutine('rt1')).toEqual({ ok: true });
    expect(service.removeRoutine).toHaveBeenCalledWith('rt1');
  });
});

describe('RoutinesController — service errors propagate', () => {
  it('lets a NotFoundException surface from GET :id', () => {
    const { controller } = build({
      getRoutine: vi.fn(() => {
        throw new NotFoundException('routine rt9 not found');
      }),
    });
    expect(() => controller.getRoutine('rt9')).toThrow(NotFoundException);
  });
});
