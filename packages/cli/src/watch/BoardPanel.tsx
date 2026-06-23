import React from 'react';
import { Box, Text } from 'ink';
import type { Task } from '@midnite/shared';

interface Props {
  tasks: Task[] | null;
}

const COLUMNS = ['backlog', 'todo', 'wip', 'waiting', 'done'] as const;
type Col = (typeof COLUMNS)[number];

const COL_COLOR: Record<Col, string> = {
  backlog: 'gray',
  todo: 'cyan',
  wip: 'green',
  waiting: 'yellow',
  done: 'white',
};

const PRIORITY_LABEL = ['↓', '–', '↑', '↑↑'] as const;

function TaskCard({ task }: { task: Task }) {
  const priority = PRIORITY_LABEL[task.priority ?? 1] ?? '–';
  return (
    <Box gap={1} marginBottom={0}>
      <Text color="gray">{task.id.slice(0, 7)}</Text>
      <Text color="yellow" dimColor>{priority}</Text>
      <Text wrap="truncate">{task.title}</Text>
      {task.repo ? <Text color="blue" dimColor>[{task.repo}]</Text> : null}
    </Box>
  );
}

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
            <Text bold color={COL_COLOR[col]}>
              {col.toUpperCase()} ({colTasks.length})
            </Text>
            {colTasks.length === 0 ? (
              <Text dimColor>—</Text>
            ) : (
              colTasks.slice(0, 8).map((t) => <TaskCard key={t.id} task={t} />)
            )}
          </Box>
        );
      })}
    </Box>
  );
}
