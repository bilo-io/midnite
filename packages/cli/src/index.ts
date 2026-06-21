#!/usr/bin/env node
import { readFile } from 'node:fs/promises';
import { Command } from 'commander';
import Table from 'cli-table3';
import { bulkExitCode, bulkResultRows, bulkSummaryLine } from './bulk.js';
import { createClient, parseStatus, resolveBaseUrl, type TaskDefaults } from './client.js';

const program = new Command();

/** Build the batch-wide task defaults from the shared `add` flags. */
function parseDefaults(opts: { repo?: string; project?: string; priority?: string }): TaskDefaults {
  const defaults: TaskDefaults = {};
  if (opts.repo) defaults.repo = opts.repo;
  if (opts.project) defaults.projectId = opts.project;
  if (opts.priority !== undefined) {
    const n = Number(opts.priority);
    if (!Number.isInteger(n) || n < 0 || n > 3) {
      throw new Error(`invalid priority "${opts.priority}" — expected an integer 0–3`);
    }
    defaults.priority = n;
  }
  return defaults;
}

/** Read all of stdin (for `add --bulk` without `--file`). Empty when attached to a TTY. */
async function readStdin(): Promise<string> {
  if (process.stdin.isTTY) return '';
  const chunks: Buffer[] = [];
  for await (const chunk of process.stdin) chunks.push(Buffer.from(chunk));
  return Buffer.concat(chunks).toString('utf8');
}

program
  .name('midnite')
  .description('Multitask coding agents — CLI client for the midnite gateway')
  .version('0.0.0')
  .option('--gateway <url>', 'gateway base URL (else $MIDNITE_GATEWAY_URL, else http://localhost:7777)');

function client(): ReturnType<typeof createClient> {
  return createClient(resolveBaseUrl(program.opts().gateway as string | undefined));
}

program
  .command('add [prompt]')
  .description('Add a task — or many with --bulk (one per line from --file or stdin)')
  .option('--bulk', 'create one task per line, read from --file or stdin')
  .option('--file <path>', 'read bulk input from a file (implies --bulk-style input)')
  .option('-r, --repo <repo>', 'repo applied to the created task(s)')
  .option('-p, --priority <n>', 'priority 0–3 applied to the created task(s)')
  .option('--project <id>', 'project id applied to the created task(s)')
  .action(
    async (
      prompt: string | undefined,
      opts: { bulk?: boolean; file?: string; repo?: string; priority?: string; project?: string },
    ) => {
      const defaults = parseDefaults(opts);

      if (opts.bulk || opts.file) {
        const raw = opts.file ? await readFile(opts.file, 'utf8') : await readStdin();
        if (!raw.trim()) {
          throw new Error('no bulk input — pass --file <path> or pipe a list to stdin');
        }
        const res = await client().createBulk(raw, defaults);
        if (res.results.length > 0) {
          const table = new Table({ head: ['Line', 'Kind', 'Result'], wordWrap: true });
          for (const row of bulkResultRows(res)) table.push(row);
          console.log(table.toString());
        }
        console.log(bulkSummaryLine(res.counts));
        // Partial batches succeed; only an all-failed batch exits non-zero.
        process.exitCode = bulkExitCode(res.counts);
        return;
      }

      if (!prompt) {
        throw new Error('a task prompt is required — pass one, or use --bulk with --file/stdin');
      }
      const task = await client().createTask(prompt, defaults);
      console.log(`added ${task.id}  [${task.status}]  ${task.title}`);
    },
  );

program
  .command('list')
  .description('List tasks')
  .option('-s, --status <status>', 'filter by status')
  .action(async (opts: { status?: string }) => {
    const status = opts.status ? parseStatus(opts.status) : undefined;
    const tasks = await client().listTasks(status);
    if (tasks.length === 0) {
      console.log('no tasks');
      return;
    }
    const idW = Math.max(...tasks.map((t) => t.id.length), 2);
    const stW = Math.max(...tasks.map((t) => t.status.length), 6);
    for (const t of tasks) {
      console.log(`${t.id.padEnd(idW)}  ${t.status.padEnd(stW)}  ${t.title}`);
    }
  });

program
  .command('move <id> <status>')
  .description('Move a task to a new status')
  .action(async (id: string, status: string) => {
    const task = await client().moveTask(id, parseStatus(status));
    console.log(`moved ${task.id} → ${task.status}`);
  });

program
  .command('serve')
  .description('Start the midnite gateway daemon in-process')
  .action(async () => {
    // Lazy, indirect import so the gateway (and its native deps) only load for
    // `serve` — `add`/`list`/`move` stay pure HTTP clients and keep working even
    // if the gateway build is unavailable. The variable specifier also keeps the
    // CLI's typecheck decoupled from the gateway build.
    const spec = '@midnite/gateway/bootstrap';
    const mod = (await import(spec)) as { startGateway: () => Promise<unknown> };
    await mod.startGateway();
  });

program.parseAsync(process.argv).catch((err) => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});
