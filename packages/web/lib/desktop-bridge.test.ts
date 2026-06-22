import { afterEach, describe, expect, it, vi } from 'vitest';
import { getDesktopBridge, type MidniteDesktopBridge } from './desktop-bridge';

const bridge: MidniteDesktopBridge = {
  notify: vi.fn(),
  onNavigate: vi.fn(() => () => {}),
};

afterEach(() => {
  delete window.midniteDesktop;
});

describe('getDesktopBridge', () => {
  it('returns null in a plain browser (no bridge injected)', () => {
    expect(getDesktopBridge()).toBeNull();
  });

  it('returns the bridge when the Electron preload injected it', () => {
    window.midniteDesktop = bridge;
    expect(getDesktopBridge()).toBe(bridge);
  });
});
