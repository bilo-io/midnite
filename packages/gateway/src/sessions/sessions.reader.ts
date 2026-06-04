import { readdir, stat, open } from 'node:fs/promises';
import { createReadStream } from 'node:fs';
import { createInterface } from 'node:readline';
import { homedir } from 'node:os';
import { join, resolve, sep } from 'node:path';
import type {
  SessionStatus,
  SessionSummary,
  SessionTranscript,
  TranscriptMessage,
} from '@midnite/shared';

const SESSIONS_ROOT = join(homedir(), '.claude', 'projects');
const HEAD_LINE_LIMIT = 40;
const TAIL_READ_BYTES = 8 * 1024;
const RUNNING_WINDOW_MS = 30_000;
const WAITING_WINDOW_MS = 5 * 60_000;
const SUBTITLE_LIMIT = 140;
const TITLE_LIMIT = 60;
const TOOL_SUMMARY_LIMIT = 200;
const SCAN_CONCURRENCY = 8;

export function sessionsRoot(): string {
  return SESSIONS_ROOT;
}

type AnyRecord = Record<string, unknown> & {
  type?: string;
  slug?: string;
  message?: { role?: string; content?: unknown };
  timestamp?: string;
  cwd?: string;
  gitBranch?: string;
  uuid?: string;
};

type FileScan = {
  slug?: string;
  firstUserText?: string;
  cwd?: string;
};

type TailInfo = {
  lastRole?: string;
  lastType?: string;
  slug?: string;
};

export async function listSessions(): Promise<SessionSummary[]> {
  let projectDirs: string[];
  try {
    const entries = await readdir(SESSIONS_ROOT, { withFileTypes: true });
    projectDirs = entries
      .filter((e) => e.isDirectory())
      .map((e) => e.name);
  } catch {
    return [];
  }

  const jobs: Array<{ projectSlug: string; fileName: string }> = [];
  for (const dir of projectDirs) {
    try {
      const files = await readdir(join(SESSIONS_ROOT, dir), { withFileTypes: true });
      for (const f of files) {
        if (f.isFile() && f.name.endsWith('.jsonl')) {
          jobs.push({ projectSlug: dir, fileName: f.name });
        }
      }
    } catch {
      // skip unreadable project dirs
    }
  }

  const results: SessionSummary[] = [];
  let cursor = 0;
  async function worker(): Promise<void> {
    while (cursor < jobs.length) {
      const idx = cursor++;
      const job = jobs[idx];
      if (!job) continue;
      const summary = await summarizeFile(job.projectSlug, job.fileName);
      if (summary) results.push(summary);
    }
  }
  await Promise.all(
    Array.from({ length: Math.min(SCAN_CONCURRENCY, jobs.length) }, () => worker()),
  );

  results.sort((a, b) => b.lastActivity - a.lastActivity);
  return results;
}

async function summarizeFile(
  projectSlug: string,
  fileName: string,
): Promise<SessionSummary | null> {
  const fullPath = join(SESSIONS_ROOT, projectSlug, fileName);
  let mtimeMs = 0;
  let size = 0;
  try {
    const s = await stat(fullPath);
    mtimeMs = s.mtimeMs;
    size = s.size;
  } catch {
    return null;
  }

  const head = await headScan(fullPath);
  const tail = await tailScan(fullPath, size);

  const id = fileName.replace(/\.jsonl$/, '');
  const slug = head.slug ?? tail.slug;
  const subtitle = truncate(head.firstUserText ?? '', SUBTITLE_LIMIT);
  const title =
    slug ??
    (head.firstUserText ? truncate(head.firstUserText, TITLE_LIMIT) : id.slice(0, 8));

  const status = inferStatus(mtimeMs, tail);
  const projectDisplay = decodeProjectSlug(head.cwd ?? projectSlug);

  return {
    id,
    projectSlug,
    projectDisplay,
    title,
    subtitle,
    status,
    lastActivity: mtimeMs,
  };
}

