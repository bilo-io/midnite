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
  type Status,
  type Task,
  type TaskBoardEvent,
} from '@midnite/shared';
import { gatewayWsUrl, openWs } from '../ws.js';
import { BRAND_ACCENT, getVersion, logoLines } from '../lib/brand.js';
import { StatusBar, type ConnectionState } from './StatusBar.js';
import { BoardPanel } from './BoardPanel.js';
import { PoolPanel } from './PoolPanel.js';
import { LogPanel, appendLines } from './LogPanel.js';

// Column order matches BoardPanel's COLUMNS
const COLUMNS: Status[] = ['backlog', 'todo', 'wip', 'waiting', 'done'];
// Status left/right cycling for task moves (wraps at ends)
function adjacentStatus(current: Status, direction: 'left' | 'right'): Status {
  const idx = COLUMNS.indexOf(current);
  if (idx === -1) return current;
  const next = direction === 'right' ? idx + 1 : idx - 1;
  return COLUMNS[Math.max(0, Math.min(COLUMNS.length - 1, next))] ?? current;
}

interface Props {
  baseUrl: string;
}

export function Dashboard({ baseUrl }: Props) {
  const { exit } = useApp();
  const [connState, setConnState] = useState<ConnectionState>('connecting');
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);
  const [tasks, setTasks] = useState<Task[] | null>(null);
  const [slots, setSlots] = useState<AgentSlot[] | null>(null);

  // ── E1: board focus state ────────────────────────────────────────────────────
  const [focusedColIdx, setFocusedColIdx] = useState(0);
  const [focusedTaskIdx, setFocusedTaskIdx] = useState(0);

  // Derived: the task currently focused on the board
  const colTasks = (tasks ?? []).filter((t) => t.status === COLUMNS[focusedColIdx]);
  const focusedTask = colTasks[focusedTaskIdx % Math.max(1, colTasks.length)] ?? null;

  // ── D1: wip session selection (Tab) ─────────────────────────────────────────
  const [selectedIdx, setSelectedIdx] = useState(0);
  const wipTasks = tasks?.filter((t) => t.status === 'wip') ?? [];
  const selectedTask = wipTasks[selectedIdx % Math.max(1, wipTasks.length)] ?? null;

  // Log state for the selected session
  const [logLines, setLogLines] = useState<string[]>([]);
  const [logExited, setLogExited] = useState(false);
  const logWsRef = useRef<{ close(): void } | null>(null);

  // ── E2: move task ────────────────────────────────────────────────────────────
  const [moving, setMoving] = useState(false);

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
              handle.send(JSON.stringify({ type: 'attach', sessionId, token, cols: 120, rows: 30 }));
            },
            onMessage: (msg) => {
              if (!active) return;
              if (msg.type === 'output') {
                setLogLines((prev) => appendLines(prev, msg.data));
              } else if (msg.type === 'status' && msg.phase === 'exited') {
                setLogExited(true);
              }
            },
            onError: () => { if (active) setLogExited(true); },
          },
        );
        if (active) logWsRef.current = handle;
        else handle.close();
      } catch { /* fail-open */ }
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

    // Tab: cycle wip sessions for log panel
    if (key.tab && wipTasks.length > 0) {
      setSelectedIdx((i) => (i + 1) % wipTasks.length);
      return;
    }

    // E1: column navigation (← h, → l)
    if (key.leftArrow || input === 'h') {
      setFocusedColIdx((c) => Math.max(0, c - 1));
      setFocusedTaskIdx(0);
      return;
    }
    if (key.rightArrow || input === 'l') {
      setFocusedColIdx((c) => Math.min(COLUMNS.length - 1, c + 1));
      setFocusedTaskIdx(0);
      return;
    }

    // E1: task navigation within column (↑ k, ↓ j)
    if (key.upArrow || input === 'k') {
      setFocusedTaskIdx((t) => Math.max(0, t - 1));
      return;
    }
    if (key.downArrow || input === 'j') {
      setFocusedTaskIdx((t) => Math.min(Math.max(0, colTasks.length - 1), t + 1));
      return;
    }

    // E2: move focused task right (+) or left (-) in column order
    if ((input === 'm' || input === '>') && focusedTask && !moving) {
      const newStatus = adjacentStatus(focusedTask.status, 'right');
      if (newStatus === focusedTask.status) return;
      setMoving(true);
      // Optimistic update
      setTasks((prev) => prev?.map((t) => t.id === focusedTask.id ? { ...t, status: newStatus } : t) ?? prev);
      void fetch(`${baseUrl}/tasks/${encodeURIComponent(focusedTask.id)}/status`, {
        method: 'PATCH',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      }).catch(() => {
        // Revert optimistic update on failure
        setTasks((prev) => prev?.map((t) => t.id === focusedTask.id ? { ...t, status: focusedTask.status } : t) ?? prev);
      }).finally(() => { setMoving(false); });
      return;
    }
    if ((input === 'M' || input === '<') && focusedTask && !moving) {
      const newStatus = adjacentStatus(focusedTask.status, 'left');
      if (newStatus === focusedTask.status) return;
      setMoving(true);
      setTasks((prev) => prev?.map((t) => t.id === focusedTask.id ? { ...t, status: newStatus } : t) ?? prev);
      void fetch(`${baseUrl}/tasks/${encodeURIComponent(focusedTask.id)}/status`, {
        method: 'PATCH',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      }).catch(() => {
        setTasks((prev) => prev?.map((t) => t.id === focusedTask.id ? { ...t, status: focusedTask.status } : t) ?? prev);
      }).finally(() => { setMoving(false); });
    }
  });

  return (
    <Box flexDirection="column">
      <Box marginBottom={1}>
        <Box flexDirection="column" marginRight={1}>
          {logoLines(4).map((line, i) => (
            <Text key={i} color={BRAND_ACCENT}>{line}</Text>
          ))}
        </Box>
        <Box flexDirection="column" justifyContent="center">
          <Text bold color={BRAND_ACCENT}>midnite</Text>
          <Text dimColor>live dashboard · v{getVersion()}</Text>
        </Box>
      </Box>
      <StatusBar baseUrl={baseUrl} connState={connState} lastUpdate={lastUpdate} />
      <Box flexDirection="row" flexGrow={1} gap={1}>
        <Box flexDirection="column" flexGrow={2}>
          <BoardPanel
            tasks={tasks}
            selectedTaskId={selectedTask?.id ?? null}
            focusedColIdx={focusedColIdx}
            focusedTaskId={focusedTask?.id ?? null}
          />
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
        <Text dimColor>
          q quit  Tab logs  ←→/hl col  ↑↓/jk task  m/M move  {moving ? '⟳ moving…' : ''}
        </Text>
      </Box>
    </Box>
  );
}
