#!/usr/bin/env node
import { readFile, writeFile } from 'node:fs/promises';
import { clearAuth, readAuth, resolveToken, writeAuth } from './lib/auth-store.js';
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
import {
  bulkOpExitCode,
  bulkOpResultRows,
  bulkOpSummaryLine,
  filterTasks,
  hasFilter,
  type BulkFilter,
  type BulkOpResult,
} from './bulk-ops.js';
import { SHELLS, generateCompletion, isShell } from './completions.js';
import {
  capsRows,
  denialRows,
  parsePauseScope,
  pauseStateLine,
  recentDenials,
  scopeLabel,
} from './guardrails.js';
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
import { parseCredFlag, templateListRows } from './template.js';
import { banner, getVersion } from './lib/brand.js';
import {
  colourKind,
  colourPriority,
  colourStatus,
  error as paintError,
  success,
} from './lib/palette.js';
import { wasReported, withSpinner } from './lib/spinner.js';
import { isJsonMode, printJson, printJsonError, setJsonMode } from './lib/output.js';
import {
  canPrompt,
  confirmPrompt,
  optionalTextPrompt,
  passwordPrompt,
  pickTask,
  selectPriority,
  selectStatus,
  textPrompt,
} from './lib/prompts.js';
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

/** Parse a 0–3 priority band, throwing a friendly error otherwise. */
function parsePriority(value: string): number {
  const n = Number(value);
  if (!Number.isInteger(n) || n < 0 || n > 3) {
    throw new Error(`invalid priority "${value}" — expected 0 (Low), 1 (Normal), 2 (High), or 3 (Urgent)`);
  }
  return n;
}

/** Build a bulk selection filter from the shared `--status/--repo/--project` flags. */
function parseFilter(opts: { status?: string; repo?: string; project?: string }): BulkFilter {
  return {
    status: opts.status ? parseStatus(opts.status) : undefined,
    repo: opts.repo,
    project: opts.project,
  };
}

/**
 * Resolve a filtered task set, confirm the mutation, then apply `mutate` per task
 * with a progress spinner — printing a per-item summary table (or JSON) at the end.
 * Client-side loop: partial failures are reported, not swallowed (no atomicity).
 */
async function runBulkOp(
  c: GatewayClient,
  filter: BulkFilter,
  verb: string,
  targetLabel: string,
  yes: boolean,
  mutate: (id: string) => Promise<unknown>,
): Promise<void> {
  const targets = filterTasks(await c.listTasks(filter.status), filter);
  if (targets.length === 0) {
    if (isJsonMode()) printJson([]);
    else console.log('no matching tasks');
    return;
  }
  if (!isJsonMode() && !yes) {
    const ok = await confirmPrompt(`${verb} ${targets.length} task(s) → ${targetLabel}?`);
    if (!ok) {
      console.log('aborted');
      return;
    }
  }
  const results: BulkOpResult[] = [];
  for (const [i, task] of targets.entries()) {
    try {
      await withSpinner(`${verb} ${i + 1}/${targets.length}…`, () => mutate(task.id));
      results.push({ id: task.id, title: task.title, ok: true });
    } catch (e) {
      results.push({ id: task.id, title: task.title, ok: false, error: e instanceof Error ? e.message : String(e) });
    }
  }
  process.exitCode = bulkOpExitCode(results);
  if (isJsonMode()) {
    printJson(results);
    return;
  }
  const table = new Table({ head: ['ID', 'Title', 'OK', 'Error'], wordWrap: true });
  for (const row of bulkOpResultRows(results)) table.push(row);
  console.log(table.toString());
  console.log(bulkOpSummaryLine(results));
}

const BULK_FILTER_OPTS = {
  status: '-s, --status <status>',
  repo: '-r, --repo <repo>',
  project: '--project <id>',
} as const;

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
  .version(getVersion())
  .option('--gateway <url>', 'gateway base URL (else $MIDNITE_GATEWAY_URL, else http://localhost:7777)')
  .option('--token <token>', 'bearer token (overrides stored JWT and $MIDNITE_AUTH_TOKEN)')
  .option('--json', 'machine-readable JSON output (forces colour/spinner/chrome off; errors → stderr)');

