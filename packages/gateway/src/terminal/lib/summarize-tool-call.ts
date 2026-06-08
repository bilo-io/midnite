const SUMMARY_LIMIT = 140;

function truncate(value: string): string {
  return value.length <= SUMMARY_LIMIT
    ? value
    : value.slice(0, SUMMARY_LIMIT - 1).trimEnd() + '…';
}

function str(value: unknown): string | undefined {
  return typeof value === 'string' ? value : undefined;
}

/**
 * Render a one-line, human-readable summary of a Claude Code tool call for the
 * approval prompt — e.g. `Bash: rm -rf build/` or `Edit: src/app.ts`. Falls back
 * to the bare tool name for unknown tools or missing inputs. Pure (tested).
 */
export function summarizeToolCall(toolName: string, input: unknown): string {
  const obj = input && typeof input === 'object' ? (input as Record<string, unknown>) : {};
  const detail = ((): string | undefined => {
    switch (toolName) {
      case 'Bash':
        return str(obj['command']);
      case 'Write':
      case 'Edit':
      case 'MultiEdit':
        return str(obj['file_path']);
      case 'NotebookEdit':
        return str(obj['notebook_path']);
      case 'Read':
        return str(obj['file_path']);
      case 'Glob':
      case 'Grep':
        return str(obj['pattern']);
      case 'WebFetch':
        return str(obj['url']);
      case 'WebSearch':
        return str(obj['query']);
      default:
        return undefined;
    }
  })();
  return truncate(detail ? `${toolName}: ${detail}` : toolName);
}