async function headScan(fullPath: string): Promise<FileScan> {
  const out: FileScan = {};
  const stream = createReadStream(fullPath, { encoding: 'utf8' });
  const rl = createInterface({ input: stream, crlfDelay: Infinity });
  let count = 0;
  try {
    for await (const line of rl) {
      if (!line) continue;
      count++;
      const rec = safeParse(line);
      if (!rec) continue;
      if (!out.cwd && typeof rec.cwd === 'string') out.cwd = rec.cwd;
      if (!out.slug && typeof rec.slug === 'string') out.slug = rec.slug;
      if (!out.firstUserText && rec.type === 'user' && rec.message?.role === 'user') {
        out.firstUserText = flattenContent(rec.message.content).trim();
      }
      if (out.slug && out.firstUserText) break;
      if (count >= HEAD_LINE_LIMIT) break;
    }
  } finally {
    rl.close();
    stream.destroy();
  }
  return out;
}

async function tailScan(fullPath: string, size: number): Promise<TailInfo> {
  if (size === 0) return {};
  const start = Math.max(0, size - TAIL_READ_BYTES);
  const length = size - start;
  const fh = await open(fullPath, 'r');
  try {
    const buf = Buffer.alloc(length);
    await fh.read(buf, 0, length, start);
    const text = buf.toString('utf8');
    const lines = text.split('\n').filter((l) => l.trim().length > 0);
    const tail: TailInfo = {};
    for (const line of lines) {
      const rec = safeParse(line);
      if (!rec) continue;
      if (!tail.slug && typeof rec.slug === 'string') tail.slug = rec.slug;
    }
    const lastLine = lines[lines.length - 1];
    if (lastLine) {
      const last = safeParse(lastLine);
      if (last) {
        tail.lastType = typeof last.type === 'string' ? last.type : undefined;
        tail.lastRole =
          typeof last.message?.role === 'string' ? last.message.role : undefined;
      }
    }
    return tail;
  } finally {
    await fh.close();
  }
}

function inferStatus(mtimeMs: number, tail: TailInfo): SessionStatus {
  const age = Date.now() - mtimeMs;
  if (age <= RUNNING_WINDOW_MS) return 'running';
  if (
    age <= WAITING_WINDOW_MS &&
    (tail.lastRole === 'assistant' || tail.lastType === 'assistant')
  ) {
    return 'waiting';
  }
  return 'idle';
}

export async function loadTranscript(
  projectSlug: string,
  sessionId: string,
): Promise<SessionTranscript> {
  const fileName = `${sessionId}.jsonl`;
  const fullPath = resolve(join(SESSIONS_ROOT, projectSlug, fileName));
  const rootResolved = resolve(SESSIONS_ROOT) + sep;
  if (!fullPath.startsWith(rootResolved)) {
    throw new Error('invalid session path');
  }

  let mtimeMs = 0;
  let size = 0;
  try {
    const s = await stat(fullPath);
    mtimeMs = s.mtimeMs;
    size = s.size;
  } catch {
    throw new Error(`session ${sessionId} not found`);
  }

  const messages: TranscriptMessage[] = [];
  let cwd: string | undefined;
  let gitBranch: string | undefined;
  let slug: string | undefined;
  let firstUserText: string | undefined;

  const stream = createReadStream(fullPath, { encoding: 'utf8' });
  const rl = createInterface({ input: stream, crlfDelay: Infinity });
  try {
    for await (const line of rl) {
      if (!line) continue;
      const rec = safeParse(line);
      if (!rec) continue;
      if (!cwd && typeof rec.cwd === 'string') cwd = rec.cwd;
      if (!gitBranch && typeof rec.gitBranch === 'string') gitBranch = rec.gitBranch;
      if (!slug && typeof rec.slug === 'string') slug = rec.slug;

      const t = rec.type;
      if (t !== 'user' && t !== 'assistant' && t !== 'system') continue;

      const role = (rec.message?.role as TranscriptMessage['role'] | undefined) ?? (t as TranscriptMessage['role']);
      if (role !== 'user' && role !== 'assistant' && role !== 'system') continue;

      const { text, toolCalls } = renderContent(rec.message?.content);
      if (!text && (!toolCalls || toolCalls.length === 0)) continue;

      if (!firstUserText && role === 'user' && text) firstUserText = text.trim();

      messages.push({
        uuid: typeof rec.uuid === 'string' ? rec.uuid : `${messages.length}`,
        role,
        timestamp: parseTimestamp(rec.timestamp) ?? mtimeMs,
        text,
        toolCalls: toolCalls.length > 0 ? toolCalls : undefined,
      });
    }
  } finally {
    rl.close();
    stream.destroy();
  }

  const tail = await tailScan(fullPath, size);
  const status = inferStatus(mtimeMs, tail);
  const title =
    slug ??
    (firstUserText ? truncate(firstUserText, TITLE_LIMIT) : sessionId.slice(0, 8));
  const projectDisplay = decodeProjectSlug(cwd ?? projectSlug);

  return {
    id: sessionId,
    title,
    projectDisplay,
    status,
    cwd,
    gitBranch,
    messages,
  };
}

