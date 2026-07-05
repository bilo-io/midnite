import { beforeEach, describe, expect, it } from 'vitest';
import { useConnectionStore, worstStatus } from './connection-store';

beforeEach(() => useConnectionStore.setState({ statuses: {} }));

describe('worstStatus', () => {
  it('is live when nothing is subscribed', () => {
    expect(worstStatus({})).toBe('live');
  });
  it('is live when every channel is live', () => {
    expect(worstStatus({ tasks: 'live', ideas: 'live' })).toBe('live');
  });
  it('reports reconnecting when any channel is reconnecting', () => {
    expect(worstStatus({ tasks: 'live', ideas: 'reconnecting' })).toBe('reconnecting');
  });
  it('stale dominates reconnecting', () => {
    expect(worstStatus({ tasks: 'reconnecting', ideas: 'stale' })).toBe('stale');
  });
});

describe('useConnectionStore', () => {
  it('sets and clears per-channel status', () => {
    const { setChannelStatus, clearChannel } = useConnectionStore.getState();
    setChannelStatus('tasks', 'reconnecting');
    expect(useConnectionStore.getState().statuses).toEqual({ tasks: 'reconnecting' });
    setChannelStatus('tasks', 'live');
    expect(useConnectionStore.getState().statuses).toEqual({ tasks: 'live' });
    clearChannel('tasks');
    expect(useConnectionStore.getState().statuses).toEqual({});
  });
});
