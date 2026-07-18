import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

// A route with no registered guide (the home landing / any unmapped surface).
vi.mock('next/navigation', () => ({
  usePathname: () => '/',
  useRouter: () => ({ push: vi.fn() }),
}));

vi.mock('next/image', () => ({
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- test stub for next/image
  default: (props: any) => <img {...props} />,
}));

import { AssistantFab } from './assistant-fab';

describe('AssistantFab — primary Guide on a route with no guide', () => {
  beforeEach(() => vi.stubGlobal('open', vi.fn()));
  afterEach(async () => {
    const { useGuide } = await import('@/lib/guide/use-guide');
    useGuide.getState().stop();
    cleanup();
    vi.unstubAllGlobals();
  });

  it('flags "no tour" rather than opening the guides index (the arrow’s job)', async () => {
    const { useGuide } = await import('@/lib/guide/use-guide');
    useGuide.getState().stop();
    render(<AssistantFab />);
    fireEvent.click(screen.getByRole('button', { name: 'Open assistant' }));
    fireEvent.click(screen.getByRole('button', { name: /^Guide/i }));
    // The primary control shows the transient unavailable notice; it does not
    // start a guide and does not swap the panel to the browse-all index.
    expect(useGuide.getState().unavailable).toBe(true);
    expect(useGuide.getState().active).toBeNull();
    expect(screen.queryByRole('dialog', { name: 'Guides' })).not.toBeInTheDocument();
    useGuide.getState().stop();
  });
});
