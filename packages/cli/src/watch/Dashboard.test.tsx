import React from 'react';
import { render } from 'ink-testing-library';
import { describe, expect, it } from 'vitest';
import { StatusBar } from './StatusBar.js';
import { BoardPanel } from './BoardPanel.js';
import { PoolPanel } from './PoolPanel.js';

describe('StatusBar', () => {
  it('renders the gateway URL', () => {
    const { lastFrame } = render(
      <StatusBar baseUrl="http://localhost:7777" connState="connected" lastUpdate={null} />,
    );
    expect(lastFrame()).toContain('localhost:7777');
  });

  it('shows "connected" state with green dot', () => {
    const { lastFrame } = render(
      <StatusBar baseUrl="http://localhost:7777" connState="connected" lastUpdate={null} />,
    );
    expect(lastFrame()).toContain('connected');
  });

  it('shows "connecting" state', () => {
    const { lastFrame } = render(
      <StatusBar baseUrl="http://localhost:7777" connState="connecting" lastUpdate={null} />,
    );
    expect(lastFrame()).toContain('connecting');
  });

  it('shows "disconnected" state', () => {
    const { lastFrame } = render(
      <StatusBar baseUrl="http://localhost:7777" connState="disconnected" lastUpdate={null} />,
    );
    expect(lastFrame()).toContain('disconnected');
  });

  it('renders "--:--:--" when no last-update', () => {
    const { lastFrame } = render(
      <StatusBar baseUrl="http://localhost:7777" connState="connected" lastUpdate={null} />,
    );
    expect(lastFrame()).toContain('--:--:--');
  });
});

describe('BoardPanel', () => {
  it('shows loading state when tasks is null', () => {
    const { lastFrame } = render(<BoardPanel tasks={null} />);
    expect(lastFrame()).toContain('loading board');
  });

  it('renders column headers for each status', () => {
    const { lastFrame } = render(<BoardPanel tasks={[]} />);
    expect(lastFrame()).toContain('BACKLOG');
    expect(lastFrame()).toContain('TODO');
    expect(lastFrame()).toContain('WIP');
    expect(lastFrame()).toContain('DONE');
  });

  it('shows task titles in the correct column', () => {
    const task = {
      id: 'abc123',
      title: 'Fix the bug',
      status: 'todo' as const,
      priority: 1,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    const { lastFrame } = render(<BoardPanel tasks={[task as never]} />);
    expect(lastFrame()).toContain('Fix the bug');
  });

  it('shows short task id, priority indicator, and repo when present', () => {
    const task = {
      id: 'abc1234567',
      title: 'Build feature',
      status: 'wip' as const,
      priority: 2,
      repo: 'myrepo',
    };
    const { lastFrame } = render(<BoardPanel tasks={[task as never]} />);
    expect(lastFrame()).toContain('abc1234');
    expect(lastFrame()).toContain('Build feature');
    expect(lastFrame()).toContain('myrepo');
  });

  it('shows ● indicator on the keyboard-focused task', () => {
    const task = { id: 'xyz789abc', title: 'Focused task', status: 'todo' as const, priority: 1 };
    const { lastFrame } = render(
      <BoardPanel tasks={[task as never]} focusedColIdx={1} focusedTaskId="xyz789abc" />,
    );
    expect(lastFrame()).toContain('●');
    expect(lastFrame()).toContain('Focused task');
  });

  it('shows ▶ indicator on the log-selected (Tab) task', () => {
    const task = { id: 'wip001', title: 'Running agent', status: 'wip' as const, priority: 1 };
    const { lastFrame } = render(
      <BoardPanel tasks={[task as never]} selectedTaskId="wip001" />,
    );
    expect(lastFrame()).toContain('▶');
  });
});

describe('PoolPanel', () => {
  it('shows loading state when slots is null', () => {
    const { lastFrame } = render(<PoolPanel slots={null} />);
    expect(lastFrame()).toContain('loading pool');
  });

  it('shows POOL header', () => {
    const { lastFrame } = render(<PoolPanel slots={[]} />);
    expect(lastFrame()).toContain('POOL');
  });

  it('renders idle and busy slots', () => {
    const slots = [
      { id: 's1', status: 'idle' as const },
      { id: 's2', status: 'busy' as const, taskId: 'task-abc', pid: 12345 },
    ];
    const { lastFrame } = render(<PoolPanel slots={slots} />);
    expect(lastFrame()).toContain('idle');
    expect(lastFrame()).toContain('busy');
    expect(lastFrame()).toContain('12345');
  });
});
