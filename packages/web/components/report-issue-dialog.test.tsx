import { afterEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';

// usePathname needs the App Router runtime; stub it to the page under test.
vi.mock('next/navigation', () => ({ usePathname: () => '/board' }));
// useTheme needs a ThemeProvider; stub the resolved values.
vi.mock('@/app/theme/theme-context', () => ({
  useTheme: () => ({ preference: 'dark', resolved: 'dark' }),
}));

import { ReportIssueDialog } from './report-issue-dialog';

const openGitHub = () => screen.getByRole('button', { name: /open on github/i });

afterEach(() => {
  vi.restoreAllMocks();
});

describe('ReportIssueDialog', () => {
  it('prefills an editable title and body from the page context', () => {
    render(<ReportIssueDialog onClose={vi.fn()} />);
    const title = screen.getByLabelText('Title') as HTMLInputElement;
    const body = screen.getByLabelText('Details') as HTMLTextAreaElement;
    expect(title.value).toBe('[bug] /board — ');
    expect(body.value).toContain('### Environment');
    expect(body.value).toContain('| Page | `/board` |');
  });

  it('hands the edited title + body to the opened GitHub URL', () => {
    const open = vi.spyOn(window, 'open').mockReturnValue(null);
    const onClose = vi.fn();
    render(<ReportIssueDialog onClose={onClose} />);

    fireEvent.change(screen.getByLabelText('Title'), { target: { value: 'it broke' } });
    fireEvent.change(screen.getByLabelText('Details'), { target: { value: 'steps here' } });
    fireEvent.click(openGitHub());

    expect(open).toHaveBeenCalledTimes(1);
    const url = new URL(open.mock.calls[0]![0] as string);
    expect(url.hostname).toBe('github.com');
    expect(url.searchParams.get('title')).toBe('it broke');
    expect(url.searchParams.get('body')).toBe('steps here');
    expect(onClose).toHaveBeenCalled();
  });

  it('Cancel closes without opening anything', () => {
    const open = vi.spyOn(window, 'open').mockReturnValue(null);
    const onClose = vi.fn();
    render(<ReportIssueDialog onClose={onClose} />);

    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));
    expect(open).not.toHaveBeenCalled();
    expect(onClose).toHaveBeenCalled();
  });

  it('warns and blocks the hand-off when the body overflows the URL budget', () => {
    render(<ReportIssueDialog onClose={vi.fn()} />);
    fireEvent.change(screen.getByLabelText('Details'), {
      target: { value: 'x'.repeat(9000) },
    });
    expect(screen.getByRole('alert')).toHaveTextContent(/too long/i);
    expect(openGitHub()).toBeDisabled();
  });

  it('Escape closes the dialog', () => {
    const onClose = vi.fn();
    render(<ReportIssueDialog onClose={onClose} />);
    fireEvent.keyDown(document, { key: 'Escape' });
    expect(onClose).toHaveBeenCalled();
  });
});
