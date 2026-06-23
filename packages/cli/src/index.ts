#!/usr/bin/env node
import { readFile } from 'node:fs/promises';
import { Command } from 'commander';
import Table from 'cli-table3';
import {
  WORKFLOW_WS_PATH,
  applyWorkflowEvent,
  isRunTerminal,
  type SearchQuery,
  type WorkflowEvent,
  type WorkflowRun,
} from '@midnite/shared';
import { bulkExitCode, bulkResultRows, bulkSummaryLine } from './bulk.js';
import { parseSearchType, searchResultRows, searchSummaryLine } from './search.js';
import {
  createClient,
  parseStatus,
  resolveBaseUrl,
  type GatewayClient,
  type TaskDefaults,
} from './client.js';
import {
  gatewayWsUrl,
  nodeLabelOf,
  runListRows,
  runSummaryLines,
  watchEventLine,
  workflowListRows,
  type NodeLabel,
} from './workflow.js';
import { openWs } from './ws.js';

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

/** commander collector for a repeatable option (`--depends-on a --depends-on b`). */
function collect(value: string, prev: string[]): string[] {
  return [...prev, value];
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
  .option('-d, --depends-on <id>', 'blocker task id that must finish first (repeatable; single add only)', collect, [])
  .action(
    async (
      prompt: string | undefined,
      opts: {
        bulk?: boolean;
        file?: string;
        repo?: string;
        priority?: string;
        project?: string;
        dependsOn: string[];
      },
    ) => {
      const defaults = parseDefaults(opts);

      if (opts.bulk || opts.file) {
        // A blocker graph is per-task; applying one set of blockers to every line
        // of a batch is meaningless, so reject the combination rather than guess.
        if (opts.dependsOn.length > 0) {
          throw new Error('--depends-on is not supported with --bulk; add blockers per task');
        }
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
      if (opts.dependsOn.length > 0) defaults.dependsOn = opts.dependsOn;
      const task = await client().createTask(prompt, defaults);
      const blockers = task.dependsOn ?? [];
      const suffix = blockers.length > 0 ? `  (blocked by: ${blockers.join(', ')})` : '';
      console.log(`added ${task.id}  [${task.status}]  ${task.title}${suffix}`);
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
  .command('block <id>')
  .description('Add a blocker edge: <id> depends on (waits for) the --on task')
  .requiredOption('--on <blockerId>', 'the blocker task that must finish first')
  .action(async (id: string, opts: { on: string }) => {
    const task = await client().addDependency(id, opts.on);
    const blockers = task.dependsOn ?? [];
    console.log(`blocked ${task.id} on ${opts.on}  (now depends on: ${blockers.join(', ') || 'none'})`);
  });

program
  .command('unblock <id>')
  .description('Remove a blocker edge: <id> no longer depends on the --on task')
  .requiredOption('--on <blockerId>', 'the blocker task to drop')
  .action(async (id: string, opts: { on: string }) => {
    const task = await client().removeDependency(id, opts.on);
    const blockers = task.dependsOn ?? [];
    console.log(`unblocked ${task.id} from ${opts.on}  (now depends on: ${blockers.join(', ') || 'none'})`);
  });

program
  .command('search <query>')
  .description('Full-text search across tasks, projects, memory, notes, councils & workflows')
  .option('-t, --type <type>', 'restrict to one type (task|project|memory|note|council|workflow)')
  .option('-n, --limit <n>', 'max results (default 20, max 100)')
  .action(async (query: string, opts: { type?: string; limit?: string }) => {
    const q: SearchQuery = { q: query };
    if (opts.type) q.type = parseSearchType(opts.type);
    if (opts.limit !== undefined) {
      const n = Number(opts.limit);
      if (!Number.isInteger(n) || n < 1) {
        throw new Error(`invalid --limit "${opts.limit}" — expected a positive integer`);
      }
      q.limit = n;
    }
    const res = await client().search(q);
    if (res.results.length > 0) {
      const table = new Table({ head: ['Type', 'ID', 'Title', 'Match'], wordWrap: true });
      for (const row of searchResultRows(res)) table.push(row);
      console.log(table.toString());
    }
    console.log(searchSummaryLine(res));
  });

// Tail a workflow run live over the WS stream, folding events through the shared
// reducer (the same one the web run panel uses) and printing per-node status. REST
// backs it up: a connect-time backfill (early/instant-run events fire before we
// subscribe), a reconcile on run.failed, and a poll fallback if the socket dies.
// Resolves with the final run so the caller can set the process exit code.
async function watchWorkflowRun(
  c: GatewayClient,
  baseUrl: string,
  workflowId: string,
  seed: WorkflowRun,
): Promise<WorkflowRun> {
  let labelOf: NodeLabel = (id) => id;
  try {
    labelOf = nodeLabelOf(await c.getWorkflow(workflowId));
  } catch {
    // node labels are cosmetic — fall back to ids
  }

  let run = seed;
  return await new Promise<WorkflowRun>((resolve) => {
    let settled = false;
    let wsHandle: ReturnType<typeof openWs> | null = null;

    const done = (final: WorkflowRun): void => {
      if (settled) return;
      settled = true;
      wsHandle?.close();
      resolve(final);
    };

    const finishTerminal = (r: WorkflowRun): void => {
      for (const line of runSummaryLines(r, labelOf)) console.log(line);
      done(r);
    };

    // Poll the run to completion — used only when the socket can't carry events.
    const pollToEnd = (): void => {
      const tick = async (): Promise<void> => {
        if (settled) return;
        try {
          run = await c.getWorkflowRun(workflowId, seed.id);
          if (isRunTerminal(run.status)) return finishTerminal(run);
        } catch {
          // transient — keep polling
        }
        setTimeout(() => void tick(), 1000);
      };
      void tick();
    };

    wsHandle = openWs<WorkflowEvent>(gatewayWsUrl(baseUrl) + WORKFLOW_WS_PATH, {
      extra: { runId: seed.id },
      reconnect: false,
      parse: (data) => {
        try {
          const event = JSON.parse(data) as WorkflowEvent;
          return event.runId === seed.id ? event : null;
        } catch {
          return null;
        }
      },
      onReady: () => {
        void c
          .getWorkflowRun(workflowId, seed.id)
          .then((r) => {
            run = r;
            if (isRunTerminal(r.status)) finishTerminal(r);
          })
          .catch(() => {
            // events will carry the state
          });
      },
      onMessage: (event) => {
        const line = watchEventLine(event, labelOf);
        if (line) console.log(line);
        run = applyWorkflowEvent(run, event) ?? run;
        if (event.type === 'run.finished') {
          done(event.run);
        } else if (event.type === 'run.failed') {
          // run.failed carries no run body — reconcile once for the final detail.
          void c
            .getWorkflowRun(workflowId, seed.id)
            .then(done)
            .catch(() => done(run));
        }
      },
      onError: () => {
        if (!settled) pollToEnd();
      },
    });
  });
}

const workflow = program.command('workflow').description('Inspect and run workflows');

workflow
  .command('list')
  .description('List workflows (name, enabled, trigger, last run)')
  .action(async () => {
    const summaries = await client().listWorkflows();
    if (summaries.length === 0) {
      console.log('no workflows');
      return;
    }
    const table = new Table({
      head: ['ID', 'Name', 'On', 'Trigger', 'Steps', 'Last run'],
      wordWrap: true,
    });
    for (const row of workflowListRows(summaries)) table.push(row);
    console.log(table.toString());
  });

workflow
  .command('run <id>')
  .description('Trigger a manual run; --watch tails it live')
  .option('-w, --watch', 'stream per-node status until the run finishes')
  .action(async (id: string, opts: { watch?: boolean }) => {
    const c = client();
    const run = await c.runWorkflow(id);
    if (!opts.watch) {
      console.log(`run ${run.id}  [${run.status}]`);
      return;
    }
    const baseUrl = resolveBaseUrl(program.opts().gateway as string | undefined);
    const final = await watchWorkflowRun(c, baseUrl, id, run);
    if (final.status === 'failed') process.exitCode = 1;
  });

workflow
  .command('runs <id>')
  .description('Recent run history for a workflow')
  .action(async (id: string) => {
    const runs = await client().listWorkflowRuns(id);
    if (runs.length === 0) {
      console.log('no runs');
      return;
    }
    const table = new Table({
      head: ['Run', 'Status', 'Trigger', 'Started', 'Finished', 'Nodes'],
      wordWrap: true,
    });
    for (const row of runListRows(runs)) table.push(row);
    console.log(table.toString());
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
