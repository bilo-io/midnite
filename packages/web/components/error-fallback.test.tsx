import { screen, fireEvent } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { ErrorFallback } from './error-fallback';
import { renderWithIntl as render } from '@/vitest.render-intl';

describe('ErrorFallback', () => {
  it('renders a recovery UI instead of a blank page', () => {
    render(<ErrorFallback error={new Error('boom')} reset={vi.fn()} />);
    expect(screen.getByRole('heading', { name: /something went wrong/i })).toBeTruthy();
  });

  it('calls reset when Try again is clicked', () => {
    const reset = vi.fn();
    render(<ErrorFallback error={new Error('boom')} reset={reset} />);
    fireEvent.click(screen.getByRole('button', { name: /try again/i }));
    expect(reset).toHaveBeenCalled();
  });

  it('keeps a reporting path reachable when the app tree has died', () => {
    // The point of the boundary: the in-app Report Issue button lives in the
    // tree that just crashed, so this must link straight out to GitHub.
    render(<ErrorFallback error={new Error('boom')} reset={vi.fn()} />);
    const link = screen.getByRole('link', { name: /report this/i });
    expect(link.getAttribute('href')).toContain('github.com');
    expect(link.getAttribute('href')).toContain('issues/new');
  });

  it('surfaces the digest — the only identifier that survives a prod build', () => {
    const error = Object.assign(new Error('boom'), { digest: 'abc123' });
    render(<ErrorFallback error={error} reset={vi.fn()} />);
    expect(screen.getByText(/abc123/)).toBeTruthy();
  });

  it('omits the digest line when there is none', () => {
    render(<ErrorFallback error={new Error('boom')} reset={vi.fn()} />);
    expect(screen.queryByText(/reference:/i)).toBeNull();
  });

  it('survives an error with no message', () => {
    // Next replaces the message with a generic string in production, and a
    // digest-only error is the common real-world shape.
    render(<ErrorFallback error={new Error('')} reset={vi.fn()} />);
    expect(screen.getByRole('link', { name: /report this/i })).toBeTruthy();
  });
});
