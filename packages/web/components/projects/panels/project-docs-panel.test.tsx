import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, screen, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { CouncilRun, Project } from '@midnite/shared';

import { renderWithIntl } from '@/vitest.render-intl';

afterEach(cleanup);
beforeEach(() => vi.clearAllMocks());

const getCouncilRunsByProject = vi.fn();
vi.mock('@/lib/api', () => ({
  getCouncilRunsByProject: (...a: unknown[]) => getCouncilRunsByProject(...a),
}));

// The Documents section is the pre-existing, gateway-backed ProjectPlanPanel —
// it's covered by its own test file, so stub it here to isolate this panel to
// the new council-runs section + the tab wiring around it.
vi.mock('@/components/projects/panels/project-plan-panel', () => ({
  ProjectPlanPanel: () => <div data-testid="plan-panel" />,
}));

import { ProjectDocsPanel } from './project-docs-panel';

const project: Project = {
  id: 'p1',
  name: 'Acme',
  tag: 'ACM',
  color: '#6366f1',
  createdAt: '2026-07-01T00:00:00.000Z',
  updatedAt: '2026-07-01T00:00:00.000Z',
};

function makeRun(overrides: Partial<CouncilRun> = {}): CouncilRun {
  return {
    id: 'r1',
    councilId: 'c1',
    prompt: 'Should we ship the new onboarding flow?',
    format: 'brainstorm',
    status: 'completed',
    members: [],
    syntheses: [],
    startedAt: '2026-07-01T00:00:00.000Z',
    ...overrides,
  };
}

// useApiData is backed by TanStack Query — every render needs a client in scope.
// The run-status pill's wording comes from the `council` catalog (Phase 82 D), so the
// panel needs an intl provider too — `renderWithIntl` supplies the real catalogs at
// en-GB, keeping the English assertions below exact.
function renderPanel() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return renderWithIntl(
    <QueryClientProvider client={queryClient}>
      <ProjectDocsPanel project={project} />
    </QueryClientProvider>,
  );
}

describe('ProjectDocsPanel', () => {
  it('fetches and renders council runs linked to the project', async () => {
    getCouncilRunsByProject.mockResolvedValue([makeRun()]);
    renderPanel();
    await waitFor(() => expect(getCouncilRunsByProject).toHaveBeenCalledWith('p1'));
    expect(await screen.findByText('Should we ship the new onboarding flow?')).toBeInTheDocument();
    expect(screen.getByText('Completed')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Should we ship the new onboarding flow\?/ })).toHaveAttribute(
      'href',
      '/councils/view?id=c1',
    );
  });

  it('shows an empty state when no runs are linked', async () => {
    getCouncilRunsByProject.mockResolvedValue([]);
    renderPanel();
    expect(await screen.findByText('No council runs linked to this project yet.')).toBeInTheDocument();
  });

  it('always renders the Documents section (the existing plan panel)', async () => {
    getCouncilRunsByProject.mockResolvedValue([]);
    renderPanel();
    expect(screen.getByTestId('plan-panel')).toBeInTheDocument();
  });
});
