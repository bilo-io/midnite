import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render } from '@testing-library/react';

import { ConstellationBackground } from './constellation-background';

// jsdom has no real 2D context; stub getContext → null so the component takes its
// early-return path (it must degrade gracefully, never block the form).
beforeEach(() => {
  vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(null);
});

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

describe('ConstellationBackground', () => {
  it('renders a decorative, non-interactive canvas', () => {
    const { container } = render(<ConstellationBackground animate />);
    const canvas = container.querySelector('canvas');
    expect(canvas).not.toBeNull();
    expect(canvas).toHaveAttribute('aria-hidden');
    expect(canvas?.className).toContain('pointer-events-none');
  });

  it('mounts without throwing in the static (reduced-motion) path', () => {
    expect(() => render(<ConstellationBackground animate={false} />)).not.toThrow();
  });
});