function renderContent(content: unknown): { text: string; toolCalls: { name: string; summary: string }[] } {
  if (typeof content === 'string') return { text: content, toolCalls: [] };
  if (!Array.isArray(content)) return { text: '', toolCalls: [] };

  const textParts: string[] = [];
  const toolCalls: { name: string; summary: string }[] = [];
  for (const block of content) {
    if (!block || typeof block !== 'object') continue;
    const b = block as Record<string, unknown>;
    if (b['type'] === 'text' && typeof b['text'] === 'string') {
      textParts.push(b['text']);
    } else if (b['type'] === 'tool_use') {
      const name = typeof b['name'] === 'string' ? b['name'] : 'tool';
      const summary = truncate(safeJson(b['input']), TOOL_SUMMARY_LIMIT);
      toolCalls.push({ name, summary });
    } else if (b['type'] === 'tool_result') {
      const result = b['content'];
      if (typeof result === 'string') {
        textParts.push(`[tool result] ${truncate(result, TOOL_SUMMARY_LIMIT)}`);
      }
    }
  }
  return { text: textParts.join('\n\n'), toolCalls };
}

function safeParse(line: string): AnyRecord | null {
  try {
    return JSON.parse(line) as AnyRecord;
  } catch {
    return null;
  }
}

function safeJson(value: unknown): string {
  try {
    return JSON.stringify(value);
  } catch {
    return '';
  }
}

function flattenContent(content: unknown): string {
  if (typeof content === 'string') return content;
  if (!Array.isArray(content)) return '';
  const parts: string[] = [];
  for (const block of content) {
    if (!block || typeof block !== 'object') continue;
    const b = block as Record<string, unknown>;
    if (b['type'] === 'text' && typeof b['text'] === 'string') parts.push(b['text']);
  }
  return parts.join(' ');
}

function truncate(value: string, limit: number): string {
  if (value.length <= limit) return value;
  return value.slice(0, limit - 1).trimEnd() + '…';
}

function parseTimestamp(value: unknown): number | undefined {
  if (typeof value !== 'string') return undefined;
  const ms = Date.parse(value);
  return Number.isNaN(ms) ? undefined : ms;
}

function decodeProjectSlug(input: string): string {
  if (!input) return '';
  // If cwd-style absolute path: take last two segments.
  if (input.startsWith('/')) {
    const parts = input.split('/').filter(Boolean);
    return parts.slice(-2).join('/');
  }
  // Otherwise it's the encoded project dir name; strip leading dash + take tail.
  const stripped = input.startsWith('-') ? input.slice(1) : input;
  const parts = stripped.split('-').filter(Boolean);
  return parts.slice(-2).join('/');
}
