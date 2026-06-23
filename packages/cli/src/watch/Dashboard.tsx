import React, { useEffect, useRef, useState } from 'react';
import { Box, Text, useApp, useInput } from 'ink';
import {
  AgentPoolSnapshotSchema,
  TASKS_WS_PATH,
  TERMINAL_WS_PATH,
  TaskBoardEventSchema,
  TaskSchema,
  ServerTerminalMessageSchema,
  applyTaskEvent,
  type AgentSlot,
  type Task,
  type TaskBoardEvent,
} from '@midnite/shared';
import { gatewayWsUrl, openWs } from '../ws.js';
import { StatusBar, type ConnectionState } from './StatusBar.js';
import { BoardPanel } from './BoardPanel.js';
import { PoolPanel } from './PoolPanel.js';
import { LogPanel, appendLines } from './LogPanel.js';

interface Props {
  baseUrl: string;
}

export function Dashboard({ baseUrl }: Props) {
  const { exit } = useApp();
  const [connState, setConnState] = useState<ConnectionState>('connecting');
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);
  const [tasks, setTasks] = useState<Task[] | null>(null);
  const [slots, setSlots] = useState<AgentSlot[] | null>(null);

  // ── D1: session selection ────────────────────────────────────────────────────
  const [selectedIdx, setSelectedIdx] = useState(0);
  // Log state for the selected session
  const [logLines, setLogLines] = useState<string[]>([]);
  const [logExited, setLogExited] = useState(false);
  const logWsRef = useRef<{ close(): void } | null>(null);

  // The wip tasks at any given moment — stable list the Tab key cycles.
  const wipTasks = tasks?.filter((t) => t.status === 'wip') ?? [];
  const selectedTask = wipTasks[selectedIdx % Math.max(1, wipTasks.length)] ?? null;

  // ── REST + board WS ──────────────────────────────────────────────────────────
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
        // gateway unreachable
      }
    };

    void fetchSnapshots();

    const wsUrl = gatewayWsUrl(baseUrl);
    const handle = openWs<TaskBoardEvent>(wsUrl + TASKS_WS_PATH, {
      reconnect: true,
      parse: (raw) => {
        try { return TaskBoardEventSchema.safeParse(JSON.parse(raw)).data ?? null; }
        catch { return null; }
      },
      onReady: () => { if (active) setConnState('connected'); },
      onMessage: (event) => {
        if (!active) return;
        setLastUpdate(new Date());
        setTasks((prev) => {
          if (prev === null) return null;
          const next = applyTaskEvent(prev, event);
          if (next === null) { void fetchSnapshots(); return prev; }
          return next;
        });
      },
      onError: () => { if (active) setConnState('disconnected'); },
    });

    return () => { active = false; handle.close(); };
  }, [baseUrl]);

  // ── D2: subscribe to the selected session's terminal output ──────────────────
  useEffect(() => {
    if (!selectedTask?.sessionId) {
      // No session yet — clear the log panel.
      setLogLines([]);
      setLogExited(false);
      logWsRef.current?.close();
      logWsRef.current = null;
      return;
    }

    const sessionId = selectedTask.sessionId;
    let active = true;
    setLogLines([]);
    setLogExited(false);
    logWsRef.current?.close();
    logWsRef.current = null;

    // Fetch a short-lived token, then open the terminal WS.
    const connectLog = async (): Promise<void> => {
      try {
        const tokenRes = await fetch(`${baseUrl}/sessions/${encodeURIComponent(sessionId)}/terminal-token`);
        if (!active || !tokenRes.ok) return;
        const { token, wsUrl: wsOverride } = (await tokenRes.json()) as { token: string; wsUrl?: string };
        if (!active) return;

        const wsBase = wsOverride ?? gatewayWsUrl(baseUrl);
        const handle = openWs<ReturnType<typeof ServerTerminalMessageSchema.parse>>(
          wsBase + TERMINAL_WS_PATH,
          {
            reconnect: false,
            noHandshake: true,
            parse: (raw) => {
              try { return ServerTerminalMessageSchema.safeParse(JSON.parse(raw)).data ?? null; }
              catch { return null; }
            },
            onReady: () => {
              // Send attach message once connected.
              handle.send(JSON.stringify({
                type: 'attach',
                sessionId,
                token,
                cols: 120,
                rows: 30,
              }));
            },
            onMessage: (msg) => {
              if (!active) return;
              if (msg.type === 'output') {
                setLogLines((prev) => appendLines(prev, msg.data));
              } else if (msg.type === 'status' && (msg.phase === 'exited' || msg.phase === 'dead')) {
                setLogExited(true);
              }
            },
            onError: () => { if (active) setLogExited(true); },
          },
        );
        if (active) logWsRef.current = handle;
        else handle.close();
      } catch {
        // fail-open
      }
    };

    void connectLog();
    return () => {
      active = false;
      logWsRef.current?.close();
      logWsRef.current = null;
    };
  }, [baseUrl, selectedTask?.sessionId]);

  // ── Keyboard ─────────────────────────────────────────────────────────────────
  useInput((input, key) => {
    if (input === 'q' || (key.ctrl && input === 'c')) exit();
    if (key.tab && wipTasks.length > 0) {
      setSelectedIdx((i) => (i + 1) % wipTasks.length);
    }
  });

  return (
    <Box flexDirection="column">
      <StatusBar baseUrl={baseUrl} connState={connState} lastUpdate={lastUpdate} />
      <Box flexDirection="row" flexGrow={1} gap={1}>
        <Box flexDirection="column" flexGrow={2}>
          <BoardPanel tasks={tasks} selectedTaskId={selectedTask?.id ?? null} />
          <PoolPanel slots={slots} />
        </Box>
        <Box flexGrow={1}>
          <LogPanel
            sessionId={selectedTask?.sessionId ?? null}
            taskTitle={selectedTask?.title ?? null}
            lines={logLines}
            exited={logExited}
          />
        </Box>
      </Box>
      <Box paddingX={1}>
        <Text dimColor>q quit  Tab cycle wip sessions</Text>
      </Box>
    </Box>
  );
}
