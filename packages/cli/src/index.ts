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
  .version(getVersion())
  .option('--gateway <url>', 'gateway base URL (else $MIDNITE_GATEWAY_URL, else http://localhost:7777)')
  .option('--token <token>', 'bearer token (overrides stored JWT and $MIDNITE_AUTH_TOKEN)');

// Brand the help output (and the bare-invoke help below) with the entry banner.
program.addHelpText('beforeAll', () => `${banner()}\n`);

// Resolve auth token once before any command action runs (stored JWT > env > --token flag).
program.hook('preAction', async () => {
  const opts = program.opts() as { token?: string };
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

// Run the quality gate for a task on demand and render per-check pass/fail.
// Exits non-zero when the gate fails (any check exits non-zero or times out).
program
  .command('check <id>')
  .description('Run quality-gate checks for a task and report pass/fail per check')
  .action(async (id: string) => {
    const run = await client().triggerCheck(id);

    if (run.results.length === 0) {
      console.log(`${run.passed ? '✓' : '✗'} ${id}  (no checks configured — gate skipped)`);
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
        r.passed ? '✓ pass' : '✗ fail',
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
      console.error(`\nchecks failed (${failed.length}/${run.results.length})`);
      process.exit(1);
    }

    console.log(`\nchecks passed (${run.results.length}/${run.results.length})`);
  });

// Task-scoped operations that don't fit the flat verbs (add/list/move/…).
const task = program.command('task').description('Task operations');

task
  .command('export <id>')
  .description('Export a task thread as markdown (to stdout, or a file with --output)')
  .option('-o, --output <path>', 'write the markdown to a file instead of stdout')
  .action(async (id: string, opts: { output?: string }) => {
    const markdown = await client().exportTask(id);
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
    const { breakdown, isFallback } = await c.draftBreakdown(goal);

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
        t.kind ?? '',
        String(t.priority ?? 1),
        t.dependsOn.join(', ') || '—',
      ]);
    }
    console.log(table.toString());
    console.log(`${breakdown.tasks.length} task(s) proposed`);

    // Confirm before creating.
    let confirmed = opts.yes ?? false;
    if (!confirmed) {
      const readline = await import('node:readline');
      const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
      confirmed = await new Promise<boolean>((resolve) => {
        rl.question('Create these tasks? [y/N] ', (answer) => {
          rl.close();
          resolve(answer.trim().toLowerCase() === 'y');
        });
      });
    }

    if (!confirmed) {
      console.log('aborted');
      return;
    }

    const { tasks } = await c.createFromBreakdown(breakdown, opts.repo);
    console.log(`created ${tasks.length} task(s)`);
    for (const t of tasks) {
      const blockers = t.dependsOn ?? [];
      const suffix = blockers.length > 0 ? `  (depends on: ${blockers.join(', ')})` : '';
      console.log(`  ${t.id.slice(0, 8)}  [${t.status}]  ${t.title}${suffix}`);
    }
  });

const template = program.command('template').description('Browse and install workflow templates');

template
  .command('list')
  .description('List published workflow templates')
  .option('-c, --category <category>', 'filter by category (monitoring|notifications|github|scheduling|ai|data)')
  .action(async (opts: { category?: string }) => {
    const templates = await client().listTemplates(opts.category);
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
  .action(
    async (
      slugOrId: string,
      opts: { name?: string; cred: string[] },
    ) => {
      const credentialMap: Record<string, string> = {};
      for (const raw of opts.cred) {
        const [slot, credId] = parseCredFlag(raw);
        credentialMap[slot] = credId;
      }

      const c = client();

      // Warn about unsatisfied slots before installing.
      try {
        const { slots } = await c.getTemplateSlots(slugOrId);
        const unresolved = slots.filter((s) => !credentialMap[s.key] && !s.satisfiedBy);
        if (unresolved.length > 0) {
          for (const s of unresolved) {
            console.warn(`warning: slot "${s.key}" (${s.type}) not mapped — workflow will have an unresolved credential`);
          }
        }
      } catch {
        // non-fatal: slot check failed, proceed anyway
      }

      const workflow = await c.installTemplate(slugOrId, {
        name: opts.name,
        credentialMap,
      });
      console.log(`installed  ${workflow.id}  ${workflow.name}`);
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
      const rl = (await import('node:readline')).createInterface({
        input: process.stdin,
        output: process.stdout,
      });
      const ask = (q: string): Promise<string> =>
        new Promise((resolve) => rl.question(q, (a) => resolve(a.trim())));

      const email = opts.email ?? (await ask('Email: '));
      const password =
        opts.password ??
        await new Promise<string>((resolve) => {
          // Hide input if attached to a TTY.
          if (process.stdin.isTTY) {
            process.stdout.write('Password: ');
            process.stdin.setRawMode(true);
            process.stdin.resume();
            let buf = '';
            process.stdin.setEncoding('utf8');
            const onData = (ch: string): void => {
              if (ch === '\r' || ch === '\n') {
                process.stdin.setRawMode(false);
                process.stdin.pause();
                process.stdin.removeListener('data', onData);
                process.stdout.write('\n');
                resolve(buf);
              } else if (ch === '') {
                process.stdin.setRawMode(false);
                process.exit();
              } else if (ch === '') {
                buf = buf.slice(0, -1);
              } else {
                buf += ch;
              }
            };
            process.stdin.on('data', onData);
          } else {
            rl.question('Password: ', (a) => resolve(a.trim()));
          }
        });

      rl.close();

      const baseUrl = opts.url ?? resolveBaseUrl(program.opts().gateway as string | undefined);
      const c = createClient(baseUrl);
      const auth = await c.login(email, password);
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
      console.log(`${user.email}  (${user.name})  id=${user.id}`);
    } catch {
      console.error('not authenticated — run `midnite login`');
      process.exitCode = 1;
    }
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
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});
