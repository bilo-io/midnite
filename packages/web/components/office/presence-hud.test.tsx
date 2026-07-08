import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';

import { usePresenceStore } from '@/lib/presence-store';
import type { PeerView } from '@/lib/presence-frames';
import { PresenceHud } from './presence-hud';

const peer = (over: Partial<PeerView> & { peerId: string }): PeerView => ({
  name: 'Ada',
  variant: -1,
  tint: null,
  x: 100,
  y: 100,
  facing: 'down',
  scene: 'office',
  lastUpdate: 0,
  ...over,
});

afterEach(() => {
  cleanup();
  usePresenceStore.getState().reset();
});

describe('PresenceHud', () => {
  it('lists you plus connected teammates', () => {
    usePresenceStore.setState({ peers: { a: peer({ peerId: 'a', name: 'Ada' }) } });
    render(<PresenceHud emote={() => {}} />);
    expect(screen.getByText(/In the office · 2/)).toBeInTheDocument();
    expect(screen.getByText('You')).toBeInTheDocument();
    expect(screen.getByText('Ada')).toBeInTheDocument();
  });

  it('fires an emote from the wheel', () => {
    const emote = vi.fn();
    render(<PresenceHud emote={emote} />);
    fireEvent.click(screen.getByRole('button', { name: 'Emote' }));
    fireEvent.click(screen.getByRole('button', { name: 'Send 👋' }));
    expect(emote).toHaveBeenCalledWith('👋');
  });

  it('quick-fires an emote with a number key', () => {
    const emote = vi.fn();
    render(<PresenceHud emote={emote} />);
    fireEvent.keyDown(window, { key: '1' });
    expect(emote).toHaveBeenCalledWith('👋');
  });

  it('toggles ghost mode in the store', () => {
    render(<PresenceHud emote={() => {}} />);
    expect(usePresenceStore.getState().ghost).toBe(false);
    fireEvent.click(screen.getByRole('button', { name: 'Ghost mode' }));
    expect(usePresenceStore.getState().ghost).toBe(true);
  });
});
