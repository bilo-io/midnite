import React, { useEffect, useState } from 'react';
import { Box, Text, useApp, useInput } from 'ink';
import {
  AgentPoolSnapshotSchema,
  applyTaskEvent,
  TASKS_WS_PATH,
  TaskBoardEventSchema,
  TaskSchema,
  type AgentSlot,
  type Task,
  type TaskBoardEvent,
} from '@midnite/shared';
import { gatewayWsUrl, openWs } from '../ws.js';
import { StatusBar, type ConnectionState } from './StatusBar.js';
import { BoardPanel } from './BoardPanel.js';
import { PoolPanel } from './PoolPanel.js';

interface Props {
  baseUrl: string;
}

export function Dashboard({ baseUrl }: Props) {
  const { exit } = useApp();
  const [connState, setConnState] = useState<ConnectionState>('connecting');
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);
  const [tasks, setTasks] = useState<Task[] | null>(null);
  const [slots, setSlots] = useState<AgentSlot[] | null>(null);

  // Seed the board and pool from REST snapshots, then stay live via WS.
  useEffect(() => {
    let active = true;

    // Tasks are seeded (and re-seeded on a bulk add — see below) on their own so a
    // `tasks.bulkCreated` event, which carries only ids, can refetch the full board.
    const fetchTasks = async (): Promise<void> => {
      try {
        const res = await fetch(`${baseUrl}/tasks`);
        if (!res.ok || !active) return;
        const parsed = TaskSchema.array().safeParse((await res.json()) as unknown);
        if (parsed.success && active) setTasks(parsed.data);
      } catch {
        // gateway unreachable — WS state will show disconnected
      }
    };

    const fetchPool = async (): Promise<void> => {
      try {
        const res = await fetch(`${baseUrl}/pool`);
        if (!res.ok || !active) return;
        const parsed = AgentPoolSnapshotSchema.safeParse((await res.json()) as unknown);
        if (parsed.success && active) setSlots(parsed.data.slots);
      } catch {
        // gateway unreachable — WS state will show disconnected
      }
    };

    void fetchTasks();
    void fetchPool();

    const wsUrl = gatewayWsUrl(baseUrl);
    const handle = openWs<TaskBoardEvent>(wsUrl + TASKS_WS_PATH, {
      reconnect: true,
      parse: (raw) => {
        try {
          return TaskBoardEventSchema.safeParse(JSON.parse(raw)).data ?? null;
        } catch {
          return null;
        }
      },
      onReady: () => {
        if (active) setConnState('connected');
      },
      onMessage: (event) => {
        if (!active) return;
        setLastUpdate(new Date());
        // A bulk add carries only ids — refetch the full board; everything else
        // folds in via the pure shared reducer.
        if (event.type === 'tasks.bulkCreated') {
          void fetchTasks();
          return;
        }
        setTasks((prev) => applyTaskEvent(prev, event));
      },
      onError: () => {
        if (active) setConnState('disconnected');
      },
    });

    return () => {
      active = false;
      handle.close();
    };
  }, [baseUrl]);

  useInput((input, key) => {
    if (input === 'q' || (key.ctrl && input === 'c')) exit();
  });

  return (
    <Box flexDirection="column">
      <StatusBar baseUrl={baseUrl} connState={connState} lastUpdate={lastUpdate} />
      <BoardPanel tasks={tasks} />
      <PoolPanel slots={slots} />
      <Box paddingX={1}>
        <Text dimColor>q quit  ↑↓ select  ←→ columns  m move</Text>
      </Box>
    </Box>
  );
}
