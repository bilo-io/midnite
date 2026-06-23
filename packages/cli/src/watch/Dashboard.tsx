import React, { useEffect, useRef, useState } from 'react';
import { Box, Text, useApp, useInput } from 'ink';
import {
  AgentPoolSnapshotSchema,
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

    const fetchSnapshots = async (): Promise<void> => {
      try {
        const [tasksRes, poolRes] = await Promise.all([
          fetch(`${baseUrl}/tasks`),
          fetch(`${baseUrl}/pool`),
        ]);
        if (!active) return;
        if (tasksRes.ok) {
          const data = (await tasksRes.json()) as unknown;
          const parsed = TaskSchema.array().safeParse(data);
          if (parsed.success && active) setTasks(parsed.data);
        }
        if (poolRes.ok) {
          const data = (await poolRes.json()) as unknown;
          const parsed = AgentPoolSnapshotSchema.safeParse(data);
          if (parsed.success && active) setSlots(parsed.data.slots);
        }
      } catch {
        // gateway unreachable — WS state will show disconnected
      }
    };

    void fetchSnapshots();

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
        setTasks((prev) => applyBoardEvent(prev, event));
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

function applyBoardEvent(prev: Task[] | null, event: TaskBoardEvent): Task[] | null {
  if (prev === null) return null;
  switch (event.type) {
    case 'task.created':
      return [...prev, event.task];
    case 'task.updated':
      return prev.map((t) => (t.id === event.task.id ? event.task : t));
    case 'task.deleted':
      return prev.filter((t) => t.id !== event.id);
    case 'tasks.bulkCreated':
      // Bulk create only carries ids — a full refetch would be needed for the
      // full task objects. For now, mark as stale by returning null so the
      // next WS connection triggers a fresh seed. B2 will handle this properly
      // with the full board reducer.
      return null;
  }
}
