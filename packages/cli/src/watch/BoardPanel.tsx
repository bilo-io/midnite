import React from 'react';
import { Box, Text } from 'ink';
import type { Task } from '@midnite/shared';

interface Props {
  tasks: Task[] | null;
}

const COLUMNS = ['backlog', 'todo', 'wip', 'waiting', 'done'] as const;

export function BoardPanel({ tasks }: Props) {
  if (tasks === null) {
    return (
      <Box borderStyle="round" flexGrow={1} padding={1}>
        <Text dimColor>loading board…</Text>
      </Box>
    );
  }

  return (
    <Box flexGrow={1} flexDirection="row" gap={1}>
      {COLUMNS.map((col) => {
        const colTasks = tasks.filter((t) => t.status === col);
        return (
          <Box key={col} flexDirection="column" flexGrow={1} borderStyle="round" padding={1}>
            <Text bold color="cyan">
              {col.toUpperCase()} ({colTasks.length})
            </Text>
            {colTasks.length === 0 ? (
              <Text dimColor>—</Text>
            ) : (
              colTasks.slice(0, 8).map((t) => (
                <Box key={t.id}>
                  <Text wrap="truncate">{t.title}</Text>
                </Box>
              ))
            )}
          </Box>
        );
      })}
    </Box>
  );
}
