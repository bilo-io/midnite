import React from 'react';
import { render } from 'ink-testing-library';
import { describe, expect, it } from 'vitest';
import { LogPanel, appendLines } from './LogPanel.js';

describe('appendLines', () => {
  it('decodes base64 and splits on newlines', () => {
    const encoded = Buffer.from('hello\nworld').toString('base64');
    expect(appendLines([], encoded)).toEqual(['hello', 'world']);
  });

  it('strips ANSI escape codes', () => {
    const raw = '\x1b[32mgreen\x1b[0m text';
    const encoded = Buffer.from(raw).toString('base64');
    const lines = appendLines([], encoded);
    expect(lines[0]).toBe('green text');
  });

  it('appends to existing buffer', () => {
    const encoded = Buffer.from('line3').toString('base64');
    expect(appendLines(['line1', 'line2'], encoded)).toEqual(['line1', 'line2', 'line3']);
  });

  it('caps buffer at 100 lines', () => {
    const initial = Array.from({ length: 99 }, (_, i) => `line${i}`);
    const encoded = Buffer.from('a\nb\nc').toString('base64');
    const result = appendLines(initial, encoded);
    expect(result.length).toBe(100);
    expect(result[result.length - 1]).toBe('c');
  });
});

describe('LogPanel', () => {
  it('shows "no session" hint when sessionId is null', () => {
    const { lastFrame } = render(
      <LogPanel sessionId={null} taskTitle={null} lines={[]} exited={false} />,
    );
    expect(lastFrame()).toContain('no session selected');
  });

  it('shows task title when session is selected', () => {
    const { lastFrame } = render(
      <LogPanel sessionId="sess1" taskTitle="Build the API" lines={[]} exited={false} />,
    );
    expect(lastFrame()).toContain('Build the API');
  });

  it('renders log lines', () => {
    const { lastFrame } = render(
      <LogPanel sessionId="s1" taskTitle="task" lines={['output line one', 'output line two']} exited={false} />,
    );
    expect(lastFrame()).toContain('output line one');
    expect(lastFrame()).toContain('output line two');
  });

  it('shows exited footer when session has ended', () => {
    const { lastFrame } = render(
      <LogPanel sessionId="s1" taskTitle="task" lines={['done']} exited={true} />,
    );
    expect(lastFrame()).toContain('session exited');
  });

  it('shows waiting message when session is active but no output yet', () => {
    const { lastFrame } = render(
      <LogPanel sessionId="s1" taskTitle="task" lines={[]} exited={false} />,
    );
    expect(lastFrame()).toContain('waiting for output');
  });
});
