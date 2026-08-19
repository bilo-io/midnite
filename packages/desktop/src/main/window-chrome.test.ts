import { beforeEach, describe, expect, it, vi } from 'vitest';

import {
  WINDOW_BACKGROUND_CHANNEL,
  WINDOW_FOCUS_CHANNEL,
  WINDOW_FULLSCREEN_CHANNEL,
  WINDOW_TOGGLE_MAXIMIZE_CHANNEL,
} from '../window-chrome/channels';
import { attachWindowChrome, registerWindowChrome, windowFrameless } from './window-chrome';

// `window-chrome.ts` value-imports `ipcMain`, so unlike its electron-free
// siblings (permissions.ts, which imports only a type) it needs the module
// faked to run in the plain node environment this package tests in.
// `vi.hoisted` because `vi.mock` is lifted above the imports — a plain `const`
// here would still be in its TDZ when the factory closes over it.
const { ipcHandlers } = vi.hoisted(() => ({
  ipcHandlers: new Map<string, (event: unknown, ...args: unknown[]) => void>(),
}));
vi.mock('electron', () => ({
  ipcMain: {
    on: (channel: string, handler: (event: unknown, ...args: unknown[]) => void) => {
      ipcHandlers.set(channel, handler);
    },
  },
}));

/** A fake BrowserWindow: records `webContents.send` and captures `win.on` wiring. */
function fakeWindow(overrides: Record<string, unknown> = {}) {
  const listeners = new Map<string, () => void>();
  const win = {
    isDestroyed: () => false,
    isFullScreen: () => false,
    isMaximized: () => false,
    maximize: vi.fn(),
    unmaximize: vi.fn(),
    setBackgroundColor: vi.fn(),
    webContents: { send: vi.fn() },
    on: (event: string, handler: () => void) => {
      listeners.set(event, handler);
      return win;
    },
    ...overrides,
  };
  return { win, emit: (event: string) => listeners.get(event)?.() };
}

/** Fire the IPC handler `registerWindowChrome` installed for a channel. */
const send = (channel: string, ...args: unknown[]) => ipcHandlers.get(channel)?.(null, ...args);

beforeEach(() => {
  ipcHandlers.clear();
});

describe('windowFrameless', () => {
  it('is true only on macOS — other platforms keep their native frame', () => {
    const original = process.platform;
    try {
      for (const [platform, expected] of [
        ['darwin', true],
        ['win32', false],
        ['linux', false],
      ] as const) {
        Object.defineProperty(process, 'platform', { value: platform, configurable: true });
        expect(windowFrameless()).toBe(expected);
      }
    } finally {
      Object.defineProperty(process, 'platform', { value: original, configurable: true });
    }
  });
});

describe('attachWindowChrome', () => {
  it('forwards fullscreen transitions to the renderer', () => {
    const { win, emit } = fakeWindow();
    attachWindowChrome(win as never);

    emit('enter-full-screen');
    expect(win.webContents.send).toHaveBeenCalledWith(WINDOW_FULLSCREEN_CHANNEL, true);

    emit('leave-full-screen');
    expect(win.webContents.send).toHaveBeenCalledWith(WINDOW_FULLSCREEN_CHANNEL, false);
  });

  it('forwards focus and blur to the renderer', () => {
    const { win, emit } = fakeWindow();
    attachWindowChrome(win as never);

    emit('blur');
    expect(win.webContents.send).toHaveBeenCalledWith(WINDOW_FOCUS_CHANNEL, false);

    emit('focus');
    expect(win.webContents.send).toHaveBeenCalledWith(WINDOW_FOCUS_CHANNEL, true);
  });

  it('never sends to a destroyed window', () => {
    // The window can be torn down between the OS event and our handler running.
    const { win, emit } = fakeWindow({ isDestroyed: () => true });
    attachWindowChrome(win as never);

    emit('focus');
    emit('enter-full-screen');
    expect(win.webContents.send).not.toHaveBeenCalled();
  });
});

describe('registerWindowChrome — setBackgroundColor', () => {
  it('retints the native backing for a 6-digit hex color', () => {
    const { win } = fakeWindow();
    registerWindowChrome(() => win as never);

    send(WINDOW_BACKGROUND_CHANNEL, '#0b1020');
    expect(win.setBackgroundColor).toHaveBeenCalledWith('#0b1020');

    // Case-insensitive, per the channel's regex.
    send(WINDOW_BACKGROUND_CHANNEL, '#FFFFFF');
    expect(win.setBackgroundColor).toHaveBeenCalledWith('#FFFFFF');
  });

  it('drops anything that is not a plain #rrggbb string', () => {
    const { win } = fakeWindow();
    registerWindowChrome(() => win as never);

    for (const payload of [
      undefined,
      null,
      42,
      {},
      ['#0b1020'],
      '#fff', // 3-digit shorthand
      '#0b102', // too short
      '#0b10200', // too long
      '0b1020', // no hash
      '#gggggg', // not hex
      'rgb(11, 16, 32)',
      '#0b1020; background: url(evil)', // injection-shaped payload
    ]) {
      send(WINDOW_BACKGROUND_CHANNEL, payload);
    }
    expect(win.setBackgroundColor).not.toHaveBeenCalled();
  });

  it('no-ops when there is no live window', () => {
    registerWindowChrome(() => null);
    expect(() => send(WINDOW_BACKGROUND_CHANNEL, '#0b1020')).not.toThrow();

    const { win } = fakeWindow({ isDestroyed: () => true });
    registerWindowChrome(() => win as never);
    send(WINDOW_BACKGROUND_CHANNEL, '#0b1020');
    expect(win.setBackgroundColor).not.toHaveBeenCalled();
  });
});

describe('registerWindowChrome — toggleMaximize', () => {
  it('zooms a restored window', () => {
    const { win } = fakeWindow({ isMaximized: () => false });
    registerWindowChrome(() => win as never);

    send(WINDOW_TOGGLE_MAXIMIZE_CHANNEL);
    expect(win.maximize).toHaveBeenCalledOnce();
    expect(win.unmaximize).not.toHaveBeenCalled();
  });

  it('restores a zoomed window', () => {
    const { win } = fakeWindow({ isMaximized: () => true });
    registerWindowChrome(() => win as never);

    send(WINDOW_TOGGLE_MAXIMIZE_CHANNEL);
    expect(win.unmaximize).toHaveBeenCalledOnce();
    expect(win.maximize).not.toHaveBeenCalled();
  });

  it('leaves a fullscreen window alone — zoom is meaningless there', () => {
    const { win } = fakeWindow({ isFullScreen: () => true });
    registerWindowChrome(() => win as never);

    send(WINDOW_TOGGLE_MAXIMIZE_CHANNEL);
    expect(win.maximize).not.toHaveBeenCalled();
    expect(win.unmaximize).not.toHaveBeenCalled();
  });

  it('no-ops when there is no live window', () => {
    registerWindowChrome(() => null);
    expect(() => send(WINDOW_TOGGLE_MAXIMIZE_CHANNEL)).not.toThrow();

    const { win } = fakeWindow({ isDestroyed: () => true });
    registerWindowChrome(() => win as never);
    send(WINDOW_TOGGLE_MAXIMIZE_CHANNEL);
    expect(win.maximize).not.toHaveBeenCalled();
  });
});