// Brand the help output (and the bare-invoke help below) with the entry banner.
program.addHelpText('beforeAll', () => `${banner()}\n`);

// Resolve auth token once before any command action runs (stored JWT > env > --token flag).
program.hook('preAction', async () => {
  const opts = program.opts() as { token?: string; json?: boolean };
  // Set JSON mode first: it flips NO_COLOR, which the shared `isInteractive()`
  // gate reads to silence colour / spinners / logo for the rest of the run.
  setJsonMode(Boolean(opts.json));
  _resolvedToken = await resolveToken(opts.token);
});

let _resolvedToken: string | undefined;

function client(): ReturnType<typeof createClient> {
  const opts = program.opts() as { gateway?: string };
  return createClient(resolveBaseUrl(opts.gateway), _resolvedToken);
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
        const res = await withSpinner('Creating tasks…', () => client().createBulk(raw, defaults));
        // Partial batches succeed; only an all-failed batch exits non-zero.
        process.exitCode = bulkExitCode(res.counts);
        if (isJsonMode()) {
          printJson(res);
          return;
        }
        if (res.results.length > 0) {
          const table = new Table({ head: ['Line', 'Kind', 'Result'], wordWrap: true });
          for (const row of bulkResultRows(res)) table.push(row);
          console.log(table.toString());
        }
        console.log(bulkSummaryLine(res.counts));
        return;
      }

      // No positional prompt → a guided flow (Theme D). Non-interactive stdin makes
      // `textPrompt` throw NonInteractiveError, preserving the "prompt required" guard.
      if (!prompt) {
        prompt = await textPrompt('Task', { required: true });
        if (!opts.repo) defaults.repo = await optionalTextPrompt('Repo');
        if (opts.priority === undefined) defaults.priority = await selectPriority();
        if (!opts.project) defaults.projectId = await optionalTextPrompt('Project id');
      }
      if (opts.dependsOn.length > 0) defaults.dependsOn = opts.dependsOn;
      const created = await withSpinner('Adding task…', () => client().createTask(prompt, defaults));
      if (isJsonMode()) {
        printJson(created);
        return;
      }
      const blockers = created.dependsOn ?? [];
      const suffix = blockers.length > 0 ? `  (blocked by: ${blockers.join(', ')})` : '';
      console.log(`added ${created.id}  [${colourStatus(created.status)}]  ${created.title}${suffix}`);
    },
  );

program
  .command('list')
  .description('List tasks')
  .option('-s, --status <status>', 'filter by status')
  .action(async (opts: { status?: string }) => {
    const status = opts.status ? parseStatus(opts.status) : undefined;
    const tasks = await withSpinner('Loading tasks…', () => client().listTasks(status));
    if (isJsonMode()) {
      printJson(tasks);
      return;
    }
    if (tasks.length === 0) {
      console.log('no tasks');
      return;
    }
    const idW = Math.max(...tasks.map((t) => t.id.length), 2);
    const stW = Math.max(...tasks.map((t) => t.status.length), 6);
    for (const t of tasks) {
      // Pad the plain status first, then colour, so column alignment is preserved.
      console.log(`${t.id.padEnd(idW)}  ${colourStatus(t.status.padEnd(stW), t.status)}  ${t.title}`);
    }
  });

