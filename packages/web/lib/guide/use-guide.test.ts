import { beforeEach, describe, expect, it } from 'vitest';

import { useGuide } from './use-guide';
import type { Guide } from './steps';

const GUIDE: Guide = {
  id: 'board',
  version: 1,
  label: 'Board tour',
  steps: [
    { anchor: 'a', title: '1', body: '1' },
    { anchor: 'b', title: '2', body: '2' },
  ],
};

describe('useGuide store', () => {
  beforeEach(() => useGuide.getState().stop());

  it('starts a guide at step 0', () => {
    useGuide.getState().start(GUIDE);
    expect(useGuide.getState().active?.id).toBe('board');
    expect(useGuide.getState().stepIndex).toBe(0);
    expect(useGuide.getState().unavailable).toBe(false);
  });

  it('flags unavailable when started with no guide', () => {
    useGuide.getState().start(null);
    expect(useGuide.getState().active).toBeNull();
    expect(useGuide.getState().unavailable).toBe(true);
  });

  it('advances then ends after the last step', () => {
    const s = useGuide.getState();
    s.start(GUIDE);
    s.next();
    expect(useGuide.getState().stepIndex).toBe(1);
    s.next(); // past the last step → ends
    expect(useGuide.getState().active).toBeNull();
  });

  it('prev clamps at 0', () => {
    const s = useGuide.getState();
    s.start(GUIDE);
    s.prev();
    expect(useGuide.getState().stepIndex).toBe(0);
  });

  it('stop clears everything', () => {
    const s = useGuide.getState();
    s.start(GUIDE);
    s.next();
    s.stop();
    expect(useGuide.getState().active).toBeNull();
    expect(useGuide.getState().stepIndex).toBe(0);
    expect(useGuide.getState().unavailable).toBe(false);
  });
});
