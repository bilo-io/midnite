import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render } from '@testing-library/react';

import { GuidePendingReplay } from './guide-pending-replay';
import { useGuide } from '@/lib/guide/use-guide';
import { ALL_GUIDES } from '@/lib/guide/steps';

let mockPathname = '/tasks';
vi.mock('next/navigation', () => ({ usePathname: () => mockPathname }));

const board = ALL_GUIDES.find((g) => g.id === 'board')!;

beforeEach(() => {
  mockPathname = '/tasks';
  useGuide.getState().stop();
});
afterEach(() => {
  cleanup();
  useGuide.getState().stop();
});

describe('GuidePendingReplay', () => {
  it('starts a pending guide once the route matches it', () => {
    useGuide.getState().requestReplay(board);
    render(<GuidePendingReplay />);
    // /tasks resolves to the board guide → the pending replay fires.
    expect(useGuide.getState().active?.id).toBe('board');
    expect(useGuide.getState().pending).toBeNull();
  });

  it('waits when the current route does not match the pending guide', () => {
    mockPathname = '/sessions';
    useGuide.getState().requestReplay(board);
    render(<GuidePendingReplay />);
    // Still on the wrong route → don't start yet; keep it queued.
    expect(useGuide.getState().active).toBeNull();
    expect(useGuide.getState().pending?.id).toBe('board');
  });

  it('does nothing when there is no pending replay', () => {
    render(<GuidePendingReplay />);
    expect(useGuide.getState().active).toBeNull();
  });
});