program
  .command('move [id] [status]')
  .description('Move a task to a new status (omit the id for a fuzzy pick; use --status/--repo/--project to bulk-move a set)')
  .option(BULK_FILTER_OPTS.status, 'bulk: only move tasks in this status')
  .option(BULK_FILTER_OPTS.repo, 'bulk: only move tasks in this repo')
  .option(BULK_FILTER_OPTS.project, 'bulk: only move tasks in this project')
  .option('-y, --yes', 'skip the confirmation prompt (bulk)')
  .action(
    async (
      id: string | undefined,
      status: string | undefined,
      opts: { status?: string; repo?: string; project?: string; yes?: boolean },
    ) => {
      const c = client();
      const filter = parseFilter(opts);
      if (hasFilter(filter)) {
        // Bulk mode: the first positional is the TARGET status (id is meaningless).
        const target = parseStatus(id ?? status ?? '');
        await runBulkOp(c, filter, 'move', colourStatus(target), Boolean(opts.yes), (taskId) =>
          c.moveTask(taskId, target),
        );
        return;
      }
      const resolvedId = id ?? (await pickTask(await c.listTasks(), 'Move which task?'));
      const resolvedStatus = status ? parseStatus(status) : await selectStatus();
      const task = await withSpinner('Moving task…', () => c.moveTask(resolvedId, resolvedStatus));
      if (isJsonMode()) {
        printJson(task);
        return;
      }
      console.log(`moved ${task.id} → ${colourStatus(task.status)}`);
    },
  );

program
  .command('prioritise [id] [level]')
  .alias('prioritize')
  .description('Set a task’s priority 0–3 (use --status/--repo/--project to bulk-set a set)')
  .option(BULK_FILTER_OPTS.status, 'bulk: only re-prioritise tasks in this status')
  .option(BULK_FILTER_OPTS.repo, 'bulk: only re-prioritise tasks in this repo')
  .option('--project <id>', 'bulk: only re-prioritise tasks in this project')
  .option('-y, --yes', 'skip the confirmation prompt (bulk)')
  .action(
    async (
      id: string | undefined,
      level: string | undefined,
      opts: { status?: string; repo?: string; project?: string; yes?: boolean },
    ) => {
      const c = client();
      const filter = parseFilter(opts);
      if (hasFilter(filter)) {
        // Bulk mode: the first positional is the TARGET priority (id is meaningless).
        const target = parsePriority(id ?? level ?? '');
        await runBulkOp(c, filter, 'prioritise', `P${target}`, Boolean(opts.yes), (taskId) =>
          c.setPriority(taskId, target),
        );
        return;
      }
      if (!id || level === undefined) {
        throw new Error('usage: midnite prioritise <id> <level> — or use --status/--repo/--project for bulk');
      }
      const target = parsePriority(level);
      const task = await withSpinner('Setting priority…', () => c.setPriority(id, target));
      if (isJsonMode()) {
        printJson(task);
        return;
      }
      console.log(`prioritised ${task.id} → ${colourPriority(task.priority)}`);
    },
  );

program
  .command('block [id]')
  .description('Add a blocker edge: <id> depends on (waits for) the --on task (omit id to pick)')
  .requiredOption('--on <blockerId>', 'the blocker task that must finish first')
  .action(async (id: string | undefined, opts: { on: string }) => {
    const c = client();
    const resolvedId = id ?? (await pickTask(await c.listTasks(), 'Block which task?'));
    const task = await withSpinner('Adding blocker…', () => c.addDependency(resolvedId, opts.on));
    if (isJsonMode()) {
      printJson(task);
      return;
    }
    const blockers = task.dependsOn ?? [];
    console.log(`blocked ${task.id} on ${opts.on}  (now depends on: ${blockers.join(', ') || 'none'})`);
  });

program
  .command('unblock [id]')
  .description('Remove a blocker edge: <id> no longer depends on the --on task (omit id to pick)')
  .requiredOption('--on <blockerId>', 'the blocker task to drop')
  .action(async (id: string | undefined, opts: { on: string }) => {
    const c = client();
    const resolvedId = id ?? (await pickTask(await c.listTasks(), 'Unblock which task?'));
    const task = await withSpinner('Removing blocker…', () => c.removeDependency(resolvedId, opts.on));
    if (isJsonMode()) {
      printJson(task);
      return;
    }
    const blockers = task.dependsOn ?? [];
    console.log(`unblocked ${task.id} from ${opts.on}  (now depends on: ${blockers.join(', ') || 'none'})`);
  });

