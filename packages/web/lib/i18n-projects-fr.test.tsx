import { cleanup, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { Project } from '@midnite/shared';

import { renderWithIntl } from '@/vitest.render-intl';

/**
 * Phase 82 Theme D (projects + pr-review slice) — behavioural proof that the migrated
 * surfaces actually *render* French, not merely that their keys resolve (that's
 * `i18n-projects-keys.test.ts`). One representative render per copy shape the slice
 * introduced: a plural, a locale-formatted number, an interpolated confirm/aria string,
 * and the shared-registry template seam.
 */

vi.mock('@/lib/api', () => ({
  exportProjectMarkdown: vi.fn(),
  submitPrReview: vi.fn(),
  mergePr: vi.fn(),
}));

const project: Project = {
  id: 'p1',
  name: 'Facturation',
  tag: 'BILL',
  color: '#6366f1',
  archived: false,
  taskCount: 3,
  taskStatusCounts: { done: 1 },
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z',
} as unknown as Project;

afterEach(cleanup);

describe('Phase 82 D — projects surfaces render fr-FR', () => {
  it('pluralises the task count in French on a project card', async () => {
    const { ProjectCard } = await import('@/components/project-card');
    const { ToastProvider } = await import('@/components/toast');
    renderWithIntl(
      <ToastProvider>
        <ProjectCard project={project} layout="grid" onOpen={vi.fn()} onPlan={vi.fn()} />
      </ToastProvider>,
      { locale: 'fr-FR' },
    );
    // `{count, plural, one {# tâche} other {# tâches}}` at 3 → the plural branch.
    expect(screen.getByText('3 tâches')).toBeInTheDocument();
  });

  it('uses the singular French branch at a count of one', async () => {
    const { ProjectCard } = await import('@/components/project-card');
    const { ToastProvider } = await import('@/components/toast');
    renderWithIntl(
      <ToastProvider>
        <ProjectCard
          project={{ ...project, taskCount: 1 }}
          layout="grid"
          onOpen={vi.fn()}
          onPlan={vi.fn()}
        />
      </ToastProvider>,
      { locale: 'fr-FR' },
    );
    expect(screen.getByText('1 tâche')).toBeInTheDocument();
  });

  it('renders the French progress summary with the locale percent form', async () => {
    const { ProjectProgressBar } = await import('@/components/project-progress');
    renderWithIntl(<ProjectProgressBar done={1} total={4} />, { locale: 'fr-FR' });
    expect(screen.getByText('Progression')).toBeInTheDocument();
    // fr-FR puts a space before the percent sign; en-GB does not.
    expect(screen.getByText('1/4 · 25 %')).toBeInTheDocument();
  });

  it('interpolates the missing-requirement clause into the French incomplete badge', async () => {
    const { ProjectStatusBadge } = await import('@/components/project-status-badge');
    renderWithIntl(
      <ProjectStatusBadge project={{ ...project, tag: '', workDir: undefined } as unknown as Project} />,
      { locale: 'fr-FR' },
    );
    const badge = screen.getByRole('status');
    expect(badge.getAttribute('aria-label')).toContain('il manque encore');
    expect(badge.getAttribute('aria-label')).toContain('une étiquette');
  });

  it('resolves a built-in doc template through the seam in French', async () => {
    const { TemplateCard } = await import('@/components/template-card');
    const { PROJECT_DOC_TEMPLATES } = await import('@midnite/shared');
    const prd = PROJECT_DOC_TEMPLATES.find((t) => t.id === 'prd')!;
    renderWithIntl(<TemplateCard template={prd} layout="grid" onOpen={vi.fn()} />, { locale: 'fr-FR' });
    expect(screen.getByText('Document d’exigences produit')).toBeInTheDocument();
  });

  it('falls back to the stored name for a template with no catalog entry', async () => {
    const { TemplateCard } = await import('@/components/template-card');
    const custom = {
      id: 'a-user-created-uuid',
      name: 'Mon modèle',
      tag: 'DOC',
      color: '#6366f1',
      description: 'Créé à la main',
      content: '# x',
    };
    renderWithIntl(<TemplateCard template={custom} layout="grid" onOpen={vi.fn()} />, { locale: 'fr-FR' });
    expect(screen.getByText('Mon modèle')).toBeInTheDocument();
  });
});

describe('Phase 82 D — pr-review surfaces render fr-FR', () => {
  it('pluralises pending inline comments in French', async () => {
    const { PrReviewActions } = await import('@/components/pr-review/pr-review-actions');
    const { ToastProvider } = await import('@/components/toast');
    renderWithIntl(
      <ToastProvider>
        <PrReviewActions
          taskId="t1"
          comments={[{ path: 'a.ts', line: 1, side: 'RIGHT', body: 'oui' }]}
          onClearComments={vi.fn()}
          onDone={vi.fn()}
        />
      </ToastProvider>,
      { locale: 'fr-FR' },
    );
    expect(screen.getByText('1 commentaire en ligne en attente')).toBeInTheDocument();
    expect(screen.getByRole('group', { name: 'Type de revue' })).toBeInTheDocument();
    expect(screen.getByText('Demander des modifications')).toBeInTheDocument();
  });
});
