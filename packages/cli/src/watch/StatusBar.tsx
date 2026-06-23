import React from 'react';
import { Box, Text } from 'ink';

export type ConnectionState = 'connecting' | 'connected' | 'disconnected';

interface Props {
  baseUrl: string;
  connState: ConnectionState;
  lastUpdate: Date | null;
}

function connDot(state: ConnectionState): { color: string; label: string } {
  switch (state) {
    case 'connected':
      return { color: 'green', label: 'connected' };
    case 'connecting':
      return { color: 'yellow', label: 'connecting…' };
    case 'disconnected':
      return { color: 'red', label: 'disconnected' };
  }
}

function formatTick(d: Date | null): string {
  if (!d) return '--:--:--';
  return d.toTimeString().slice(0, 8);
}

export function StatusBar({ baseUrl, connState, lastUpdate }: Props) {
  const { color, label } = connDot(connState);
  return (
    <Box paddingX={1} borderStyle="single" borderBottom={false} borderLeft={false} borderRight={false}>
      <Text bold>midnite watch</Text>
      <Text>{'  '}</Text>
      <Text color={color}>●</Text>
      <Text> {label}</Text>
      <Text dimColor>{'  │  '}</Text>
      <Text>{baseUrl}</Text>
      <Text dimColor>{'  │  ↻ '}</Text>
      <Text dimColor>{formatTick(lastUpdate)}</Text>
    </Box>
  );
}