// Run the quality gate for a task on demand and render per-check pass/fail.
// Exits non-zero when the gate fails (any check exits non-zero or times out).
program
  .command('check <id>')
  .description('Run quality-gate checks for a task and report pass/fail per check')
  .action(async (id: string) => {
    const run = await withSpinner('Running checks…', () => client().triggerCheck(id));

    if (isJsonMode()) {
      // A failed gate is a valid result, not an error — emit the run and reflect
      // pass/fail in the exit code so scripts can branch without parsing.
      printJson(run);
      process.exit(run.passed ? 0 : 1);
    }

    if (run.results.length === 0) {
      const mark = run.passed ? success('✓') : paintError('✗');
      console.log(`${mark} ${id}  (no checks configured — gate skipped)`);
      process.exit(0);
    }

    const table = new Table({
      head: ['Check', 'Status', 'Duration', 'Exit'],
      wordWrap: true,
      colWidths: [24, 8, 10, 6],
    });
    for (const r of run.results) {
      table.push([
        r.name,
        r.passed ? success('✓ pass') : paintError('✗ fail'),
        r.durationMs < 1000 ? `${r.durationMs}ms` : `${(r.durationMs / 1000).toFixed(1)}s`,
        r.exitCode !== null ? String(r.exitCode) : '—',
      ]);
    }
    console.log(table.toString());

    if (!run.passed) {
      const failed = run.results.filter((r) => !r.passed);
      for (const r of failed) {
        if (r.output.trim()) {
          console.log(`\n--- ${r.name} output ---`);
          console.log(r.output.trimEnd());
        }
      }
      console.error(paintError(`\nchecks failed (${failed.length}/${run.results.length})`));
      process.exit(1);
    }

    console.log(success(`\nchecks passed (${run.results.length}/${run.results.length})`));
  });

// Task-scoped operations that don't fit the flat verbs (add/list/move/…).
const task = program.command('task').description('Task operations');

