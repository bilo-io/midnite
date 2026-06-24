import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import type { Breakdown } from '@midnite/shared';

import { BreakdownEditor } from './breakdown-editor';

afterEach(cleanup);

function makeBreakdown(): Breakdown {
  return {
    tasks: [
      { ref: 'api', title: 'Build API', kind: 'feature', priority: 2, dependsOn: [] },
      { ref: 'client', title: 'Build client', kind: 'feature', priority: 1, dependsOn: ['api'] },
    ],
  };
}

describe('BreakdownEditor', () => {
  it('renders each task with its title and shows the dependency edge', () => {
    render(<BreakdownEditor breakdown={makeBreakdown()} onChange={vi.fn()} />);

    expect(screen.getByDisplayValue('Build API')).toBeInTheDocument();
    expect(screen.getByDisplayValue('Build client')).toBeInTheDocument();
    // The client's blocker chip names the API task.
    expect(
      screen.getByLabelText('Remove blocker Build API from Build client'),
    ).toBeInTheDocument();
  });

  it('removes a dependency edge when its chip is dismissed', () => {
    const onChange = vi.fn();
    render(<BreakdownEditor breakdown={makeBreakdown()} onChange={onChange} />);

    fireEvent.click(screen.getByLabelText('Remove blocker Build API from Build client'));

    expect(onChange).toHaveBeenCalledTimes(1);
    const next = onChange.mock.calls[0]![0] as Breakdown;
    expect(next.tasks.find((t) => t.ref === 'client')?.dependsOn).toEqual([]);
  });

  it('prunes a task and strips it from other tasks dependsOn', () => {
    const onChange = vi.fn();
    render(<BreakdownEditor breakdown={makeBreakdown()} onChange={onChange} />);

    fireEvent.click(screen.getByLabelText('Remove Build API'));

    const next = onChange.mock.calls[0]![0] as Breakdown;
    expect(next.tasks.map((t) => t.ref)).toEqual(['client']);
    expect(next.tasks[0]!.dependsOn).toEqual([]);
  });

  it('edits a task title', () => {
    const onChange = vi.fn();
    render(<BreakdownEditor breakdown={makeBreakdown()} onChange={onChange} />);

    fireEvent.change(screen.getByLabelText('Title for api'), {
      target: { value: 'Build the API' },
    });

    const next = onChange.mock.calls[0]![0] as Breakdown;
    expect(next.tasks.find((t) => t.ref === 'api')?.title).toBe('Build the API');
  });
});
