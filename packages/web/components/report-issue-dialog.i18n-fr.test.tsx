import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, screen } from '@testing-library/react';

import { renderWithIntl } from '@/vitest.render-intl';

/**
 * Phase 82 Theme F (close-out) — behavioural fr-FR render of the report-issue dialog.
 *
 * Two things worth pinning beyond "the labels translate": the **overflow warning**
 * only renders once the edited body blows GitHub's URL budget (a key that resolves
 * on neither the initial nor the alert render is easy to miss), and the seeded
 * `{ title, body }` payload stays **English** on purpose — it becomes a public
 * GitHub issue, so it is not part of the localised surface.
 */

// usePathname needs the App Router runtime; stub it to the page under test.
vi.mock('next/navigation', () => ({ usePathname: () => '/board' }));
// useTheme needs a ThemeProvider; stub the resolved values.
vi.mock('@/app/theme/theme-context', () => ({
  useTheme: () => ({ preference: 'dark', resolved: 'dark' }),
}));

import { ReportIssueDialog } from './report-issue-dialog';

afterEach(cleanup);

describe('Phase 82 F — report-issue dialog renders fr-FR', () => {
  it('labels the dialog, the fields and the actions in French', () => {
    renderWithIntl(<ReportIssueDialog onClose={vi.fn()} />, { locale: 'fr-FR' });

    expect(screen.getByRole('dialog', { name: 'Signaler un problème' })).toBeInTheDocument();
    expect(
      screen.getByText(/Cela ouvre un ticket/, { selector: 'p' }),
    ).toHaveTextContent('Tout ce qui suit est modifiable');
    expect(screen.getByLabelText('Titre')).toBeInTheDocument();
    expect(screen.getByLabelText('Détails')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Copier le contenu' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Ouvrir sur GitHub' })).toBeInTheDocument();
    // Reused generic key, not a dialog-local duplicate.
    expect(screen.getByRole('button', { name: 'Annuler' })).toBeInTheDocument();
  });

  it('warns in French when the report outgrows the GitHub URL budget', () => {
    renderWithIntl(<ReportIssueDialog onClose={vi.fn()} />, { locale: 'fr-FR' });

    fireEvent.change(screen.getByLabelText('Détails'), { target: { value: 'x'.repeat(20000) } });
    expect(screen.getByRole('alert')).toHaveTextContent(
      'Ce rapport est trop long pour un lien GitHub',
    );
  });

  it('leaves the outbound issue payload in English', () => {
    const open = vi.spyOn(window, 'open').mockReturnValue(null);
    renderWithIntl(<ReportIssueDialog onClose={vi.fn()} />, { locale: 'fr-FR' });

    // The seeded title/body are `buildReportContext`'s English output — a French
    // title on a public tracker would be worse than an English one.
    expect((screen.getByLabelText('Titre') as HTMLInputElement).value).toBe('[bug] /board — ');
    expect((screen.getByLabelText('Détails') as HTMLTextAreaElement).value).toContain(
      '### What happened?',
    );

    fireEvent.click(screen.getByRole('button', { name: 'Ouvrir sur GitHub' }));
    const url = new URL(open.mock.calls[0]![0] as string);
    expect(url.searchParams.get('body')).toContain('### Environment');
  });
});