task
  .command('export <id>')
  .description('Export a task thread as markdown (to stdout, or a file with --output)')
  .option('-o, --output <path>', 'write the markdown to a file instead of stdout')
  .action(async (id: string, opts: { output?: string }) => {
    const markdown = await withSpinner('Exporting task…', () => client().exportTask(id));
    if (opts.output) {
      await writeFile(opts.output, markdown, 'utf8');
      console.log(`exported ${id} → ${opts.output}`);
    } else {
      process.stdout.write(markdown);
    }
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
    const res = await withSpinner('Searching…', () => client().search(q));
    if (isJsonMode()) {
      printJson(res);
      return;
    }
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
    const summaries = await withSpinner('Loading workflows…', () => client().listWorkflows());
    if (isJsonMode()) {
      printJson(summaries);
      return;
    }
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
    const run = await withSpinner('Starting run…', () => c.runWorkflow(id));
    if (isJsonMode()) {
      // Streaming per-node lines would pollute stdout — emit the started run object.
      printJson(run);
      return;
    }
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
    const runs = await withSpinner('Loading runs…', () => client().listWorkflowRuns(id));
    if (isJsonMode()) {
      printJson(runs);
      return;
    }
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
  .command('watch')
  .description('Open a live full-screen dashboard (board, pool, and logs) — requires a running gateway')
  .action(async () => {
    const baseUrl = resolveBaseUrl(program.opts().gateway as string | undefined);

    // Lazy imports keep startup light for every other command.
    const [{ render }, { createElement }] = await Promise.all([
      import('ink') as Promise<typeof import('ink')>,
      import('react') as Promise<typeof import('react')>,
    ]);
    const { Dashboard } = await import('./watch/Dashboard.js');

    // Enter alt-screen and hide cursor before handing control to ink.
    const ENTER_ALT = '\x1B[?1049h\x1B[2J\x1B[H\x1B[?25l';
    const LEAVE_ALT = '\x1B[?1049l\x1B[?25h\x1B[0m';

    process.stdout.write(ENTER_ALT);

    const { waitUntilExit, unmount } = render(createElement(Dashboard, { baseUrl }));

    const onSigint = (): void => {
      unmount();
      process.stdout.write(LEAVE_ALT);
      process.exit(0);
    };
    const onUncaught = (err: Error): void => {
      unmount();
      process.stdout.write(LEAVE_ALT);
      // Restore stdout before printing the error message.
      process.stderr.write(`midnite watch crashed: ${err.message}\n`);
      process.exit(1);
    };

    process.once('SIGINT', onSigint);
    process.once('uncaughtException', onUncaught);

    try {
      await waitUntilExit();
    } finally {
      process.off('SIGINT', onSigint);
      process.off('uncaughtException', onUncaught);
      process.stdout.write(LEAVE_ALT);
    }
  });

program
  .command('plan <goal>')
  .description(
    'Generate a structured, dependency-aware breakdown of a goal and optionally create the tasks',
  )
  .option('-r, --repo <repo>', 'batch default repo applied to every created task')
  .option('-y, --yes', 'skip the confirmation prompt and create tasks immediately')
  .action(async (goal: string, opts: { repo?: string; yes?: boolean }) => {
    const c = client();
    const { breakdown, isFallback } = await withSpinner('Planning…', () => c.draftBreakdown(goal));

    if (isFallback) {
      console.log('(planning unavailable — showing flat task)');
    }

    if (breakdown.tasks.length === 0) {
      console.log('no tasks proposed');
      return;
    }

    // Render the proposed breakdown as a table.
    const table = new Table({
      head: ['Ref', 'Title', 'Kind', 'Pri', 'Depends on'],
      wordWrap: true,
    });
    for (const t of breakdown.tasks) {
      table.push([
        t.ref,
        t.title,
        t.kind ? colourKind(t.kind) : '',
        colourPriority(t.priority ?? 1),
        t.dependsOn.join(', ') || '—',
      ]);
    }
    console.log(table.toString());
    console.log(`${breakdown.tasks.length} task(s) proposed`);

    // Confirm before creating (inquirer; `--yes` skips, non-TTY defaults to no).
    const confirmed = (opts.yes ?? false) || (await confirmPrompt('Create these tasks?'));

    if (!confirmed) {
      console.log('aborted');
      return;
    }

    const { tasks } = await withSpinner('Creating tasks…', () =>
      c.createFromBreakdown(breakdown, opts.repo),
    );
    console.log(`created ${tasks.length} task(s)`);
    for (const t of tasks) {
      const blockers = t.dependsOn ?? [];
      const suffix = blockers.length > 0 ? `  (depends on: ${blockers.join(', ')})` : '';
      console.log(`  ${t.id.slice(0, 8)}  [${colourStatus(t.status)}]  ${t.title}${suffix}`);
    }
  });

const template = program.command('template').description('Browse and install workflow templates');

template
  .command('list')
  .description('List published workflow templates')
  .option('-c, --category <category>', 'filter by category (monitoring|notifications|github|scheduling|ai|data)')
  .action(async (opts: { category?: string }) => {
    const templates = await withSpinner('Loading templates…', () =>
      client().listTemplates(opts.category),
    );
    if (isJsonMode()) {
      printJson(templates);
      return;
    }
    if (templates.length === 0) {
      console.log('no templates');
      return;
    }
    const table = new Table({
      head: ['Slug', 'Name', 'Category', 'Tags', 'Credential slots'],
      wordWrap: true,
    });
    for (const row of templateListRows(templates)) table.push(row);
    console.log(table.toString());
    console.log(`${templates.length} template(s)`);
  });

template
  .command('install <slug-or-id>')
  .description('Install a template as a new workflow')
  .option('-n, --name <name>', 'override the workflow name')
  .option(
    '--cred <slot=credId>',
    'map a credential slot to a real credential id (repeatable)',
    collect,
    [],
  )
  .option('-y, --yes', 'skip interactive slot prompts (CI-safe)')
  .action(
    async (
      slugOrId: string,
      opts: { name?: string; cred: string[]; yes?: boolean },
    ) => {
      const credentialMap: Record<string, string> = {};
      for (const raw of opts.cred) {
        const [slot, credId] = parseCredFlag(raw);
        credentialMap[slot] = credId;
      }

      const c = client();

      // Resolve unsatisfied slots: prompt for each when interactive (Theme D),
      // otherwise warn and proceed (CI / --yes leave them unresolved).
      try {
        const { slots } = await c.getTemplateSlots(slugOrId);
        const unresolved = slots.filter((s) => !credentialMap[s.key] && !s.satisfiedBy);
        for (const s of unresolved) {
          if (!opts.yes && canPrompt()) {
            const credId = await optionalTextPrompt(`Credential id for slot "${s.key}" (${s.type})`);
            if (credId) credentialMap[s.key] = credId;
            else console.warn(`warning: slot "${s.key}" left unmapped — workflow will have an unresolved credential`);
          } else {
            console.warn(`warning: slot "${s.key}" (${s.type}) not mapped — workflow will have an unresolved credential`);
          }
        }
      } catch {
        // non-fatal: slot check failed, proceed anyway
      }

      await withSpinner(
        'Installing template…',
        () => c.installTemplate(slugOrId, { name: opts.name, credentialMap }),
        { succeed: (workflow) => `installed  ${workflow.id}  ${workflow.name}` },
      );
    },
  );

// ---- Auth commands ----

program
  .command('login')
  .description('Authenticate with the gateway and store credentials')
  .option('-u, --url <url>', 'gateway URL (overrides --gateway)')
  .option('-e, --email <email>', 'skip the email prompt')
  .option('-p, --password <password>', 'skip the password prompt (not recommended)')
  .action(
    async (opts: { url?: string; email?: string; password?: string }) => {
      // inquirer prompts (Theme D) replace the hand-rolled readline + raw-mode TTY.
      const email = opts.email ?? (await textPrompt('Email', { required: true }));
      const password = opts.password ?? (await passwordPrompt());

      const baseUrl = opts.url ?? resolveBaseUrl(program.opts().gateway as string | undefined);
      const c = createClient(baseUrl);
      const auth = await withSpinner('Signing in…', () => c.login(email, password));
      await writeAuth({ accessToken: auth.accessToken, refreshToken: auth.refreshToken });
      console.log(`logged in as ${auth.user.email} (${auth.user.name})`);
    },
  );

program
  .command('logout')
  .description('Revoke the stored session and delete local credentials')
  .action(async () => {
    const auth = await readAuth();
    if (auth?.accessToken) {
      const c = createClient(resolveBaseUrl(program.opts().gateway as string | undefined), auth.accessToken);
      await c.logout();
    }
    await clearAuth();
    console.log('logged out');
  });

program
  .command('whoami')
  .description('Print the currently authenticated user')
  .action(async () => {
    const c = client();
    try {
      const user = await c.whoami();
      if (isJsonMode()) {
        printJson(user);
        return;
      }
      console.log(`${user.email}  (${user.name})  id=${user.id}`);
    } catch (err) {
      if (isJsonMode()) printJsonError(err instanceof Error ? err : 'not authenticated — run `midnite login`');
      else console.error('not authenticated — run `midnite login`');
      process.exitCode = 1;
    }
  });

program
  .command('completion <shell>')
  .description(`Print a shell completion script (${SHELLS.join(' | ')}) — source it to enable tab-completion`)
  .action((shell: string) => {
    if (!isShell(shell)) {
      throw new Error(`unsupported shell "${shell}" — expected one of: ${SHELLS.join(', ')}`);
    }
    // Plain script to stdout (print-and-source); no chrome, so it's pipe-safe.
    process.stdout.write(generateCompletion(program, shell));
  });

// ---- guardrails / kill switch (Phase 50 F) ----

const guardrails = program.command('guardrails').description('Inspect & control the safety guardrails');

guardrails
  .command('status')
  .description('Show the autonomy mode, pause state, configured caps, and recent denials')
  .action(async () => {
    const c = client();
    const [res, log] = await withSpinner('Reading guardrails…', () =>
      Promise.all([c.getGuardrails(), c.getApprovalLog({ limit: 50 }).catch(() => ({ entries: [], total: 0, page: 1, limit: 50 }))]),
    );
    const denials = recentDenials(log.entries, 10);
    if (isJsonMode()) {
      printJson({ guardrails: res.guardrails, caps: res.caps ?? null, recentDenials: denials });
      return;
    }
    console.log(pauseStateLine(res.guardrails));
    if (res.caps) {
      const table = new Table({ head: ['Setting', 'Value'], wordWrap: true });
      for (const row of capsRows(res.caps)) table.push(row);
      console.log(table.toString());
    }
    if (denials.length > 0) {
      console.log(success(`\nRecent denials (${denials.length}):`));
      const table = new Table({ head: ['When', 'Tool', 'Resolution', 'By', 'Session'], wordWrap: true });
      for (const row of denialRows(denials)) table.push(row);
      console.log(table.toString());
    } else {
      console.log('\nNo recent denials.');
    }
  });

guardrails
  .command('pause')
  .description('Pause scheduling (default: global). Scope to one repo/team with a flag.')
  .option('--repo <name>', 'pause only this repo')
  .option('--team <id>', 'pause only this team')
  .action(async (opts: { repo?: string; team?: string }) => {
    const scope = parsePauseScope(opts);
    const res = await withSpinner(`Pausing ${scopeLabel(scope)}…`, () => client().setPause(scope, true));
    if (isJsonMode()) {
      printJson(res);
      return;
    }
    console.log(success(`Paused ${scopeLabel(scope)}.`));
    console.log(pauseStateLine(res.guardrails));
  });

guardrails
  .command('resume')
  .description('Resume scheduling for a scope (default: global)')
  .option('--repo <name>', 'resume only this repo')
  .option('--team <id>', 'resume only this team')
  .action(async (opts: { repo?: string; team?: string }) => {
    const scope = parsePauseScope(opts);
    const res = await withSpinner(`Resuming ${scopeLabel(scope)}…`, () => client().setPause(scope, false));
    if (isJsonMode()) {
      printJson(res);
      return;
    }
    console.log(success(`Resumed ${scopeLabel(scope)}.`));
    console.log(pauseStateLine(res.guardrails));
  });

program
  .command('kill')
  .description('EMERGENCY STOP: pause everything (or a scope) AND abort in-flight agents (requeued)')
  .option('--repo <name>', 'stop only this repo')
  .option('--team <id>', 'stop only this team')
  .option('-y, --yes', 'skip the confirmation prompt')
  .action(async (opts: { repo?: string; team?: string; yes?: boolean }) => {
    const scope = parsePauseScope(opts);
    if (!opts.yes) {
      // Interactive confirm at a TTY; refuse in --json / non-interactive so a
      // script can't emergency-stop the fleet by accident.
      if (isJsonMode() || !canPrompt()) {
        throw new Error('refusing to emergency-stop without confirmation — pass --yes');
      }
      const ok = await confirmPrompt(`Emergency-stop ${scopeLabel(scope)}? This aborts in-flight agents.`);
      if (!ok) {
        console.log('Aborted — nothing stopped.');
        return;
      }
    }
    const res = await withSpinner(`Emergency-stopping ${scopeLabel(scope)}…`, () => client().emergencyStop(scope));
    if (isJsonMode()) {
      printJson(res);
      return;
    }
    console.log(paintError(`Emergency stop applied ${scopeLabel(scope)} — in-flight agents aborted (requeued).`));
    console.log(pauseStateLine(res.guardrails));
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

// Bare `midnite` (no subcommand) → show the branded help instead of commander's
// "missing command" error.
if (process.argv.length <= 2) {
  program.outputHelp();
  process.exit(0);
}

program.parseAsync(process.argv).catch((err) => {
  // Under --json, errors go to stderr as `{ "error": "…" }` so stdout stays clean
  // (spinners don't print in json mode, so there's nothing already reported).
  if (isJsonMode()) {
    printJsonError(err);
  } else if (!wasReported(err)) {
    // A failed spinner already printed the message; don't print it twice.
    console.error(err instanceof Error ? err.message : err);
  }
  process.exit(1);
});
