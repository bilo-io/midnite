import React from 'react';
import { Box, Text } from 'ink';

// Max lines kept in the scrollback buffer.
const MAX_LINES = 100;

// Strip ANSI escape codes so ink doesn't choke on raw terminal sequences.
// This is intentionally simple — replace all ESC[...m sequences.
function stripAnsi(str: string): string {
  // eslint-disable-next-line no-control-regex
  return str.replace(/\x1b\[[0-9;]*[a-zA-Z]/g, '').replace(/\x1b\][^\x07]*\x07/g, '');
}

export function appendLines(buffer: string[], raw: string): string[] {
  const decoded = stripAnsi(Buffer.from(raw, 'base64').toString('utf8'));
  const incoming = decoded.split('\n');
  const next = [...buffer, ...incoming];
  return next.length > MAX_LINES ? next.slice(next.length - MAX_LINES) : next;
}

interface Props {
  sessionId: string | null;
  taskTitle: string | null;
  lines: string[];
  exited: boolean;
}

export function LogPanel({ sessionId, taskTitle, lines, exited }: Props) {
  return (
    <Box flexDirection="column" borderStyle="round" padding={1}>
      <Box marginBottom={1}>
        <Text bold color="magenta">LOGS </Text>
        {sessionId ? (
          <Text dimColor>
            {taskTitle ?? sessionId.slice(0, 8)}
          </Text>
        ) : (
          <Text dimColor>no session selected — focus a wip task with Tab</Text>
        )}
      </Box>
      {lines.length === 0 && !exited ? (
        <Text dimColor>waiting for output…</Text>
      ) : (
        <Box flexDirection="column">
          {lines.slice(-20).map((line, i) => (
            <Text key={i} wrap="truncate">{line || ' '}</Text>
          ))}
        </Box>
      )}
      {exited && (
        <Box marginTop={1}>
          <Text color="gray" dimColor>— session exited —</Text>
        </Box>
      )}
    </Box>
  );
}
