import { afterEach, describe, expect, it } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import type { Task } from '@midnite/shared';

import { TaskCard } from './task-card';

afterEach(cleanup);

const baseTask: Task = {
  id: 't1',
  title: 'What is a closure?',
  status: 'done',
  priority: 1,
  retryCount: 0,
  fixAttempts: 0,
  tags: [],
  events: [],
};

const answerEvent = { at: '2026-06-22T00:00:00Z', kind: 'answer', data: { text: 'A closure is …' } };

describe('TaskCard — answered affordance', () => {
  it('shows an Answered badge for a question resolved inline', () => {
    render(<TaskCard task={{ ...baseTask, kind: 'question', events: [answerEvent] }} />);
    expect(screen.getByText('Answered')).toBeInTheDocument();
    // The kind identity is still shown alongside.
    expect(screen.getByText('Question')).toBeInTheDocument();
  });

  it('omits the badge for an ordinary completed task', () => {
    render(<TaskCard task={{ ...baseTask, kind: 'feature', events: [] }} />);
    expect(screen.queryByText('Answered')).toBeNull();
  });

  it('omits the badge for a question that has no answer event', () => {
    render(<TaskCard task={{ ...baseTask, kind: 'question', events: [{ at: '', kind: 'task.created' }] }} />);
    expect(screen.queryByText('Answered')).toBeNull();
  });
});

describe('TaskCard — blocked badge', () => {
  it('shows the blocked badge when blockedBy > 0', () => {
    render(<TaskCard task={{ ...baseTask, status: 'todo' }} blockedBy={2} />);
    expect(screen.getByLabelText('Blocked by 2 tasks')).toBeInTheDocument();
    expect(screen.getByText('Blocked')).toBeInTheDocument();
    expect(screen.getByText('2')).toBeInTheDocument();
  });

  it('uses the singular label for a single blocker', () => {
    render(<TaskCard task={{ ...baseTask, status: 'todo' }} blockedBy={1} />);
    expect(screen.getByLabelText('Blocked by 1 task')).toBeInTheDocument();
  });

  it('omits the badge when blockedBy is 0 or absent', () => {
    render(<TaskCard task={{ ...baseTask, status: 'todo' }} blockedBy={0} />);
    expect(screen.queryByText('Blocked')).toBeNull();
    cleanup();
    render(<TaskCard task={{ ...baseTask, status: 'todo' }} />);
    expect(screen.queryByText('Blocked')).toBeNull();
  });
});

describe('TaskCard — checks failing badge', () => {
  it('shows a "Checks failing" badge when checkRunStatus is failing', () => {
    render(<TaskCard task={{ ...baseTask, status: 'wip', checkRunStatus: 'failing' }} />);
    expect(screen.getByText('Checks failing')).toBeInTheDocument();
  });

  it('omits the badge when checkRunStatus is passed', () => {
    render(<TaskCard task={{ ...baseTask, status: 'wip', checkRunStatus: 'passed' }} />);
    expect(screen.queryByText('Checks failing')).toBeNull();
  });

  it('omits the badge when checkRunStatus is absent', () => {
    render(<TaskCard task={{ ...baseTask, status: 'wip' }} />);
    expect(screen.queryByText('Checks failing')).toBeNull();
  });
});
