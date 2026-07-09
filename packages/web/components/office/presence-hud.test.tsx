import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';

import { usePresenceStore } from '@/lib/presence-store';
import { useOfficeStore } from '@/lib/office-store';
import type { PeerView } from '@/lib/presence-frames';
import { PresenceHud } from './presence-hud';

const noop = () => {};

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
  useOfficeStore.getState().reset();
});

describe('PresenceHud', () => {
  it('lists you plus connected teammates', () => {
    usePresenceStore.setState({ peers: { a: peer({ peerId: 'a', name: 'Ada' }) } });
    render(<PresenceHud emote={noop} chat={noop} />);
    expect(screen.getByText(/In the office · 2/)).toBeInTheDocument();
    expect(screen.getByText('You')).toBeInTheDocument();
    expect(screen.getByText('Ada')).toBeInTheDocument();
  });

  it('fires an emote from the wheel', () => {
    const emote = vi.fn();
    render(<PresenceHud emote={emote} chat={noop} />);
    fireEvent.click(screen.getByRole('button', { name: 'Emote' }));
    fireEvent.click(screen.getByRole('button', { name: 'Send 👋' }));
    expect(emote).toHaveBeenCalledWith('👋');
  });

  it('quick-fires an emote with a number key', () => {
    const emote = vi.fn();
    render(<PresenceHud emote={emote} chat={noop} />);
    fireEvent.keyDown(window, { key: '1' });
    expect(emote).toHaveBeenCalledWith('👋');
  });

  it('toggles ghost mode in the store', () => {
    render(<PresenceHud emote={noop} chat={noop} />);
    expect(usePresenceStore.getState().ghost).toBe(false);
    fireEvent.click(screen.getByRole('button', { name: 'Ghost mode' }));
    expect(usePresenceStore.getState().ghost).toBe(true);
  });

  it('opens the chat input, freezes scene keys, and sends on Enter', () => {
    const chat = vi.fn();
    render(<PresenceHud emote={noop} chat={chat} />);
    // Opening via the Chat button focuses an input and freezes the scene.
    fireEvent.click(screen.getByRole('button', { name: 'Chat' }));
    const input = screen.getByRole('textbox', { name: 'Chat message' });
    expect(useOfficeStore.getState().chatOpen).toBe(true);
    fireEvent.change(input, { target: { value: 'hi team' } });
    fireEvent.keyDown(input, { key: 'Enter' });
    expect(chat).toHaveBeenCalledWith('hi team');
    // Input closes + scene keys unfreeze after sending.
    expect(screen.queryByRole('textbox', { name: 'Chat message' })).not.toBeInTheDocument();
    expect(useOfficeStore.getState().chatOpen).toBe(false);
  });

  it("opens the chat input with the 'T' key", () => {
    render(<PresenceHud emote={noop} chat={noop} />);
    fireEvent.keyDown(window, { key: 't' });
    expect(screen.getByRole('textbox', { name: 'Chat message' })).toBeInTheDocument();
  });
});
