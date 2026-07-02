import { describe, expect, it } from 'vitest';

import {
  TASK_MODAL_LEGACY_PARAM,
  TASK_MODAL_PARAM,
  taskModalHref,
  taskPageHref,
} from './task-route';

describe('task-route', () => {
  it('taskModalHref opens the board with the modal param', () => {
    expect(taskModalHref('t1')).toBe('/tasks?task=t1');
  });

  it('taskPageHref points at the shareable full page', () => {
    expect(taskPageHref('t1')).toBe('/tasks/view?id=t1');
  });

  it('encodes ids so a stray char cannot break the query string', () => {
    expect(taskModalHref('a b&c')).toBe('/tasks?task=a%20b%26c');
    expect(taskPageHref('a b&c')).toBe('/tasks/view?id=a%20b%26c');
  });

  it('exposes the canonical + legacy param names', () => {
    expect(TASK_MODAL_PARAM).toBe('task');
    expect(TASK_MODAL_LEGACY_PARAM).toBe('open');
  });
});
