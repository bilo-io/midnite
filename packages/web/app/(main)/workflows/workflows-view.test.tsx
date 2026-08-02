import { describe, expect, it, vi } from 'vitest';
import { screen } from '@testing-library/react';
import type { WorkflowSummary } from '@midnite/shared';

import { renderWithIntl as render } from '@/vitest.render-intl';

vi.mock('next/navigation', () => ({
  useSearchParams: () => new URLSearchParams(),
  usePathname: () => '/workflows',
  useRouter: () => ({ push: vi.fn(), replace: vi.fn() }),
}));

vi.mock('@/lib/api', () => ({
  deleteWorkflow: vi.fn(),
  duplicateWorkflow: vi.fn(),
  updateWorkflow: vi.fn().mockResolvedValue(undefined),
}));

vi.mock('@/lib/data-refresh', () => ({ invalidateData: vi.fn() }));

import { WorkflowsView } from './workflows-view';

const WORKFLOWS: WorkflowSummary[] = [
  {
    id: 'wf1',
    name: 'Nightly repo digest',
    enabled: true,
    triggerType: 'manual',
    nodeCount: 2,
    steps: [],
    createdAt: '2026-06-01T09:00:00.000Z',
    updatedAt: '2026-06-21T09:00:00.000Z',
  },
];

describe('WorkflowsView (i18n)', () => {
  it('renders the en-GB toolbar + grouped copy', () => {
    render(<WorkflowsView initial={WORKFLOWS} />);
    expect(screen.getByRole('button', { name: 'New workflow' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Table view' })).toBeInTheDocument();
    // Trigger groups are labelled from the catalog, one accordion per trigger type
    // ("Manual" also appears on the card's own trigger badge).
    expect(screen.getAllByText('Manual').length).toBeGreaterThan(0);
    expect(screen.getByText('Task Event')).toBeInTheDocument();
    // The card's node count is an ICU plural.
    expect(screen.getByText('2 nodes')).toBeInTheDocument();
    // A trigger type with no workflows explains itself.
    expect(screen.getByText('No webhook workflows')).toBeInTheDocument();
  });

  it('renders French copy under fr-FR (user data stays untranslated)', () => {
    render(<WorkflowsView initial={WORKFLOWS} />, { locale: 'fr-FR' });
    expect(screen.getByRole('button', { name: 'Nouveau workflow' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Vue tableau' })).toBeInTheDocument();
    // Both the trigger section heading and each card's TriggerBadge read the same
    // `list.triggers.*` keys, so a trigger label appears more than once.
    expect(screen.getAllByText('Manuel').length).toBeGreaterThan(1);
    expect(screen.getAllByText('Événement de tâche').length).toBeGreaterThan(0);
    expect(screen.getByText('2 nœuds')).toBeInTheDocument();
    expect(screen.getByText('Aucun workflow webhook')).toBeInTheDocument();
    // The workflow's own name is user data — never translated.
    expect(screen.getByText('Nightly repo digest')).toBeInTheDocument();
  });

  it('translates the empty state', () => {
    render(<WorkflowsView initial={[]} />, { locale: 'fr-FR' });
    expect(screen.getByText('Aucun workflow pour l’instant')).toBeInTheDocument();
  });
});
