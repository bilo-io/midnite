import { act, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { SectionProvider, useActiveSection } from './section-controller';

type IOCallback = (entries: Array<Partial<IntersectionObserverEntry>>) => void;

let ioCallback: IOCallback | null = null;

// Minimal IntersectionObserver stub that captures the callback so a test can feed it
// synthetic entries (jsdom has no IntersectionObserver).
class MockIntersectionObserver {
  constructor(cb: IOCallback) {
    ioCallback = cb;
  }
  observe() {}
  unobserve() {}
  disconnect() {}
  takeRecords() {
    return [];
  }
}

function ActiveProbe() {
  const active = useActiveSection();
  return <div data-testid="active">{active ?? 'none'}</div>;
}

describe('SectionProvider', () => {
  beforeEach(() => {
    ioCallback = null;
    vi.stubGlobal('IntersectionObserver', MockIntersectionObserver);
    for (const id of ['how', 'features', 'cli']) {
      const el = document.createElement('section');
      el.id = id;
      document.body.appendChild(el);
    }
  });
  afterEach(() => {
    vi.unstubAllGlobals();
    document.body.innerHTML = '';
  });

  function entry(id: string, ratio: number): Partial<IntersectionObserverEntry> {
    const target = document.getElementById(id) as Element;
    return { target, isIntersecting: ratio > 0, intersectionRatio: ratio };
  }

  it('marks the most-visible section active', () => {
    render(
      <SectionProvider ids={['how', 'features', 'cli']}>
        <ActiveProbe />
      </SectionProvider>,
    );
    expect(screen.getByTestId('active').textContent).toBe('none');

    act(() => {
      ioCallback?.([entry('how', 0.3), entry('features', 0.7)]);
    });
    expect(screen.getByTestId('active').textContent).toBe('features');
  });

  it('keeps the last active section when everything leaves the viewport (sticky)', () => {
    render(
      <SectionProvider ids={['how', 'features', 'cli']}>
        <ActiveProbe />
      </SectionProvider>,
    );
    act(() => {
      ioCallback?.([entry('cli', 0.5)]);
    });
    expect(screen.getByTestId('active').textContent).toBe('cli');

    act(() => {
      ioCallback?.([entry('cli', 0)]);
    });
    expect(screen.getByTestId('active').textContent).toBe('cli');
  });
});
