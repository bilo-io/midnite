import { beforeEach, describe, expect, it } from 'vitest';
import { presencePeerList, usePresenceStore } from './presence-store';

describe('usePresenceStore', () => {
  beforeEach(() => usePresenceStore.getState().reset());

  it('applies frames through the reducer', () => {
    const s = usePresenceStore.getState();
    s.applyFrame(
      { type: 'presence.snapshot', selfId: 'me', peers: [{ peerId: 'a', name: 'Ada', variant: 0, tint: null, x: 1, y: 2, facing: 'up', scene: 'office' }] },
      10,
    );
    const after = usePresenceStore.getState();
    expect(after.self).toBe('me');
    expect(presencePeerList(after.peers).map((p) => p.name)).toEqual(['Ada']);
  });

  it('tracks connected + ghost with no-op-if-same setters', () => {
    usePresenceStore.getState().setConnected(true);
    expect(usePresenceStore.getState().connected).toBe(true);
    usePresenceStore.getState().setGhost(true);
    expect(usePresenceStore.getState().ghost).toBe(true);
  });

  it('reset clears peers + connection but the store stays usable', () => {
    const s = usePresenceStore.getState();
    s.applyFrame({ type: 'presence.snapshot', selfId: 'me', peers: [] }, 1);
    s.setConnected(true);
    s.reset();
    const after = usePresenceStore.getState();
    expect(after.self).toBeNull();
    expect(after.connected).toBe(false);
    expect(presencePeerList(after.peers)).toEqual([]);
  });
});
