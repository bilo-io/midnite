import { describe, expect, it } from 'vitest';
import { statusToRoom } from './layout';

describe('statusToRoom', () => {
  it('routes wip to desk', () => expect(statusToRoom('wip')).toBe('desk'));
  it('routes waiting to desk', () => expect(statusToRoom('waiting')).toBe('desk'));
  it('routes done to lounge', () => expect(statusToRoom('done')).toBe('lounge'));
  it('routes abandoned to lounge', () => expect(statusToRoom('abandoned')).toBe('lounge'));
  it('routes backlog to hidden', () => expect(statusToRoom('backlog')).toBe('hidden'));
  it('routes todo to hidden', () => expect(statusToRoom('todo')).toBe('hidden'));
  it('routes undefined (no linked task) to lounge', () => expect(statusToRoom(undefined)).toBe('lounge'));
});
