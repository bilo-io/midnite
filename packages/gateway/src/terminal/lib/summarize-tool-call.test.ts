import { describe, expect, it } from 'vitest';
import { summarizeToolCall } from './summarize-tool-call';

describe('summarizeToolCall', () => {
  it('summarizes a Bash command', () => {
    expect(summarizeToolCall('Bash', { command: 'rm -rf build/' })).toBe('Bash: rm -rf build/');
  });

  it('summarizes file tools by path', () => {
    expect(summarizeToolCall('Edit', { file_path: 'src/app.ts' })).toBe('Edit: src/app.ts');
    expect(summarizeToolCall('NotebookEdit', { notebook_path: 'a.ipynb' })).toBe(
      'NotebookEdit: a.ipynb',
    );
  });

  it('summarizes web tools and search', () => {
    expect(summarizeToolCall('WebFetch', { url: 'https://x.test' })).toBe('WebFetch: https://x.test');
    expect(summarizeToolCall('Grep', { pattern: 'TODO' })).toBe('Grep: TODO');
  });

  it('falls back to the tool name when input is missing or unknown', () => {
    expect(summarizeToolCall('Bash', {})).toBe('Bash');
    expect(summarizeToolCall('SomeMcpTool', { foo: 1 })).toBe('SomeMcpTool');
    expect(summarizeToolCall('Bash', null)).toBe('Bash');
  });

  it('truncates very long commands', () => {
    const long = 'x'.repeat(300);
    const summary = summarizeToolCall('Bash', { command: long });
    expect(summary.length).toBeLessThanOrEqual(140);
    expect(summary.endsWith('…')).toBe(true);
  });
});
