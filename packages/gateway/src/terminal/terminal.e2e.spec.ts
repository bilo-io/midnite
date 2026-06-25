import { createServer, type Server } from 'node:http';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { WebSocket, WebSocketServer } from 'ws';
import {
  parseConfig,
  TERMINAL_WS_PATH,
  type MidniteConfig,
  type ServerTerminalMessage,
} from '@midnite/shared';
import type { TasksService } from '../tasks/tasks.service';
import type { ProjectsService } from '../projects/projects.service';
import type { ReposService } from '../repos/repos.service';
import type { AgentsService } from '../agents/agents.service';
import type { ConnectionRegistry } from '../ws/connection-registry';
import { TerminalGateway } from './terminal.gateway';
import { TerminalService } from './terminal.service';
import type { ApprovalService } from './approval.service';

// Exercises the gateway over a REAL WebSocket connection on real TCP: a
// `ws.Server` (the same thing @nestjs/platform-ws's WsAdapter builds internally
// for our path) bridged to the gateway exactly as the adapter does it —
// `connection` → handleConnection(client, request), `close` → handleDisconnect.
// Covers real frame serialization, the Origin check, and close codes. The
// platform-ws+Fastify upgrade wiring itself lives in main.ts.
const config: MidniteConfig = parseConfig({
  agent: {},
  terminal: { command: 'cat' },
  knowledge: {},
  gateway: {},
});
const noTasks = { listTasks: () => [] } as unknown as TasksService;
const noProjects = { workDirFor: () => undefined } as unknown as ProjectsService;
const noRepos = { findByName: () => undefined } as unknown as ReposService;
const noAgents = { getAgentCli: () => 'claude' as const, getDefaultWorkDir: () => undefined } as unknown as AgentsService;

const noApprovals = {
  mintSecret: () => 'secret',
  verifySecret: () => true,
  requestDecision: async () => ({ decision: 'ask' as const }),
  resolveByUser: () => {},
  replayPending: () => {},
  clearSession: () => {},
} as unknown as ApprovalService;

const noRegistry = { register: () => {}, deregister: () => {} } as unknown as ConnectionRegistry;

describe('TerminalGateway (real WS transport)', () => {
  let service: TerminalService;
  let httpServer: Server;
  let wss: WebSocketServer;
  let url: string;

  beforeAll(async () => {
    service = new TerminalService(config, noTasks, noProjects, noRepos, noAgents, noApprovals);
    const gateway = new TerminalGateway(service, noApprovals, config, noRegistry);
    httpServer = createServer();
    wss = new WebSocketServer({ server: httpServer, path: TERMINAL_WS_PATH });
    wss.on('connection', (socket, request) => {
      gateway.handleConnection(socket, request);
      socket.on('close', () => gateway.handleDisconnect(socket));
    });
    await new Promise<void>((resolve) => httpServer.listen(0, '127.0.0.1', resolve));
    const address = httpServer.address();
    const port = typeof address === 'object' && address ? address.port : 0;
    url = `ws://127.0.0.1:${port}${TERMINAL_WS_PATH}`;
  });

  afterAll(async () => {
    service.onModuleDestroy();
    await new Promise<void>((resolve) => wss.close(() => resolve()));
    await new Promise<void>((resolve) => httpServer.close(() => resolve()));
  });

  it('completes token → attach → echo over a real socket', async () => {
    const token = service.mintToken('e2e');
    const ws = new WebSocket(url);
    const seen: ServerTerminalMessage[] = [];

    await new Promise<void>((resolve, reject) => {
      const timer = setTimeout(() => reject(new Error('timeout')), 8000);
      ws.on('open', () =>
        ws.send(JSON.stringify({ type: 'attach', sessionId: 'e2e', token, cols: 80, rows: 24 })),
      );
      ws.on('message', (raw: Buffer) => {
        const msg = JSON.parse(raw.toString('utf8')) as ServerTerminalMessage;
        seen.push(msg);
        if (msg.type === 'status' && msg.phase === 'ready') {
          ws.send(
            JSON.stringify({ type: 'input', data: Buffer.from('E2E_HELLO\n').toString('base64') }),
          );
        }
        if (
          msg.type === 'output' &&
          Buffer.from(msg.data, 'base64').toString('utf8').includes('E2E_HELLO')
        ) {
          clearTimeout(timer);
          resolve();
        }
      });
      ws.on('error', (err) => {
        clearTimeout(timer);
        reject(err);
      });
    });

    ws.close();
    const ready = seen.find((m) => m.type === 'status' && m.phase === 'ready');
    expect(ready).toMatchObject({ phase: 'ready', command: 'cat' });
  }, 15000);

  it('closes a disallowed-Origin connection with 1008', async () => {
    const ws = new WebSocket(url, { headers: { origin: 'https://evil.com' } });
    const code = await new Promise<number>((resolve, reject) => {
      const timer = setTimeout(() => reject(new Error('timeout')), 8000);
      ws.on('close', (c: number) => {
        clearTimeout(timer);
        resolve(c);
      });
      ws.on('error', () => {
        /* a close frame follows */
      });
    });
    expect(code).toBe(1008);
  }, 15000);

  it('rejects a bogus token over the wire', async () => {
    const ws = new WebSocket(url);
    const msg = await new Promise<ServerTerminalMessage>((resolve, reject) => {
      const timer = setTimeout(() => reject(new Error('timeout')), 8000);
      ws.on('open', () =>
        ws.send(
          JSON.stringify({ type: 'attach', sessionId: 'nope', token: 'bogus', cols: 80, rows: 24 }),
        ),
      );
      ws.on('message', (raw: Buffer) => {
        clearTimeout(timer);
        resolve(JSON.parse(raw.toString('utf8')) as ServerTerminalMessage);
      });
      ws.on('error', (err) => {
        clearTimeout(timer);
        reject(err);
      });
    });
    expect(msg).toMatchObject({ type: 'error', code: 'unauthorized' });
    ws.close();
  }, 15000);
});
