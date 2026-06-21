import { render } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { TypedTitle } from './typed-title';

afterEach(() => {
  vi.unstubAllGlobals();
});

function mockMatchMedia(reduced: boolean) {
  vi.stubGlobal('matchMedia', (query: string) => ({
    matches: reduced && query.includes('reduce'),
    media: query,
    onchange: null,
    addEventListener: () => {},
    removeEventListener: () => {},
    addListener: () => {},
    removeListener: () => {},
    dispatchEvent: () => false,
  }));
}

describe('TypedTitle', () => {
  it('always carries the full title for assistive tech via an sr-only copy', () => {
    const { container } = render(<TypedTitle title="Hello world" eyebrow="Eyebrow" />);
    const srOnly = container.querySelector('.sr-only');
    expect(srOnly?.textContent).toBe('Hello world');
  });

  it('renders the full visible title immediately under reduced motion', () => {
    mockMatchMedia(true);
    const { container } = render(<TypedTitle title="Quick" />);
    const animated = container.querySelector('h2 span[aria-hidden="true"]');
    expect(animated?.textContent).toBe('Quick');
  });
});
