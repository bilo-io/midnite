import { act, render, screen } from '@testing-library/react';
import type { WindowChromeBridge } from '@midnite/shared';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { TITLE_BAR_HEIGHT, TitleBar, TitleBarDragStrip } from './title-bar';

/** A controllable fake bridge — capture the subscribers so tests can fire them. */
function fakeBridge(overrides: Partial<WindowChromeBridge> = {}) {
  const fullscreenHandlers: Array<(fullscreen: boolean) => void> = [];
  const focusHandlers: Array<(focused: boolean) => void> = [];
  const bridge: WindowChromeBridge = {
    platform: 'darwin',
    frameless: true,
    onFullscreenChange: (handler) => {
      fullscreenHandlers.push(handler);
      return () => fullscreenHandlers.splice(fullscreenHandlers.indexOf(handler), 1);
    },
    onFocusChange: (handler) => {
      focusHandlers.push(handler);
      return () => focusHandlers.splice(focusHandlers.indexOf(handler), 1);
    },
    setBackgroundColor: vi.fn(),
    ...overrides,
  };
  return {
    bridge,
    setFullscreen: (value: boolean) => fullscreenHandlers.forEach((h) => h(value)),
    setFocused: (value: boolean) => focusHandlers.forEach((h) => h(value)),
  };
}

const bar = () => screen.getByRole('banner', { name: 'Window title bar' });

/** `-webkit-app-region` isn't in the CSSStyleDeclaration type — read it loosely. */
const appRegion = (el: Element | null) =>
  ((el as HTMLElement | null)?.style as unknown as Record<string, string> | undefined)?.[
    'WebkitAppRegion'
  ];

afterEach(() => {
  document.documentElement.style.removeProperty('--titlebar-h');
});

describe('TitleBar', () => {
  it('renders nothing without a bridge, or when the window keeps its native frame', () => {
    const { rerender } = render(<TitleBar windowChrome={null} center={<input aria-label="Search" />} />);
    expect(screen.queryByRole('banner')).toBeNull();

    const framed = fakeBridge({ frameless: false }).bridge;
    rerender(<TitleBar windowChrome={framed} center={<input aria-label="Search" />} />);
    expect(screen.queryByRole('banner')).toBeNull();
    expect(document.documentElement.style.getPropertyValue('--titlebar-h')).toBe('');
  });

  it('renders the slots inside a drag-region bar and publishes --titlebar-h', () => {
    const { bridge } = fakeBridge();
    render(
      <TitleBar
        windowChrome={bridge}
        left={<button type="button">Back</button>}
        center={<input aria-label="Search" />}
        right={<button type="button">Account</button>}
      />,
    );

    expect(appRegion(bar())).toBe('drag');
    // Every slot is wrapped `no-drag` so its interactive children stay clickable.
    for (const el of [
      screen.getByRole('button', { name: 'Back' }),
      screen.getByRole('textbox', { name: 'Search' }),
      screen.getByRole('button', { name: 'Account' }),
    ]) {
      expect(appRegion(el.parentElement)).toBe('no-drag');
    }
    expect(document.documentElement.style.getPropertyValue('--titlebar-h')).toBe(TITLE_BAR_HEIGHT);
  });

  it('resets --titlebar-h to 0px on unmount', () => {
    const { bridge } = fakeBridge();
    const { unmount } = render(<TitleBar windowChrome={bridge} />);
    unmount();
    expect(document.documentElement.style.getPropertyValue('--titlebar-h')).toBe('0px');
  });

  it('clears the traffic lights on darwin and collapses the clearance in fullscreen', () => {
    const { bridge, setFullscreen } = fakeBridge();
    render(<TitleBar windowChrome={bridge} />);
    expect(bar().className).toContain('pl-[5.25rem]');

    act(() => setFullscreen(true));
    expect(bar().className).not.toContain('pl-[5.25rem]');

    act(() => setFullscreen(false));
    expect(bar().className).toContain('pl-[5.25rem]');
  });

  it('dims while the window is blurred and restores on focus', () => {
    const { bridge, setFocused } = fakeBridge();
    render(<TitleBar windowChrome={bridge} />);
    expect(bar().dataset['windowFocused']).toBe('true');
    expect(bar().className).not.toContain('opacity-60');

    act(() => setFocused(false));
    expect(bar().dataset['windowFocused']).toBe('false');
    expect(bar().className).toContain('opacity-60');

    act(() => setFocused(true));
    expect(bar().className).not.toContain('opacity-60');
  });
});

describe('TitleBarDragStrip', () => {
  it('renders a drag strip only for a frameless window', () => {
    const { bridge } = fakeBridge();
    const { container, rerender } = render(<TitleBarDragStrip windowChrome={bridge} />);
    const strip = container.firstElementChild as HTMLElement;
    expect(appRegion(strip)).toBe('drag');
    expect(strip.getAttribute('aria-hidden')).toBe('true');

    rerender(<TitleBarDragStrip windowChrome={null} />);
    expect(container.firstElementChild).toBeNull();
  });
});
