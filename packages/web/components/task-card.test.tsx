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
