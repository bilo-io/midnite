import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, screen } from '@testing-library/react';
import { renderWithIntl as render } from '@/vitest.render-intl';
import type { CouncilRun, Project } from '@midnite/shared';

import { CouncilRunThread } from './council-run-thread';

afterEach(cleanup);

const project: Project = {
  id: 'p1',
  name: 'Roadmap',
  tag: 'roadmap',
  color: '#4f46e5',
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z',
};

function makeRun(overrides: Partial<CouncilRun> = {}): CouncilRun {
  return {
    id: 'r1',
    councilId: 'c1',
    prompt: 'Should we ship this?',
    format: 'brainstorm',
    status: 'completed',
    syntheses: [],
    members: [],
    startedAt: '2026-01-01T00:00:00.000Z',
    ...overrides,
  };
}

describe('CouncilRunThread', () => {
  it('renders each run and selecting one calls onSelect', () => {
    const run = makeRun();
    const onSelect = vi.fn();
    render(
      <CouncilRunThread
        runs={[run]}
        selectedId={null}
        onSelect={onSelect}
        open
        projects={[]}
        onChangeProject={vi.fn()}
      />,
    );
    expect(screen.getByText(run.prompt)).toBeInTheDocument();
    fireEvent.click(screen.getByText(run.prompt));
    expect(onSelect).toHaveBeenCalledWith(run);
  });

  it('shows no project dropdown when there are no projects', () => {
    render(
      <CouncilRunThread
        runs={[makeRun()]}
        selectedId={null}
        onSelect={vi.fn()}
        open
        projects={[]}
        onChangeProject={vi.fn()}
      />,
    );
    expect(screen.queryByRole('button', { name: /no project/i })).toBeNull();
  });

  it('renders a ProjectSelect per run and picking a project calls onChangeProject without selecting the run', () => {
    const run = makeRun();
    const onSelect = vi.fn();
    const onChangeProject = vi.fn();
    render(
      <CouncilRunThread
        runs={[run]}
        selectedId={null}
        onSelect={onSelect}
        open
        projects={[project]}
        onChangeProject={onChangeProject}
      />,
    );

    // Opens the picker and selects the project — the run's own onSelect must
    // not fire, since the dropdown lives inside (but stops propagation from) the
    // clickable run row.
    fireEvent.click(screen.getByRole('button', { name: /no project/i }));
    fireEvent.click(screen.getByRole('option', { name: project.name }));

    expect(onChangeProject).toHaveBeenCalledWith(run.id, project.id);
    expect(onSelect).not.toHaveBeenCalled();
  });

  it("reflects the run's current project as the selected option", () => {
    const run = makeRun({ projectId: project.id });
    render(
      <CouncilRunThread
        runs={[run]}
        selectedId={null}
        onSelect={vi.fn()}
        open
        projects={[project]}
        onChangeProject={vi.fn()}
      />,
    );
    expect(screen.getByRole('button', { name: new RegExp(project.name) })).toBeInTheDocument();
  });

  it('shows the empty state when there are no runs', () => {
    render(
      <CouncilRunThread
        runs={[]}
        selectedId={null}
        onSelect={vi.fn()}
        open
        projects={[]}
        onChangeProject={vi.fn()}
      />,
    );
    expect(screen.getByText(/no runs yet/i)).toBeInTheDocument();
  });
});
