import React from 'react';
import { Box, Text } from 'ink';
import type { AgentSlot } from '@midnite/shared';

interface Props {
  slots: AgentSlot[] | null;
}

export function PoolPanel({ slots }: Props) {
  return (
    <Box borderStyle="round" padding={1} flexDirection="column">
      <Text bold color="magenta">POOL</Text>
      {slots === null ? (
        <Text dimColor>loading pool…</Text>
      ) : slots.length === 0 ? (
        <Text dimColor>no agent slots</Text>
      ) : (
        slots.map((slot) => (
          <Box key={slot.id} gap={2}>
            <Text color={slot.status === 'busy' ? 'green' : 'gray'}>
              {slot.status === 'busy' ? '●' : '○'}
            </Text>
            <Text>{slot.status.padEnd(4)}</Text>
            {slot.taskId !== undefined ? (
              <Text dimColor>{slot.taskId.slice(0, 8)}…</Text>
            ) : (
              <Text dimColor>idle</Text>
            )}
            {slot.pid !== undefined && <Text dimColor>pid {slot.pid}</Text>}
          </Box>
        ))
      )}
    </Box>
  );
}
